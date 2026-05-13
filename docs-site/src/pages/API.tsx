// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

import { ApiTable, CodeBlock } from '../components/Widgets.tsx';

export const ApiPage = defineComponent(() => {
    return () => h('div', { style: 'max-width: 800px; padding: 32px 0;' },
        h('h1', { style: 'font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 8px 0;' }, '📖 API 参考'),
        h('p', { style: 'font-size: 16px; color: #6b7280; margin: 0 0 48px 0; line-height: 1.6;' },
            'AI-Native 框架完整 API 文档'
        ),

        // signal
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'signal'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0;' }, '创建响应式状态信号' ),
            h(CodeBlock, { lang: 'typescript', code: 'function signal<T>(initialValue: T): Signal<T>' }),
            h(ApiTable, { items: [
                { name: 'initialValue', type: 'T', description: '信号的初始值' },
            ]}),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 16px 0 8px 0;' }, '返回值：'),
            h(ApiTable, { items: [
                { name: '.get()', type: '() => T', description: '读取信号当前值，自动追踪依赖' },
                { name: '.set(value)', type: '(value: T) => void', description: '设置新值，触发订阅者更新' },
            ]}),
        ),

        // computed
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'computed'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0;' }, '创建计算属性，自动追踪依赖并在变化时更新' ),
            h(CodeBlock, { lang: 'typescript', code: 'function computed<T>(getter: () => T): Computed<T>' }),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 16px 0 8px 0;' }, '返回值：'),
            h(ApiTable, { items: [
                { name: '.get()', type: '() => T', description: '读取计算值，自动追踪依赖' },
            ]}),
        ),

        // effect
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'effect'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0;' }, '创建副作用函数，自动追踪 signal 依赖' ),
            h(CodeBlock, { lang: 'typescript', code: 'function effect(fn: (onCleanup: (fn: () => void)) => void | (() => void)): () => void' }),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 16px 0 8px 0;' }, '参数：'),
            h(ApiTable, { items: [
                { name: 'fn', type: 'Function', description: '副作用函数，可返回清理函数' },
            ]}),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 16px 0 8px 0;' }, '返回值：'),
            h(ApiTable, { items: [
                { name: 'dispose', type: '() => void', description: '手动销毁 effect 的函数' },
            ]}),
        ),

        // defineComponent
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'defineComponent'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0;' }, '定义响应式组件' ),
            h(CodeBlock, { lang: 'typescript', code: 'function defineComponent<P>(fn: (props: P) => () => HTMLElement): (props: P) => HTMLElement' }),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 16px 0 8px 0;' }, '说明：' ),
            h('ul', { style: 'font-size: 15px; color: #4b5563; line-height: 1.8; padding-left: 20px;' },
                h('li', {}, 'componentFn 只在组件创建时调用一次，用于初始化 signal'),
                h('li', {}, '返回的 render 函数会被 effect 包裹，自动更新'),
                h('li', {}, '组件卸载时自动清理 effect'),
            ),
        ),

        // h
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'h (HyperScript)'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0;' }, '创建 DOM 元素' ),
            h(CodeBlock, { lang: 'typescript', code: 'function h(tag: string | Function, props?: object, ...children: any[]): HTMLElement' }),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 16px 0 8px 0;' }, 'Props 支持：'),
            h(ApiTable, { items: [
                { name: 'className/class', type: 'string | object', description: 'CSS 类名，支持对象形式' },
                { name: 'style', type: 'string | object', description: '内联样式，支持对象形式' },
                { name: 'onXxx', type: 'Function', description: '事件处理器，如 onClick, onInput' },
                { name: 'data-*', type: 'string', description: '数据属性' },
            ]}),
        ),

        // Fragment
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'Fragment'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0;' }, '不创建额外 DOM 节点的包裹器' ),
            h(CodeBlock, { lang: 'typescript', code: 'function Fragment(props?: { children?: any[] }): HTMLElement' }),
        ),

        // errorBoundary
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'errorBoundary'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0;' }, '错误边界包装器，捕获组件渲染错误' ),
            h(CodeBlock, { lang: 'typescript', code: 'function errorBoundary(fn: Function): Function' }),
        ),
    );
});
