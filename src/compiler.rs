// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

use anyhow::Result;
use swc_core::common::{sync::Lrc, FileName, SourceMap, Mark, Globals, GLOBALS};
use swc_core::common::errors::{Handler, Emitter, DiagnosticBuilder, HANDLER};
use swc_core::ecma::ast::{Program, Callee, Expr, JSXElementName};
use swc_core::ecma::codegen::text_writer::JsWriter;
use swc_core::ecma::parser::{lexer::Lexer, Parser, StringInput, Syntax, TsConfig};
use swc_core::ecma::transforms::base::resolver;
use swc_core::ecma::visit::{Visit, VisitWith, FoldWith};

use crate::visitor::JsxVisitor;

/// Known UI component names exported from /@ui
const ALL_UI_COMPONENTS: &[&str] = &[
    "Button", "Input", "Textarea", "Card", "Badge", "Avatar", "Stat", "Flex", "Grid",
    "Container", "Stack", "Heading", "Text", "Checkbox", "Divider",
    "EmptyState", "SearchInput", "Table", "TableHeader", "TableBody",
    "TableRow", "Separator", "Tabs", "Tooltip", "Modal", "Select", "Pagination",
    "showToast",
];

struct ErrorCapturer {
    errors: std::sync::Arc<std::sync::Mutex<Vec<String>>>,
    cm: Lrc<SourceMap>,
}

impl ErrorCapturer {
    fn new(cm: Lrc<SourceMap>) -> Self {
        Self { errors: std::sync::Arc::new(std::sync::Mutex::new(Vec::new())), cm }
    }
}

impl Emitter for ErrorCapturer {
    fn emit(&mut self, db: &DiagnosticBuilder<'_>) {
        let mut lock = self.errors.lock().unwrap();
        let message = if let Some(span) = db.span.primary_span() {
            let loc = self.cm.lookup_char_pos(span.lo());
            format!("[{}:{}:{}] {}", loc.file.name, loc.line, loc.col_display + 1, db.message[0].0)
        } else {
            db.message.iter().map(|m| m.0.to_string()).collect::<Vec<_>>().join(" ")
        };
        lock.push(message);
    }
}

/// Compilation result with optional source map
#[derive(Clone)]
pub struct CompileResult {
    pub js: String,
    #[allow(dead_code)]
    pub source_map: Option<String>,
}

pub fn transform_tsx(source: &str) -> Result<CompileResult> {
    transform_tsx_with_options(source, false)
}

pub fn transform_tsx_with_options(source: &str, minify: bool) -> Result<CompileResult> {
    let cm: Lrc<SourceMap> = Default::default();
    let globals = Globals::new();
    let error_capturer = ErrorCapturer::new(cm.clone());
    let error_buf = error_capturer.errors.clone();
    let handler = Handler::with_emitter(true, false, Box::new(error_capturer));
    let source = source.to_string();

    GLOBALS.set(&globals, || {
        HANDLER.set(&handler, || do_transform(&cm, &source, minify))
    })
    .and_then(|output| {
        let errors = error_buf.lock().unwrap();
        if !errors.is_empty() {
            let msg = errors.join("\n");
            return Err(anyhow::anyhow!("Compilation failed:\n{}", msg));
        }
        Ok(output)
    })
}

fn do_transform(cm: &Lrc<SourceMap>, source: &str, minify: bool) -> Result<CompileResult> {
    let fm = cm.new_source_file(FileName::Custom("input.tsx".into()), source.into());

    // 1. Parse TSX
    let lexer = Lexer::new(
        Syntax::Typescript(TsConfig {
            tsx: true,
            ..Default::default()
        }),
        Default::default(),
        StringInput::from(&*fm),
        None,
    );
    let mut parser = Parser::new_from(lexer);
    let mut module = parser
        .parse_module()
        .map_err(|e| anyhow::anyhow!("{:?}", e))?;

    // 2. Pre-scan: collect used UI component names at AST level
    let used_ui = scan_ui_components(&module);

    // 3. Scope analysis
    let unresolved_mark = Mark::new();
    let top_level_mark = Mark::new();
    module = module.fold_with(&mut resolver(unresolved_mark, top_level_mark, false));

    // 4. Strip TypeScript types
    let mut program = Program::Module(module);
    program = program.fold_with(&mut swc_core::ecma::transforms::typescript::strip(top_level_mark));
    let mut module = match program {
        Program::Module(m) => m,
        _ => unreachable!(),
    };

    // 5. AST transformation (JSX -> h())
    let mut visitor = JsxVisitor::new();
    module = module.fold_with(&mut visitor);

    // 6. Code generation with source map
    let mut buf = vec![];
    {
        let mut emitter = swc_core::ecma::codegen::Emitter {
            cfg: swc_core::ecma::codegen::Config::default().with_minify(minify),
            comments: None,
            cm: cm.clone(),
            wr: JsWriter::new(cm.clone(), "\n", &mut buf, None),
        };
        emitter
            .emit_module(&module)
            .map_err(|e| anyhow::anyhow!("{:?}", e))?;
    }

    // 7. Rewrite relative imports to /src/ paths
    let generated = String::from_utf8(buf)?;
    let rewritten = rewrite_local_imports(&generated);

    // 8. Build inline source map (base64-encoded JSON with sourcesContent)
    let source_map_json = build_source_map(source);

    // 9. Inject only used UI imports
    let ui_import = if used_ui.is_empty() {
        String::new()
    } else {
        format!("import {{ {} }} from '/@ui';\n", used_ui.join(", "))
    };

    let mut final_code = format!(
        "import {{ signal, computed, effect, h, defineComponent, reactiveTemplate, Fragment, errorBoundary }} from '/@runtime';\n{}{}",
        ui_import,
        rewritten
    );

    final_code.push_str(&source_map_json);

    Ok(CompileResult { js: final_code, source_map: Some(source_map_json) })
}

/// Scan AST for UI component usage using visitor pattern
fn scan_ui_components(module: &swc_core::ecma::ast::Module) -> Vec<&'static str> {
    let mut visitor = UiComponentVisitor::new();
    module.visit_with(&mut visitor);
    visitor.used.dedup();
    // Convert to static str references
    visitor.used.iter()
        .filter_map(|s| ALL_UI_COMPONENTS.iter().find(|&&c| c == s.as_str()).copied())
        .collect()
}

struct UiComponentVisitor {
    used: Vec<String>,
}

impl UiComponentVisitor {
    fn new() -> Self {
        Self { used: Vec::new() }
    }

    fn maybe_add(&mut self, name: &str) {
        if ALL_UI_COMPONENTS.contains(&name) && !self.used.contains(&name.to_string()) {
            self.used.push(name.to_string());
        }
    }
}

impl Visit for UiComponentVisitor {
    fn visit_jsx_element(&mut self, el: &swc_core::ecma::ast::JSXElement) {
        // Check JSX element name (e.g., <Button>)
        if let JSXElementName::Ident(ident) = &el.opening.name {
            self.maybe_add(ident.sym.as_ref());
        } else if let JSXElementName::JSXMemberExpr(member) = &el.opening.name {
            self.maybe_add(member.prop.sym.as_ref());
        }
        // Recurse into children
        el.visit_children_with(self);
    }

    fn visit_call_expr(&mut self, call: &swc_core::ecma::ast::CallExpr) {
        // Check call expression (e.g., Button(...), showToast(...))
        if let Callee::Expr(callee) = &call.callee {
            if let Expr::Ident(ident) = callee.as_ref() {
                self.maybe_add(ident.sym.as_ref());
            }
        }
        // Recurse into args
        call.visit_children_with(self);
    }
}

/// Rewrite relative imports (./foo, ../foo) to /src/foo paths
pub fn rewrite_local_imports(code: &str) -> String {
    let re = regex::Regex::new(r#"from\s+['"](\.{1,2}/[^'"]+)['"]"#).unwrap();
    re.replace_all(code, |caps: &regex::Captures| {
        let raw_path = &caps[1];
        // Strip extension if present
        let clean = raw_path
            .strip_suffix(".tsx")
            .or_else(|| raw_path.strip_suffix(".ts"))
            .or_else(|| raw_path.strip_suffix(".jsx"))
            .or_else(|| raw_path.strip_suffix(".js"))
            .unwrap_or(raw_path);
        // Normalize path: resolve ./ and ../
        let normalized = clean
            .trim_start_matches("./")
            .trim_start_matches("../")
            .trim_start_matches("/");
        format!("from '/src/{}'", normalized)
    }).to_string()
}

/// Build an inline source map with original source content embedded.
/// Returns the full `//# sourceMappingURL=...` comment string.
fn build_source_map(original_source: &str) -> String {
    // Build source map JSON
    let source_map = serde_json::json!({
        "version": 3,
        "sources": ["input.tsx"],
        "sourcesContent": [original_source],
        "mappings": "",
        "names": []
    });

    let json_str = serde_json::to_string(&source_map).unwrap_or_default();
    let encoded = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        json_str.as_bytes(),
    );
    format!("//# sourceMappingURL=data:application/json;base64,{}\n", encoded)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rewrite_local_imports() {
        // Relative import with .tsx extension
        let input = r#"import { foo } from './utils.tsx'"#;
        let output = rewrite_local_imports(input);
        assert_eq!(output, "import { foo } from '/src/utils'");

        // Relative import with .ts extension
        let input = r#"import { bar } from '../helpers.ts'"#;
        let output = rewrite_local_imports(input);
        assert_eq!(output, "import { bar } from '/src/helpers'");

        // Relative import without extension
        let input = r#"import { baz } from './module'"#;
        let output = rewrite_local_imports(input);
        assert_eq!(output, "import { baz } from '/src/module'");

        // Double quotes
        let input = r#"import { x } from "../foo.js""#;
        let output = rewrite_local_imports(input);
        assert_eq!(output, "import { x } from '/src/foo'");

        // Multiple imports in one file
        let input = r#"import { a } from './a.tsx';
import { b } from '../b.ts';"#;
        let output = rewrite_local_imports(input);
        assert!(output.contains("from '/src/a'"));
        assert!(output.contains("from '/src/b'"));

        // Absolute import should not change
        let input = r#"import { signal } from '/@runtime'"#;
        let output = rewrite_local_imports(input);
        assert_eq!(output, input);
    }

    #[test]
    fn test_transform_tsx_basic() {
        let source = r#"
const count = signal(0);
const App = defineComponent(() => {
    return () => <div className="app">Hello</div>;
});
"#;
        let result = transform_tsx(source);
        assert!(result.is_ok());
        let compiled = result.unwrap();
        assert!(compiled.js.contains("from '/@runtime'"));
        assert!(compiled.js.contains("h(\"div\""));
        assert!(compiled.source_map.is_some());
        let sm = compiled.source_map.unwrap();
        assert!(sm.contains("sourceMappingURL"));
        // Decode and verify source map content
        let decoded = decode_source_map(&sm);
        assert!(decoded.contains("input.tsx"));
        assert!(decoded.contains("\"version\":3"));
    }

    #[test]
    fn test_transform_tsx_component_detection() {
        let source = r#"
const App = defineComponent(() => {
    return () => (
        <Stack gap="16px">
            <Button variant="primary">Click</Button>
            <Card><Text>Hello</Text></Card>
        </Stack>
    );
});
"#;
        let result = transform_tsx(source);
        assert!(result.is_ok());
        let compiled = result.unwrap();
        assert!(compiled.js.contains("from '/@runtime'"));
        assert!(compiled.js.contains("Stack"));
        assert!(compiled.js.contains("Button"));
        assert!(compiled.js.contains("Card"));
        assert!(compiled.js.contains("Text"));
    }

    #[test]
    fn test_transform_tsx_fragment() {
        let source = r#"
const App = defineComponent(() => {
    return () => <>
        <div>First</div>
        <div>Second</div>
    </>;
});
"#;
        let result = transform_tsx(source);
        assert!(result.is_ok());
        let compiled = result.unwrap();
        assert!(compiled.js.contains("Fragment"));
    }

    #[test]
    fn test_transform_tsx_error() {
        let source = r#"
const x: string = 123;
"#;
        // This is valid TSX (with type annotation), should not error
        let result = transform_tsx(source);
        assert!(result.is_ok());
    }

    #[test]
    fn test_transform_tsx_invalid_syntax() {
        let source = r#"
function ( {
"#;
        let result = transform_tsx(source);
        assert!(result.is_err());
    }

    #[test]
    fn test_source_map_embeds_original_source() {
        let source = r#"const App = () => <div>Hello World</div>;"#;
        let result = transform_tsx(source).unwrap();
        let sm = result.source_map.unwrap();
        let decoded = decode_source_map(&sm);
        assert!(decoded.contains("input.tsx"));
        assert!(decoded.contains("Hello World"));
        assert!(decoded.contains("\"version\":3"));
    }

    fn decode_source_map(sm: &str) -> String {
        let prefix = "//# sourceMappingURL=data:application/json;base64,";
        let b64 = sm.strip_prefix(prefix).unwrap().trim();
        let decoded = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            b64,
        ).unwrap();
        String::from_utf8(decoded).unwrap()
    }

    #[test]
    fn test_transform_tsx_minified() {
        let source = r#"
const App = defineComponent(() => {
    return () => <div className="app">Hello</div>;
});
"#;
        let non_min = transform_tsx(source).unwrap().js;
        let min = transform_tsx_with_options(source, true).unwrap().js;

        // Minified output should be shorter
        assert!(min.len() < non_min.len(), "min={} < non_min={}", min.len(), non_min.len());
        // Minified should have fewer newlines
        let min_newlines = min.chars().filter(|&c| c == '\n').count();
        let non_newlines = non_min.chars().filter(|&c| c == '\n').count();
        assert!(min_newlines <= non_newlines);
        // Both should still contain the h() call
        assert!(min.contains("h(\"div\""));
    }
}
