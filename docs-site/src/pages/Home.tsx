// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

import { FeatureCard, CodeBlock } from '../components/Widgets.tsx';

const features = [
    { icon: '⚡', title: '极速编译', description: '基于 SWC 的 TSX 编译，毫秒级转换，支持完整的 TypeScript 语法。' },
    { icon: '🔄', title: '信号响应式', description: '显式 signal/computed/effect 系统，精确追踪依赖，无虚拟 DOM 开销。' },
    { icon: '🧩', title: '组件库', description: '28+ 内置 UI 组件，零 CSS 依赖，纯内联样式，开箱即用。' },
    { icon: '🤖', title: 'Agent 友好', description: '为 AI Agent 设计的开发体验，最小化认知负担，直白的 API。' },
    { icon: '🔥', title: '热重载', description: '文件监听 + SSE 推送，代码改动即时刷新，无需手动操作。' },
    { icon: '📦', title: '生产构建', description: '一键生成静态文件，自动剥离开发脚本，优化输出。' },
];

export const HomePage = defineComponent(() => {
    return () => h('div', {},
        // Hero section
        h('div', { style: 'text-align: center; padding: 80px 32px 48px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white;' },
            h('div', { style: 'display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); border-radius: 20px; font-size: 13px; color: #93c5fd; margin-bottom: 24px;' },
                h('span', {}, '🎉'),
                ' v0.1.0 正式发布'
            ),
            h('h1', { style: 'font-size: 48px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.02em;' }, 'Sigil'),
            h('p', { style: 'font-size: 20px; color: #94a3b8; max-width: 640px; margin: 0 auto 32px; line-height: 1.6;' },
                '专为 AI Agent 设计的前端框架。TSX 编译 + 信号响应式 + 内联 UI 组件，零配置启动。'
            ),
            h('div', { style: 'display: flex; gap: 12px; justify-content: center;' },
                h('button', {
                    style: 'padding: 12px 24px; font-size: 16px; font-weight: 600; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;',
                    onClick: function() { window.location.hash = '#guide'; }
                }, '快速开始 →'),
                h('button', {
                    style: 'padding: 12px 24px; font-size: 16px; font-weight: 600; background: transparent; color: #e2e8f0; border: 1px solid #475569; border-radius: 8px; cursor: pointer;',
                    onClick: function() { window.location.hash = '#comparison'; }
                }, '框架对比')
            )
        ),

        // Dogfooding banner
        h('div', { style: 'max-width: 800px; margin: -24px auto 32px; position: relative; z-index: 1; padding: 20px 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; text-align: center;' },
            h('p', { style: 'font-size: 15px; color: #166534; margin: 0; line-height: 1.6;' },
                '💚 你正在浏览的文档网站本身由 Sigil 框架开发 —— 侧边栏导航、页面切换、所有交互，全部运行在 Sigil 的信号响应式系统之上。'
            )
        ),

        // Quick start code
        h('div', { style: 'max-width: 720px; margin: 0 auto 64px; position: relative; z-index: 1;' },
            h('div', { style: 'background: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2);' },
                h('div', { style: 'display: flex; gap: 8px; padding: 16px 20px; background: #0f172a; border-bottom: 1px solid #334155;' },
                    h('span', { style: 'width: 12px; height: 12px; border-radius: 50%; background: #ef4444;' }),
                    h('span', { style: 'width: 12px; height: 12px; border-radius: 50%; background: #f59e0b;' }),
                    h('span', { style: 'width: 12px; height: 12px; border-radius: 50%; background: #22c55e;' })
                ),
                h('pre', { style: 'padding: 24px; margin: 0; overflow-x: auto;' },
                    h('code', { style: 'font-family: monospace; font-size: 14px; color: #e2e8f0; line-height: 1.8;' },
                        [
                            'import { ',
                            h('span', { style: 'color: #93c5fd;' }, 'signal'),
                            ', ',
                            h('span', { style: 'color: #93c5fd;' }, 'computed'),
                            ', ',
                            h('span', { style: 'color: #93c5fd;' }, 'defineComponent'),
                            ' } from ',
                            h('span', { style: 'color: #fbbf24;' }, "'/@runtime'"),
                            '\n\n',
                            'const ',
                            h('span', { style: 'color: #fbbf24;' }, 'count'),
                            ' = ',
                            h('span', { style: 'color: #93c5fd;' }, 'signal'),
                            '(',
                            h('span', { style: 'color: #fb923c;' }, '0'),
                            ')\n\n',
                            'const ',
                            h('span', { style: 'color: #fbbf24;' }, 'App'),
                            ' = ',
                            h('span', { style: 'color: #93c5fd;' }, 'defineComponent'),
                            '(() => {\n',
                            '  return () => h(',
                            h('span', { style: 'color: #fbbf24;' }, "'div'"),
                            ', {},\n',
                            '    h(',
                            h('span', { style: 'color: #fbbf24;' }, "'h1'"),
                            ', {}, ',
                            h('span', { style: 'color: #fbbf24;' }, "'Count: '"),
                            ', ',
                            h('span', { style: 'color: #fbbf24;' }, 'count'),
                            '),\n',
                            '    h(',
                            h('span', { style: 'color: #fbbf24;' }, "'button'"),
                            ', { ',
                            h('span', { style: 'color: #fbbf24;' }, 'onClick'),
                            ': () => ',
                            h('span', { style: 'color: #fbbf24;' }, 'count'),
                            '.set(',
                            h('span', { style: 'color: #fbbf24;' }, 'count'),
                            '.get() + ',
                            h('span', { style: 'color: #fb923c;' }, '1'),
                            ') },\n',
                            "      'Increment'\n",
                            '    )\n',
                            '  )\n',
                            '})'
                        ]
                    )
                )
            )
        ),

        // Features grid
        h('div', { style: 'max-width: 1000px; margin: 0 auto 64px; padding: 0 32px;' },
            h('div', { style: 'text-align: center; margin-bottom: 48px;' },
                h('h2', { style: 'font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 12px 0;' }, '为什么选择 Sigil?'),
                h('p', { style: 'font-size: 16px; color: #6b7280;' }, '专为 AI Agent 开发体验优化的每一个设计决策')
            ),
            h('div', { style: 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;' },
                ...features.map(function(f) {
                    return h('div', {
                        style: 'padding: 28px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; transition: box-shadow 0.2s, transform 0.2s;',
                        onMouseEnter: function(e) { e.target.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.target.style.transform = 'translateY(-2px)'; },
                        onMouseLeave: function(e) { e.target.style.boxShadow = 'none'; e.target.style.transform = 'none'; }
                    },
                        h('div', { style: 'font-size: 36px; margin-bottom: 16px;' }, f.icon),
                        h('h3', { style: 'font-size: 17px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, f.title),
                        h('p', { style: 'font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;' }, f.description)
                    );
                })
            )
        ),

        // CTA
        h('div', { style: 'max-width: 700px; margin: 0 auto 80px; padding: 48px; text-align: center; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 16px;' },
            h('h2', { style: 'font-size: 24px; font-weight: 700; color: #0c4a6e; margin: 0 0 12px 0;' }, '开始构建'),
            h('p', { style: 'font-size: 15px; color: #0369a1; margin: 0 0 24px 0;' }, '几分钟内搭建你的第一个 Sigil 应用'),
            h('code', { style: 'display: inline-block; padding: 12px 20px; background: #0f172a; color: #e2e8f0; border-radius: 8px; font-family: monospace; font-size: 14px;' }, 'sig serve')
        )
    );
});
