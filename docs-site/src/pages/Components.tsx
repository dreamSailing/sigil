// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

import { CodeBlock, ApiTable } from '../components/Widgets.tsx';
import { SIGIL_UI_COMPONENT_COUNT, SIGIL_UI_COMPONENTS } from '../generated/contracts.ts';

export const ComponentsPage = defineComponent(() => {
    const showModal = signal(false);
    const componentSummary = SIGIL_UI_COMPONENTS.map(function(item) {
        var suffix = item.stability === 'experimental' ? ' (experimental)' : '';
        return item.name + suffix;
    }).join(', ');

    return () => h('div', { style: 'max-width: 900px; padding: 32px 0;' },
        h('h1', { style: 'font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 8px 0;' }, '🧩 UI 组件'),
        h('p', { style: 'font-size: 16px; color: #6b7280; margin: 0 0 48px 0; line-height: 1.6;' },
            SIGIL_UI_COMPONENT_COUNT + ' 个内置 UI 组件，零外部 CSS 文件，样式内联注入，开箱即用。实验组件会在文档中显式标记。'
        ),
        h('p', { style: 'font-size: 14px; color: #4b5563; margin: -24px 0 32px 0; line-height: 1.8;' }, componentSummary),

        // Layout
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, '布局组件'),
            h('p', { style: 'font-size: 14px; color: #6b7280; margin: 0 0 24px 0;' }, 'Container, Flex, Grid, Stack, Divider'),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'Flex'),
                Flex({ style: 'gap: 12px;' },
                    h('div', { style: 'padding: 12px 24px; background: #3b82f6; color: white; border-radius: 6px;' }, 'Item 1'),
                    h('div', { style: 'padding: 12px 24px; background: #8b5cf6; color: white; border-radius: 6px;' }, 'Item 2'),
                    h('div', { style: 'padding: 12px 24px; background: #ec4899; color: white; border-radius: 6px;' }, 'Item 3')
                )
            ),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'Grid'),
                h('div', { style: 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;' },
                    h('div', { style: 'padding: 16px; background: #dbeafe; border-radius: 6px; text-align: center; color: #1e40af;' }, '1'),
                    h('div', { style: 'padding: 16px; background: #dbeafe; border-radius: 6px; text-align: center; color: #1e40af;' }, '2'),
                    h('div', { style: 'padding: 16px; background: #dbeafe; border-radius: 6px; text-align: center; color: #1e40af;' }, '3'),
                    h('div', { style: 'padding: 16px; background: #dbeafe; border-radius: 6px; text-align: center; color: #1e40af;' }, '4'),
                    h('div', { style: 'padding: 16px; background: #dbeafe; border-radius: 6px; text-align: center; color: #1e40af;' }, '5'),
                    h('div', { style: 'padding: 16px; background: #dbeafe; border-radius: 6px; text-align: center; color: #1e40af;' }, '6')
                )
            ),
            h(CodeBlock, { lang: 'tsx', code: "Flex({ gap: '12px' }, ...children)\nGrid({ cols: 3 }, ...children)\nStack({ gap: '8px' }, ...children)" })
        ),

        // Typography
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, '排版组件'),
            h('p', { style: 'font-size: 14px; color: #6b7280; margin: 0 0 24px 0;' }, 'Heading, Text'),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                Heading({ level: 'h1', style: 'margin: 0 0 8px 0;' }, 'Heading H1'),
                Heading({ level: 'h2', style: 'margin: 0 0 8px 0;' }, 'Heading H2'),
                Heading({ level: 'h3', style: 'margin: 0 0 8px 0;' }, 'Heading H3'),
                Text({ style: 'margin: 0;' }, '这是一段普通文本，用于展示 Text 组件的样式效果。')
            ),
            h(CodeBlock, { lang: 'tsx', code: "Heading({ level: 'h1' }, 'Title')\nText({ muted: true }, 'Secondary text')" })
        ),

        // Data display
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, '数据展示'),
            h('p', { style: 'font-size: 14px; color: #6b7280; margin: 0 0 24px 0;' }, 'Card, Badge, Avatar, Stat, Table, EmptyState'),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'Card + Badge + Avatar'),
                Card({ style: 'padding: 20px;' },
                    h('div', { style: 'display: flex; align-items: center; gap: 12px;' },
                        Avatar({ name: 'User', size: 'md', color: '#3b82f6' }),
                        h('div', {},
                            h('div', { style: 'font-weight: 600; color: #111827;' }, '张三'),
                            h('div', { style: 'font-size: 13px; color: #6b7280;' }, '工程师')
                        ),
                        Badge({ variant: 'success' }, '在线'),
                        Badge({ variant: 'warning' }, 'VIP')
                    )
                )
            ),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'Stat'),
                h('div', { style: 'display: flex; gap: 24px;' },
                    Stat({ label: '用户数', value: '12,345', accent: '#22c55e' }),
                    Stat({ label: '收入', value: '¥98,765', accent: '#f59e0b' })
                )
            ),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'EmptyState'),
                EmptyState({},
                    h('div', { style: 'font-size: 32px; margin-bottom: 12px;' }, '📭'),
                    h('div', { style: 'font-size: 16px; font-weight: 600; color: #6b7280; margin-bottom: 4px;' }, '暂无数据'),
                    h('div', { style: 'font-size: 14px; color: #9ca3af;' }, '当前没有可用的数据')
                )
            )
        ),

        // Form
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, '表单组件'),
            h('p', { style: 'font-size: 14px; color: #6b7280; margin: 0 0 24px 0;' }, 'Button, Input, Textarea, SearchInput, Checkbox, Select'),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'Button'),
                h('div', { style: 'display: flex; gap: 8px; flex-wrap: wrap;' },
                    Button({ variant: 'primary' }, 'Primary'),
                    Button({ variant: 'secondary' }, 'Secondary'),
                    Button({ variant: 'danger' }, 'Danger'),
                    Button({ variant: 'ghost' }, 'Ghost'),
                    Button({ disabled: true }, 'Disabled')
                )
            ),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'Input & SearchInput'),
                Input({ placeholder: '请输入内容...' }),
                h('div', { style: 'margin-top: 8px;' }),
                SearchInput({ placeholder: '搜索...' })
            ),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'Textarea'),
                Textarea({ placeholder: '请输入多行内容...', rows: '3' })
            ),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'Checkbox'),
                Checkbox({ label: '我已阅读并同意' })
            )
        ),

        // Feedback
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, '反馈组件'),
            h('p', { style: 'font-size: 14px; color: #6b7280; margin: 0 0 24px 0;' }, 'Modal, showToast, Tooltip'),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'display: flex; gap: 8px;' },
                    Button({ variant: 'primary', onClick: function() { showModal.set(true); } }, '打开 Modal'),
                    Button({ variant: 'secondary', onClick: function() { showToast('操作成功！'); } }, '显示 Toast')
                ),
                // Modal renders conditionally based on showModal signal
                h(Modal, { open: showModal.get(), onClose: function() { showModal.set(false); } },
                    h('h2', {}, '弹窗标题'),
                    h('p', { style: 'margin-top: 8px;' }, '这是一个 Modal 弹窗示例')
                )
            ),
            h(CodeBlock, { lang: 'tsx', code: "Modal({ open: isOpen, onClose: () => setIsOpen(false) },\n  h('h2', {}, 'Title'),\n  h('p', {}, 'Content')\n)\n\nshowToast('Success!')" })
        ),

        // Navigation
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, '导航组件'),
            h('p', { style: 'font-size: 14px; color: #6b7280; margin: 0 0 24px 0;' }, 'Tabs, Pagination'),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'Tabs'),
                Tabs({ tabs: [
                    { label: '标签一', content: h('div', {}, '标签一内容') },
                    { label: '标签二', content: h('div', {}, '标签二内容') },
                    { label: '标签三', content: h('div', {}, '标签三内容') }
                ], active: 0 })
            ),
            h('div', { style: 'padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;' }, 'Pagination'),
                Pagination({ page: 2, total: 10 })
            )
        ),
    );
});
