// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

use anyhow::Result;
use serde::Serialize;
use std::path::{Component, Path, PathBuf};
use swc_core::common::{sync::Lrc, FileName, SourceMap, Mark, Globals, GLOBALS};
use swc_core::common::errors::{Handler, Emitter, DiagnosticBuilder, HANDLER};
use swc_core::ecma::ast::{Program, Callee, Expr, JSXElementName};
use swc_core::ecma::codegen::text_writer::JsWriter;
use swc_core::ecma::parser::{lexer::Lexer, Parser, StringInput, Syntax, TsConfig};
use swc_core::ecma::transforms::base::resolver;
use swc_core::ecma::visit::{Visit, VisitWith, FoldWith};

use crate::visitor::JsxVisitor;
use crate::generated_contracts::{ALL_UI_COMPONENTS, RUNTIME_IMPORTS};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileLocation {
    pub file: String,
    pub line: usize,
    pub column: usize,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileDiagnostic {
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<CompileLocation>,
}

#[derive(Clone, Debug)]
pub struct CompileError {
    diagnostics: Vec<CompileDiagnostic>,
}

impl CompileError {
    fn new(diagnostics: Vec<CompileDiagnostic>) -> Self {
        Self { diagnostics }
    }

    pub fn diagnostics(&self) -> &[CompileDiagnostic] {
        &self.diagnostics
    }
}

impl std::fmt::Display for CompileError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Compilation failed:")?;
        for diagnostic in &self.diagnostics {
            match &diagnostic.location {
                Some(location) => {
                    writeln!(
                        f,
                        "[{}:{}:{}] {}",
                        location.file,
                        location.line,
                        location.column,
                        diagnostic.message
                    )?;
                }
                None => {
                    writeln!(f, "{}", diagnostic.message)?;
                }
            }
        }
        Ok(())
    }
}

impl std::error::Error for CompileError {}

pub fn extract_compile_diagnostics(error: &anyhow::Error) -> Option<Vec<CompileDiagnostic>> {
    error
        .downcast_ref::<CompileError>()
        .map(|compile_error| compile_error.diagnostics().to_vec())
}

struct ErrorCapturer {
    errors: std::sync::Arc<std::sync::Mutex<Vec<CompileDiagnostic>>>,
    cm: Lrc<SourceMap>,
}

impl ErrorCapturer {
    fn new(cm: Lrc<SourceMap>) -> Self {
        Self { errors: std::sync::Arc::new(std::sync::Mutex::new(Vec::new())), cm }
    }
}

impl Emitter for ErrorCapturer {
    fn emit(&mut self, db: &DiagnosticBuilder<'_>) {
        // C3 fix: Handle poisoned mutex gracefully
        let mut lock = self.errors.lock().unwrap_or_else(|e| e.into_inner());
        let diagnostic = if let Some(span) = db.span.primary_span() {
            let loc = self.cm.lookup_char_pos(span.lo());
            CompileDiagnostic {
                message: db.message[0].0.to_string(),
                location: Some(CompileLocation {
                    file: loc.file.name.to_string(),
                    line: loc.line,
                    column: loc.col_display + 1,
                }),
            }
        } else {
            CompileDiagnostic {
                message: db.message.iter().map(|m| m.0.to_string()).collect::<Vec<_>>().join(" "),
                location: None,
            }
        };
        lock.push(diagnostic);
    }
}

/// Compilation result with optional source map
#[derive(Clone)]
pub struct CompileResult {
    pub js: String,
    #[allow(dead_code)]
    pub source_map: Option<String>,
}

#[allow(dead_code)]
pub fn transform_tsx(source: &str) -> Result<CompileResult> {
    transform_tsx_at_path(source, Path::new("main.tsx"))
}

pub fn transform_tsx_at_path(source: &str, module_path: &Path) -> Result<CompileResult> {
    transform_tsx_with_options_at_path(source, module_path, false)
}

#[allow(dead_code)]
pub fn transform_tsx_with_options(source: &str, minify: bool) -> Result<CompileResult> {
    transform_tsx_with_options_at_path(source, Path::new("main.tsx"), minify)
}

pub fn transform_tsx_with_options_at_path(source: &str, module_path: &Path, minify: bool) -> Result<CompileResult> {
    let cm: Lrc<SourceMap> = Default::default();
    let globals = Globals::new();
    let error_capturer = ErrorCapturer::new(cm.clone());
    let error_buf = error_capturer.errors.clone();
    let handler = Handler::with_emitter(true, false, Box::new(error_capturer));
    let source = source.to_string();
    let module_path = module_path.to_path_buf();

    GLOBALS.set(&globals, || {
        HANDLER.set(&handler, || do_transform(&cm, &source, &module_path, minify))
    })
    .and_then(|output| {
        let errors = error_buf.lock().unwrap();
        if !errors.is_empty() {
            return Err(anyhow::Error::new(CompileError::new(errors.clone())));
        }
        Ok(output)
    })
}

fn do_transform(cm: &Lrc<SourceMap>, source: &str, module_path: &Path, minify: bool) -> Result<CompileResult> {
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
        .map_err(|e| anyhow::Error::new(CompileError::new(vec![CompileDiagnostic {
            message: format!("{:?}", e),
            location: None,
        }])))?;

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
    let mut source_map_buf = vec![];
    {
        let mut emitter = swc_core::ecma::codegen::Emitter {
            cfg: swc_core::ecma::codegen::Config::default().with_minify(minify),
            comments: None,
            cm: cm.clone(),
            wr: JsWriter::new(cm.clone(), "\n", &mut buf, Some(&mut source_map_buf)),
        };
        emitter
            .emit_module(&module)
            .map_err(|e| anyhow::anyhow!("{:?}", e))?;
    }

    // 7. Rewrite relative imports to /src/ paths
    let generated = String::from_utf8(buf)?;
    let rewritten = rewrite_local_imports(&generated, module_path);

    // 8. Build inline source map using SWC's generated mappings
    let source_map_json = build_source_map_with_mappings(source, source_map_buf);

    // 9. Inject only used UI imports
    let ui_import = if used_ui.is_empty() {
        String::new()
    } else {
        format!("import {{ {} }} from '/@ui';\n", used_ui.join(", "))
    };

    let runtime_import = format!("import {{ {} }} from '/@runtime';\n", RUNTIME_IMPORTS.join(", "));
    let mut final_code = format!("{}{}{}", runtime_import, ui_import, rewritten);

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
                if ident.sym.as_ref() == "h" {
                    if let Some(first_arg) = call.args.first() {
                        if let Expr::Ident(component_ident) = first_arg.expr.as_ref() {
                            self.maybe_add(component_ident.sym.as_ref());
                        }
                    }
                }
            }
        }
        // Recurse into args
        call.visit_children_with(self);
    }
}

fn normalize_module_path(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => normalized.push(part),
            Component::ParentDir => {
                normalized.pop();
            }
            Component::CurDir | Component::RootDir | Component::Prefix(_) => {}
        }
    }
    normalized
}

fn resolve_src_import(module_path: &Path, import_path: &str) -> String {
    let clean = import_path
        .strip_suffix(".tsx")
        .or_else(|| import_path.strip_suffix(".ts"))
        .or_else(|| import_path.strip_suffix(".jsx"))
        .or_else(|| import_path.strip_suffix(".js"))
        .unwrap_or(import_path);
    let base_dir = module_path.parent().unwrap_or_else(|| Path::new(""));
    let normalized = normalize_module_path(&base_dir.join(clean));
    let normalized = normalized.to_string_lossy().replace('\\', "/");
    format!("/src/{}", normalized.trim_start_matches('/'))
}

/// Rewrite relative imports (./foo, ../foo) to /src/foo paths
pub fn rewrite_local_imports(code: &str, module_path: &Path) -> String {
    let re = regex::Regex::new(r#"from\s+['"](\.{1,2}/[^'"]+)['"]"#).unwrap();
    re.replace_all(code, |caps: &regex::Captures| {
        let raw_path = &caps[1];
        format!("from '{}'", resolve_src_import(module_path, raw_path))
    }).to_string()
}

/// Build an inline source map with original source content embedded and real mappings from SWC.
/// Returns the full `//# sourceMappingURL=...` comment string.
fn build_source_map_with_mappings(original_source: &str, swc_mappings: Vec<(swc_core::common::BytePos, swc_core::common::LineCol)>) -> String {
    // Convert SWC's BytePos/LineCol mappings to proper VLQ format
    // SWC mappings are (generated_position, original_line_col)
    
    // Group mappings by generated line
    let mut line_mappings: Vec<Vec<(u32, u32, u32)>> = Vec::new(); // (gen_col, orig_line, orig_col)
    
    for (_, linecol) in &swc_mappings {
        let gen_col = linecol.col;
        // Approximate original line/col from SWC's output
        let orig_line = linecol.line;
        let orig_col = linecol.col;

        let gen_line = linecol.line as usize;
        while line_mappings.len() <= gen_line {
            line_mappings.push(Vec::new());
        }
        line_mappings[gen_line].push((gen_col, orig_line, orig_col));
    }
    
    // Build VLQ mappings string
    let mut mappings = String::new();
    let mut last_gen_col = 0i32;
    let mut last_source = 0i32;
    let mut last_orig_line = 0i32;
    let mut last_orig_col = 0i32;
    
    for (i, line) in line_mappings.iter().enumerate() {
        if i > 0 {
            mappings.push(';'); // End of line
            last_gen_col = 0;
        }
        
        for (j, (gen_col, orig_line, orig_col)) in line.iter().enumerate() {
            if j > 0 {
                mappings.push(','); // Separator within line
            }
            
            let gen_col_i32 = *gen_col as i32;
            let orig_line_i32 = *orig_line as i32;
            let orig_col_i32 = *orig_col as i32;
            
            // VLQ encode: gen_col, source_idx, orig_line, orig_col
            mappings.push_str(&vlq_encode_segment(gen_col_i32 - last_gen_col));
            mappings.push_str(&vlq_encode_segment(0 - last_source)); // source index 0
            mappings.push_str(&vlq_encode_segment(orig_line_i32 - last_orig_line));
            mappings.push_str(&vlq_encode_segment(orig_col_i32 - last_orig_col));
            
            last_gen_col = gen_col_i32;
            last_source = 0;
            last_orig_line = orig_line_i32;
            last_orig_col = orig_col_i32;
        }
    }

    // Build source map JSON with real mappings
    let source_map = serde_json::json!({
        "version": 3,
        "sources": ["input.tsx"],
        "sourcesContent": [original_source],
        "mappings": mappings,
        "names": []
    });

    let json_str = serde_json::to_string(&source_map).unwrap_or_default();
    let encoded = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        json_str.as_bytes(),
    );
    format!("//# sourceMappingURL=data:application/json;base64,{}\n", encoded)
}

/// VLQ encode a single integer value
fn vlq_encode_segment(value: i32) -> String {
    // VLQ encoding: 
    // 1. Convert signed to unsigned (zigzag encoding)
    // 2. Split into 5-bit chunks
    // 3. Set continuation bit for all but last chunk
    // 4. Map to base64 characters
    
    // Use safe zigzag encoding to avoid overflow for i32::MIN
    // zigzag: (value << 1) ^ (value >> 31)
    let vlq = (value.wrapping_shl(1) ^ (value >> 31)) as u32;
    
    let base64_chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    let mut remaining = vlq;
    
    loop {
        let mut digit = remaining & 0x1F; // 5 bits
        remaining >>= 5;
        
        if remaining > 0 {
            digit |= 0x20; // Set continuation bit
        }
        
        result.push(base64_chars[digit as usize] as char);
        
        if remaining == 0 {
            break;
        }
    }
    
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rewrite_local_imports() {
        // Relative import with .tsx extension
        let input = r#"import { foo } from './utils.tsx'"#;
        let output = rewrite_local_imports(input, Path::new("main.tsx"));
        assert_eq!(output, "import { foo } from '/src/utils'");

        // Relative import with .ts extension
        let input = r#"import { bar } from '../helpers.ts'"#;
        let output = rewrite_local_imports(input, Path::new("pages/home.tsx"));
        assert_eq!(output, "import { bar } from '/src/helpers'");

        // Relative import without extension
        let input = r#"import { baz } from './module'"#;
        let output = rewrite_local_imports(input, Path::new("features/page.tsx"));
        assert_eq!(output, "import { baz } from '/src/features/module'");

        // Nested import keeps module directory context
        let input = r#"import { thing } from '../shared/thing.ts'"#;
        let output = rewrite_local_imports(input, Path::new("features/dashboard/page.tsx"));
        assert_eq!(output, "import { thing } from '/src/features/shared/thing'");

        // Double quotes
        let input = r#"import { x } from "../foo.js""#;
        let output = rewrite_local_imports(input, Path::new("nested/entry.tsx"));
        assert_eq!(output, "import { x } from '/src/foo'");

        // Multiple imports in one file
        let input = r#"import { a } from './a.tsx';
import { b } from '../b.ts';"#;
        let output = rewrite_local_imports(input, Path::new("nested/view.tsx"));
        assert!(output.contains("from '/src/nested/a'"));
        assert!(output.contains("from '/src/b'"));

        // Imports that walk above src root clamp to src root
        let input = r#"import { root } from '../../../root.ts'"#;
        let output = rewrite_local_imports(input, Path::new("nested/deep/page.tsx"));
        assert_eq!(output, "import { root } from '/src/root'");

        // Absolute import should not change
        let input = r#"import { signal } from '/@runtime'"#;
        let output = rewrite_local_imports(input, Path::new("main.tsx"));
        assert_eq!(output, input);
    }

    #[test]
    fn test_transform_tsx_preserves_nested_import_context() {
        let source = r#"
import { ButtonRow } from './ButtonRow.tsx';
const App = defineComponent(() => () => <ButtonRow />);
"#;
        let compiled = transform_tsx_at_path(source, Path::new("components/forms/Form.tsx")).unwrap();
        assert!(compiled.js.contains("from '/src/components/forms/ButtonRow'"));
    }

    #[test]
    fn test_transform_tsx_injects_lifecycle_imports() {
        let source = r#"
const App = defineComponent(() => {
    onMount(() => console.log('mounted'));
    return () => <div>Hello</div>;
});
"#;
        let compiled = transform_tsx(source).unwrap();
        assert!(compiled.js.contains("onMount"));
        assert!(compiled.js.contains("onUnmount"));
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

    #[test]
    fn test_transform_tsx_detects_ui_component_in_h_call() {
        let source = r#"
export function CodeBlock() {
    return h("div", {}, h(Badge, { variant: "info" }, "beta"));
}
"#;
        let compiled = transform_tsx_at_path(source, Path::new("components/Widgets.tsx")).unwrap();
        assert!(compiled.js.contains("import { Badge } from '/@ui';"));
    }
}
