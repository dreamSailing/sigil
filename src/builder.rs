// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

use anyhow::Result;
use std::fs;
use std::path::Path;

use crate::compiler;

pub fn build(root_dir: &Path, output_dir: &Path) -> Result<()> {
    // Clean output directory
    if output_dir.exists() {
        fs::remove_dir_all(output_dir)?;
    }
    fs::create_dir_all(output_dir)?;

    // Copy and transform index.html
    let html_src = root_dir.join("index.html");
    if html_src.exists() {
        let html = fs::read_to_string(&html_src)?;
        let html = html
            .replace("'/@runtime'", "'./runtime/runtime.js'")
            .replace("'/@ui'", "'./runtime/ui.js'")
            .replace("/src/main.tsx", "src/main.js");
        // Remove live reload script block
        let html = strip_sse_script(&html);
        fs::write(output_dir.join("index.html"), &html)?;
        println!("✅ Wrote index.html ({})", format_size(html.len()));
    }

    // Compile all source files
    let src_dir = root_dir.join("src");
    if !src_dir.exists() {
        return Err(anyhow::anyhow!("src/ directory not found in {}", root_dir.display()));
    }

    let mut files = Vec::new();
    collect_source_files(&src_dir, &mut files)?;

    println!("📦 Compiling {} source files...", files.len());

    let mut total_original = 0;
    let mut total_minified = 0;
    let mut file_stats: Vec<(String, usize, usize)> = Vec::new();

    for src_file in &files {
        let relative = src_file.strip_prefix(&src_dir)?;
        let dest_path = output_dir.join("src").join(relative);

        if let Some(parent) = dest_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let source = fs::read_to_string(src_file)?;
        let original_size = source.len();
        let is_tsx = src_file.extension().is_some_and(|e| e == "tsx");

        let compiled = if is_tsx {
            compiler::transform_tsx_with_options(&source, true)?.js
        } else {
            // For non-TSX files, still apply basic minification
            minify_js(&compiler::rewrite_local_imports(&source))
        };
        
        // Replace /@runtime and /@ui paths in compiled JS for production
        let compiled = compiled
            .replace("from '/@runtime'", "from './runtime/runtime.js'")
            .replace("from '/@ui'", "from './runtime/ui.js'")
            .replace("from \"/@runtime\"", "from \"./runtime/runtime.js\"")
            .replace("from \"/@ui\"", "from \"./runtime/ui.js\"");
        
        let minified_size = compiled.len();

        let js_path = {
            let mut p = dest_path.clone();
            p.set_extension("js");
            p
        };

        fs::write(&js_path, &compiled)?;
        let rel = js_path.strip_prefix(output_dir)?;
        println!("  ✅ {} ({} → {})", rel.display(),
            format_size(original_size), format_size(minified_size));

        total_original += original_size;
        total_minified += minified_size;
        let name = rel.to_string_lossy().to_string();
        file_stats.push((name, original_size, minified_size));
    }

    // Copy runtime files
    let runtime_dir = output_dir.join("runtime");
    fs::create_dir_all(&runtime_dir)?;

    // Locate runtime files relative to the binary
    let project_root = std::env::current_exe()
        .ok()
        .and_then(|p| {
            let target = p.parent()?.parent()?.parent()?;
            Some(target.to_path_buf())
        });
    
    let runtime_src = project_root
        .as_ref()
        .map(|p| p.join("runtime/runtime.js"))
        .filter(|p| p.exists())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default().join("runtime/runtime.js"));
    
    let ui_src = project_root
        .as_ref()
        .map(|p| p.join("runtime/ui.js"))
        .filter(|p| p.exists())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default().join("runtime/ui.js"));

    if runtime_src.exists() {
        let content = fs::read_to_string(&runtime_src)?;
        let minified = minify_js(&content);
        total_original += content.len();
        total_minified += minified.len();
        fs::write(runtime_dir.join("runtime.js"), &minified)?;
        println!("✅ Wrote runtime/runtime.js ({} → {})",
            format_size(content.len()), format_size(minified.len()));
    }
    if ui_src.exists() {
        let content = fs::read_to_string(&ui_src)?;
        let minified = minify_js(&content);
        total_original += content.len();
        total_minified += minified.len();
        fs::write(runtime_dir.join("ui.js"), &minified)?;
        println!("✅ Wrote runtime/ui.js ({} → {})",
            format_size(content.len()), format_size(minified.len()));
    }

    // Copy public directory if it exists (M4 fix)
    let public_dir = root_dir.join("public");
    if public_dir.exists() {
        println!("📁 Copying public/ directory...");
        copy_dir_all(&public_dir, output_dir)?;
        println!("✅ Copied public/ directory");
    }

    // Build summary
    let savings = if total_original > 0 {
        ((1.0 - total_minified as f64 / total_original as f64) * 100.0) as u32
    } else { 0 };

    println!("\n📊 Build Summary:");
    println!("   Files: {} source + 2 runtime", file_stats.len());
    println!("   Original: {} → Minified: {} ({}% reduction)",
        format_size(total_original), format_size(total_minified), savings);

    // Top 3 largest files
    file_stats.sort_by(|a, b| b.2.cmp(&a.2));
    println!("   Largest:");
    for (name, _, min_size) in file_stats.iter().take(3) {
        println!("     {} ({})", name, format_size(*min_size));
    }

    println!("\n🎉 Build complete! Output in: {}", output_dir.display());
    Ok(())
}

fn format_size(bytes: usize) -> String {
    if bytes >= 1024 * 1024 {
        format!("{:.1} MB", bytes as f64 / 1024.0 / 1024.0)
    } else {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    }
}

/// Recursively copy a directory (M4 fix helper)
fn copy_dir_all(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    use std::fs;
    
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        
        if ty.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
            println!("  📄 Copied {}", entry.file_name().to_string_lossy());
        }
    }
    Ok(())
}

/// Strip the SSE live reload script from HTML for production
fn strip_sse_script(html: &str) -> String {
    if let Some(start) = html.find("EventSource") {
        if let Some(tag_start) = html[..start].rfind("<script") {
            if let Some(end) = html[tag_start..].find("</script>") {
                let full_end = tag_start + end + 9;
                let mut result = html[..tag_start].to_string();
                result.push_str(&html[full_end..]);
                return result.replace("<script type=\"module\"></body>", "</body>");
            }
        }
    }
    html.to_string()
}

/// Basic JavaScript minification: strip comments, reduce whitespace
fn minify_js(code: &str) -> String {
    let mut result = String::with_capacity(code.len());
    let mut chars = code.chars().peekable();
    let mut in_single_quote = false;
    let mut in_double_quote = false;
    let mut in_template = false;
    let mut in_single_comment = false;
    let mut in_block_comment = false;
    let mut in_regex = false;
    let mut last_was_newline = false;
    let mut last_significant_char = ' ';

    while let Some(c) = chars.next() {
        // Skip newlines and excess whitespace
        if c == '\n' || c == '\r' {
            last_was_newline = true;
            if in_single_comment {
                in_single_comment = false;
                result.push(' ');
            }
            continue;
        }

        if c == ' ' || c == '\t' {
            if last_was_newline {
                continue; // skip leading whitespace
            }
            if in_single_comment || in_block_comment {
                continue;
            }
            // Collapse multiple spaces
            if result.ends_with(' ') && !in_single_quote && !in_double_quote && !in_template && !in_regex {
                continue;
            }
            result.push(c);
            continue;
        }

        last_was_newline = false;

        // Detect regex start: / should only start regex after certain chars
        if c == '/' && !in_single_quote && !in_double_quote && !in_template && !in_block_comment && !in_single_comment && !in_regex {
            // Check if this could be a regex (not division)
            let could_be_regex = matches!(last_significant_char, '(' | ',' | '=' | ':' | '[' | '!' | '&' | '|' | '?' | '{' | ';' | '>' | '<' | '+' | '-' | '*' | '%' | '^' | '~' | '\n' | '\r' | ' ');
            
            if could_be_regex {
                // Check for regex patterns
                if chars.peek() == Some(&'/') {
                    // Single-line comment
                    chars.next();
                    in_single_comment = true;
                    continue;
                }
                if chars.peek() == Some(&'*') {
                    // Block comment
                    chars.next();
                    in_block_comment = true;
                    continue;
                }
                
                // Could be a regex literal
                in_regex = true;
                result.push(c);
                last_significant_char = c;
                continue;
            } else {
                // Division operator, not a regex
                result.push(c);
                last_significant_char = c;
                continue;
            }
        }

        // Handle regex content
        if in_regex {
            result.push(c);
            last_significant_char = c;
            
            if c == '/' {
                // End of regex, check for flags
                while let Some(&next) = chars.peek() {
                    if next.is_ascii_alphabetic() {
                        chars.next();
                        result.push(next);
                        last_significant_char = next;
                    } else {
                        break;
                    }
                }
                in_regex = false;
            } else if c == '\\' {
                // Escape next character in regex
                if let Some(escaped) = chars.next() {
                    result.push(escaped);
                    last_significant_char = escaped;
                }
            } else if c == '[' {
                // Character class in regex - don't treat / as comment
                while let Some(cc) = chars.next() {
                    result.push(cc);
                    last_significant_char = cc;
                    if cc == ']' {
                        break;
                    }
                    if cc == '\\' {
                        if let Some(escaped) = chars.next() {
                            result.push(escaped);
                            last_significant_char = escaped;
                        }
                    }
                }
            }
            continue;
        }

        // End block comment
        if c == '*' && in_block_comment && chars.peek() == Some(&'/') {
            chars.next();
            in_block_comment = false;
            continue;
        }

        if in_block_comment {
            continue;
        }

        // String tracking
        if c == '\'' && !in_double_quote && !in_template && !in_regex {
            in_single_quote = !in_single_quote;
        }
        if c == '"' && !in_single_quote && !in_template && !in_regex {
            in_double_quote = !in_double_quote;
        }
        if c == '`' && !in_single_quote && !in_double_quote && !in_regex {
            in_template = !in_template;
        }

        result.push(c);
        last_significant_char = c;
    }

    // Remove trailing whitespace
    result.trim().to_string()
}

fn collect_source_files(dir: &Path, files: &mut Vec<std::path::PathBuf>) -> Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_source_files(&path, files)?;
        } else if let Some(ext) = path.extension() {
            if ext == "tsx" || ext == "ts" {
                files.push(path);
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_minify_strips_single_line_comment() {
        let input = "const x = 1; // this is a comment\nconst y = 2;";
        let output = minify_js(input);
        assert!(!output.contains("// this is a comment"));
        assert!(output.contains("const x = 1"));
        assert!(output.contains("const y = 2"));
    }

    #[test]
    fn test_minify_strips_block_comment() {
        let input = "const x = 1;\n/* multi\nline\ncomment */\nconst y = 2;";
        let output = minify_js(input);
        assert!(!output.contains("comment"));
        assert!(output.contains("const x = 1"));
        assert!(output.contains("const y = 2"));
    }

    #[test]
    fn test_minify_preserves_strings() {
        let input = "const x = '// not a comment';\nconst y = 'hello';";
        let output = minify_js(input);
        assert!(output.contains("'// not a comment'"));
    }

    #[test]
    fn test_minify_collapses_whitespace() {
        let input = "const   x   =   1;\n\n\nconst   y   =   2;";
        let output = minify_js(input);
        assert!(output.contains("const x = 1"));
        assert!(output.contains("const y = 2"));
        // Should not have multiple consecutive spaces
        assert!(!output.contains("  "));
    }

    #[test]
    fn test_strip_sse_script() {
        let html = r#"<html><body>
<script type="module">
    const es = new EventSource('/@reload');
</script>
</body></html>"#;
        let output = strip_sse_script(html);
        assert!(!output.contains("EventSource"));
        assert!(output.contains("</body>"));
    }
}
