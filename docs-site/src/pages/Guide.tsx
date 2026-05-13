// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

import { CodeBlock, FeatureCard } from '../components/Widgets.tsx';

export const GuidePage = defineComponent(() => {
    return () => h('div', { style: 'max-width: 800px; padding: 32px 0;' },
        // Getting Started
        h('div', { style: 'margin-bottom: 64px;' },
            h('h1', { style: 'font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 8px 0;' }, '🚀 快速开始'),
            h('p', { style: 'font-size: 16px; color: #6b7280; margin: 0 0 32px 0; line-height: 1.6;' },
                '5 分钟内搭建你的第一个 AI-Native 应用'
            ),

            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, '1. 安装'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 12px 0;' },
                'AI-Native 使用 Rust 构建，通过 Cargo 安装：'
            ),
            h(CodeBlock, { lang: 'bash', code: 'cargo install --path /path/to/ai-native-framework' }),

            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 32px 0 16px 0;' }, '2. 创建项目'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 12px 0;' },
                '创建项目目录并编写你的第一个组件：'
            ),
            h(CodeBlock, { lang: 'bash', code: 'mkdir my-app && cd my-app\nmkdir src' }),

            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 32px 0 16px 0;' }, '3. 编写代码'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 12px 0;' },
                '在 src/main.tsx 中：'
            ),
            h(CodeBlock, {
                lang: 'tsx',
                title: 'src/main.tsx',
                code: [
                    'import { signal, defineComponent, h } from "/@runtime"\n',
                    'import { Button, Heading, Text, Stack } from "/@ui"\n\n',
                    'const App = defineComponent(() => {\n',
                    '  const count = signal(0)\n\n',
                    '  return () => h("div", { style: "padding: 40px;" },\n',
                    '    Heading({ level: "h1" }, "Hello AI-Native!"),\n',
                    '    Text({}, "Count: " + count.get()),\n',
                    '    Button({ onClick: () => count.set(count.get() + 1) },\n',
                    '      "Increment"\n',
                    '    )\n',
                    '  )\n',
                    '})\n\n',
                    'document.body.appendChild(App())'
                ].join('')
            }),

            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 32px 0 16px 0;' }, '4. 启动'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 12px 0;' },
                '在项目根目录运行：'
            ),
            h(CodeBlock, { lang: 'bash', code: 'sig serve --port 3000' }),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 12px 0 0 0;' },
                '打开 ', h('code', { style: 'color: #3b82f6;' }, 'http://localhost:3000'), ' 即可看到你的应用！'
            ),

            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 32px 0 16px 0;' }, '5. 生产构建'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 12px 0;' },
                '编译为静态文件：'
            ),
            h(CodeBlock, { lang: 'bash', code: 'sig build --output dist' }),
        ),

        // Project Structure
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, '项目结构'),
            h(CodeBlock, {
                lang: 'text',
                code: [
                    'my-app/',
                    '├── index.html          # HTML 入口（含热重载）',
                    '└── src/',
                    '    ├── main.tsx         # 主入口文件',
                    '    ├── components/      # 组件目录',
                    '    │   ├── Header.tsx',
                    '    │   └── Footer.tsx',
                    '    └── pages/           # 页面目录',
                    '        └── Home.tsx'
                ].join('\n')
            }),
        ),

        // Key Concepts teaser
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, '下一步'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0;' },
                '了解信号响应式系统和核心概念，前往'
            ),
            h('a', {
                href: 'javascript:void(0)',
                style: 'color: #3b82f6; font-size: 15px; text-decoration: underline; cursor: pointer;',
                onClick: function() { window.location.hash = '#concepts'; }
            }, '核心概念 →')
        ),
    );
});
