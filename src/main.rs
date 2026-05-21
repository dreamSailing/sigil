// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

mod compiler;
mod server;
mod visitor;
mod builder;

use anyhow::Result;
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
async fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::New { name } => {
            scaffold_project(&name)?;
        }
        Commands::Serve { root, port } => {
            let root_dir = std::env::current_dir()?.join(&root);
            println!("🚀 Sigil dev server at http://localhost:{}", port);
            println!("📂 Serving: {}", root_dir.display());
            server::start_server(port, root_dir).await?;
        }
        Commands::Build { root, output } => {
            let root_dir = std::env::current_dir()?.join(&root);
            let out_path = std::env::current_dir()?.join(output);
            println!("🛠 Building to: {}", out_path.display());
            builder::build(&root_dir, &out_path)?;
        }
    }
    Ok(())
}

/// Scaffold a new Sigil project
fn scaffold_project(name: &str) -> Result<()> {
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
        r#"import { signal, defineComponent, h } from '/@runtime';
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
        "types": ["../../runtime/types.d.ts"]
    },
    "include": ["src/**/*.tsx", "src/**/*.ts"]
}
"#,
    )?;
    println!("  ✅ tsconfig.json");

    // Create README
    fs::write(
        project_dir.join("README.md"),
        format!("# {}\n\nA Sigil application.\n\n## Development\n\n```bash\nsig serve -d . --port 3000\n```\n\n## Build\n\n```bash\nsig build -d . --output dist\n```\n", name),
    )?;
    println!("  ✅ README.md");

    println!("\n✨ Project '{}' created! Start developing:", name);
    println!("   cd {}", name);
    println!("   sig serve");
    Ok(())
}
