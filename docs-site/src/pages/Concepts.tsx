// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

import { CodeBlock, ApiTable } from '../components/Widgets.tsx';

export const ConceptsPage = defineComponent(() => {
    const demoCount = signal(0);

    return () => h('div', { style: 'max-width: 800px; padding: 32px 0;' },
        h('h1', { style: 'font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 8px 0;' }, '💡 核心概念'),
        h('p', { style: 'font-size: 16px; color: #6b7280; margin: 0 0 48px 0; line-height: 1.6;' },
            '理解 AI-Native 框架的四个核心原语'
        ),

        // Signal
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'Signal（信号）'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0; line-height: 1.6;' },
                'Signal 是最小的响应式状态单元。创建一个 signal，通过 .get() 读取值，通过 .set() 更新值。当 signal 的值改变时，所有依赖它的 effect 会自动重新执行。'
            ),
            h(CodeBlock, {
                lang: 'tsx',
                code: [
                    'const count = signal(0)\n',
                    'console.log(count.get()) // 0\n',
                    'count.set(1)\n',
                    'console.log(count.get()) // 1'
                ].join('')
            }),
            // Live demo
            h('div', { style: 'margin-top: 24px; padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;' },
                h('div', { style: 'font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;' }, '实时演示'),
                h('div', { style: 'display: flex; align-items: center; gap: 16px;' },
                    h('button', {
                        style: 'padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;',
                        onClick: function() { demoCount.set(demoCount.get() + 1); }
                    }, '+ Increment'),
                    h('span', { style: 'font-size: 24px; font-weight: 700; color: #111827; min-width: 30px; text-align: center;' }, demoCount.get()),
                    h('button', {
                        style: 'padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;',
                        onClick: function() { demoCount.set(demoCount.get() - 1); }
                    }, '- Decrement')
                )
            )
        ),

        // Computed
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'Computed（计算值）'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0; line-height: 1.6;' },
                'Computed 是基于其他 signal 自动计算的派生值。它会追踪所有依赖的 signal，当任何一个依赖改变时，重新计算并更新。带有值变化检测，避免不必要的连锁更新。'
            ),
            h(CodeBlock, {
                lang: 'tsx',
                code: [
                    'const firstName = signal("张")\n',
                    'const lastName = signal("三")\n',
                    'const fullName = computed(() => \n',
                    '  firstName.get() + lastName.get()\n',
                    ')\n\n',
                    'console.log(fullName.get()) // "张三"\n',
                    'firstName.set("李")\n',
                    'console.log(fullName.get()) // "李三"'
                ].join('')
            })
        ),

        // Effect
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'Effect（副作用）'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0; line-height: 1.6;' },
                'Effect 用于执行有副作用的操作，比如 DOM 更新、日志记录、网络请求等。它会自动追踪在 effect 函数内调用的 signal.get()，建立依赖关系。当依赖的信号变化时，effect 重新执行。支持清理函数。'
            ),
            h(CodeBlock, {
                lang: 'tsx',
                code: [
                    'const count = signal(0)\n\n',
                    '// 自动追踪 count\n',
                    'effect(() => {\n',
                    '  console.log("Count changed:", count.get())\n',
                    '  // 可选：返回清理函数\n',
                    '  return () => console.log("cleanup")\n',
                    '})\n\n',
                    'count.set(1) // 触发 effect 重新执行'
                ].join('')
            })
        ),

        // defineComponent
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'defineComponent（组件定义）'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0; line-height: 1.6;' },
                'defineComponent 是创建响应式组件的标准方式。它确保 signal 实例只创建一次，并将渲染函数包裹在 effect 中实现自动更新。组件返回一个 DOM 元素，可以直接 append 到页面。'
            ),
            h(CodeBlock, {
                lang: 'tsx',
                code: [
                    'const Counter = defineComponent(() => {\n',
                    '  const count = signal(0)\n\n',
                    '  return () => h("div", {},\n',
                    '    h("span", {}, count.get()),\n',
                    '    h("button", {\n',
                    '      onClick: () => count.set(count.get() + 1)\n',
                    '    }, "+")\n',
                    '  )\n',
                    '})\n\n',
                    '// 渲染到页面\n',
                    'document.body.appendChild(Counter())'
                ].join('')
            })
        ),

        // h() HyperScript
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'h() HyperScript'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0; line-height: 1.6;' },
                'h() 是创建 DOM 元素的核心函数，类似 React.createElement。它接收标签名、props 对象和子节点。支持事件绑定、响应式属性和 style 对象。'
            ),
            h(CodeBlock, {
                lang: 'tsx',
                code: [
                    '// 基本用法\n',
                    'h("div", { className: "container" },\n',
                    '  h("h1", {}, "Hello"),\n',
                    '  h("p", {}, "World")\n',
                    ')\n\n',
                    '// 事件绑定\n',
                    'h("button", { onClick: () => doSomething() }, "Click")\n\n',
                    '// 响应式属性\n',
                    'h("div", { class: activeClass }, ...)\n\n',
                    '// 组件调用\n',
                    'h(Button, { variant: "primary" }, "Submit")'
                ].join('')
            })
        ),

        // Fragment
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'Fragment'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 16px 0; line-height: 1.6;' },
                'Fragment 允许你在不创建额外 DOM 节点的情况下组合多个子元素。'
            ),
            h(CodeBlock, {
                lang: 'tsx',
                code: [
                    'h(Fragment, {},\n',
                    '  h("li", {}, "Item 1"),\n',
                    '  h("li", {}, "Item 2"),\n',
                    '  h("li", {}, "Item 3")\n',
                    ')'
                ].join('')
            })
        ),
    );
});
