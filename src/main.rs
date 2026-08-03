// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

mod compiler;
mod generated_contracts;
mod assets;
mod errors;
mod server;
mod visitor;
mod builder;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "sig")]
#[command(about = "Sigil — AI Agent 友好的前端框架")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// 创建新项目
    New {
        /// 项目名称
        name: String,
    },
    /// 启动开发服务器 (支持热重载)
    Serve {
        /// 项目根目录
        #[arg(short = 'd', long, default_value = ".")]
        root: String,
        #[arg(short, long, default_value_t = 3000)]
        port: u16,
    },
    /// 构建生产版本
    Build {
        /// 项目根目录
        #[arg(short = 'd', long, default_value = ".")]
        root: String,
        #[arg(short, long, default_value = "dist")]
        output: String,
    },
}

#[tokio::main]
async fn main() {
    if let Err(error) = run().await {
        eprintln!("{}", error.to_pretty_json());
        std::process::exit(1);
    }
}

async fn run() -> Result<(), errors::SigilError> {
    let cli = Cli::parse();
    match cli.command {
        Commands::New { name } => {
            scaffold_project(&name).map_err(|err| {
                errors::SigilError::new(
                    "SIG-CLI-SCAFFOLD-FAILED",
                    format!("Failed to scaffold project '{}'", name),
                    "The target directory already exists or the CLI could not write scaffold files.",
                    "Use a new project directory and ensure the CLI has write permission.",
                )
                .with_details(serde_json::json!({ "cause": err.to_string(), "project": name }))
            })?;
        }
        Commands::Serve { root, port } => {
            let current_dir = std::env::current_dir().map_err(|err| {
                errors::SigilError::new(
                    "SIG-CLI-CWD-FAILED",
                    "Failed to resolve current working directory.",
                    "The CLI could not inspect the current directory before starting the dev server.",
                    "Run the command from a readable directory and try again.",
                )
                .with_details(serde_json::json!({ "cause": err.to_string() }))
            })?;
            let root_dir = current_dir.join(&root);
            println!("🚀 Sigil dev server at http://localhost:{}", port);
            println!("📂 Serving: {}", root_dir.display());
            server::start_server(port, root_dir).await.map_err(|err| {
                errors::SigilError::new(
                    "SIG-CLI-SERVE-FAILED",
                    format!("Failed to start dev server for '{}'.", root),
                    "The project root is invalid, required files are missing, or the server failed to bind a port.",
                    "Check index.html and src/, then retry with `sig serve -d <project>`.",
                )
                .with_details(serde_json::json!({ "cause": err.to_string(), "root": root, "port": port }))
            })?;
        }
        Commands::Build { root, output } => {
            let current_dir = std::env::current_dir().map_err(|err| {
                errors::SigilError::new(
                    "SIG-CLI-CWD-FAILED",
                    "Failed to resolve current working directory.",
                    "The CLI could not inspect the current directory before building.",
                    "Run the command from a readable directory and try again.",
                )
                .with_details(serde_json::json!({ "cause": err.to_string() }))
            })?;
            let root_dir = current_dir.join(&root);
            let out_path = current_dir.join(&output);
            println!("🛠 Building to: {}", out_path.display());
            builder::build(&root_dir, &out_path).map_err(|err| {
                errors::SigilError::new(
                    "SIG-CLI-BUILD-FAILED",
                    format!("Failed to build project '{}'.", root),
                    "The build pipeline could not read source files or compile TSX into JavaScript.",
                    "Fix the reported compile or file-system error, then run `sig build` again.",
                )
                .with_details(serde_json::json!({ "cause": err.to_string(), "root": root, "output": output }))
            })?;
        }
    }
    Ok(())
}

/// Scaffold a new Sigil project
fn scaffold_project(name: &str) -> anyhow::Result<()> {
    use std::fs;
    use std::path::Path;

    let project_dir = Path::new(name);
    if project_dir.exists() {
        return Err(anyhow::anyhow!("Directory '{}' already exists", name));
    }

    println!("📦 Creating new Sigil project: {}", name);

    // Create directory structure
    fs::create_dir_all(project_dir.join("src"))?;
    fs::create_dir_all(project_dir.join("public"))?;

    // Create index.html
    fs::write(
        project_dir.join("index.html"),
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sigil App</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    </style>
</head>
<body>
    <div id="app"></div>
    <script type="module">
        import { App } from '/src/main.tsx';
        document.getElementById('app').appendChild(App());
    </script>
</body>
</html>
"#,
    )?;
    println!("  ✅ index.html");

    // Create main.tsx
    fs::write(
        project_dir.join("src/main.tsx"),
        r#"import { signal, defineComponent, h, onMount } from '/@runtime';
import { Button, Heading, Text, Stack } from '/@ui';

export const App = defineComponent(() => {
    const count = signal(0);

    onMount(() => {
        console.log('App mounted!');
    });

    return () => h('div', { style: 'padding: 24px; max-width: 400px; margin: 0 auto;' },
        h(Heading, { level: 'h1' }, 'Sigil App'),
        h(Text, {}, 'Count: ' + count.get()),
        h(Button, {
            variant: 'primary',
            onClick: () => count.set(count.get() + 1),
        }, 'Increment'),
    );
});

document.body.appendChild(App());
"#,
    )?;
    println!("  ✅ src/main.tsx");

    fs::write(project_dir.join("sigil-env.d.ts"), assets::EMBEDDED_TYPES_D_TS)?;
    println!("  ✅ sigil-env.d.ts");

    // Create tsconfig.json
    fs::write(
        project_dir.join("tsconfig.json"),
        r#"{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "preserve",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "types": ["./sigil-env.d.ts"]
    },
    "include": ["src/**/*.tsx", "src/**/*.ts"]
}
"#,
    )?;
    println!("  ✅ tsconfig.json");

    // Create README
    fs::write(
        project_dir.join("README.md"),
        format!("# {}\n\nA Sigil application.\n\n## Development\n\n```bash\nsig serve -d . --port 3000\n```\n\n## Build\n\n```bash\nsig build -d . --output dist\n```\n\n## TypeScript\n\nThis project includes a local `sigil-env.d.ts` copied from the CLI so editor types keep working after installation.\n", name),
    )?;
    println!("  ✅ README.md");

    println!("\n✨ Project '{}' created! Start developing:", name);
    println!("   cd {}", name);
    println!("   sig serve");
    Ok(())
}
