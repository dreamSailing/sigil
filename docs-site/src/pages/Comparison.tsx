// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

import { CodeBlock } from '../components/Widgets.tsx';

// AI difficulty annotations for each comparison
function PainPointBadge(props) {
    var severity = props.severity || 'medium';
    var colors = {
        high: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', label: 'AI 高风险' },
        medium: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', label: 'AI 中风险' },
        low: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', label: 'AI 低风险' }
    };
    var c = colors[severity] || colors.medium;
    return h('span', { style: 'display: inline-block; padding: 3px 10px; background: ' + c.bg + '; border: 1px solid ' + c.border + '; border-radius: 12px; font-size: 12px; color: ' + c.text + '; font-weight: 500;' }, c.label);
}

function PainTitle(color, text) {
    return h('div', { style: 'font-size: 15px; font-weight: 600; color: ' + color + '; margin-bottom: 8px;' }, text);
}

export const ComparisonPage = defineComponent(() => {
    return () => h('div', { style: 'max-width: 1000px; padding: 32px 0;' },
        h('h1', { style: 'font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 8px 0;' }, '⚖️ 为什么传统框架不适合 AI Agent'),
        h('p', { style: 'font-size: 16px; color: #6b7280; margin: 0 0 16px 0; line-height: 1.6;' },
            'React 和 Vue 是为人类开发者设计的——它们有隐式规则、心智模型和约定俗成的陷阱。这些对人类来说可以通过学习和经验克服，但对 AI Agent 来说却是系统性的障碍。'
        ),
        h('div', { style: 'padding: 20px 24px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin: 0 0 16px 0; font-size: 14px; color: #1e40af; line-height: 1.6;' },
            '📌 本文档网站本身就是用 Sigil 框架开发的。你看到的每一页、每个交互、每次页面切换都在运行 Sigil 的信号响应式系统。'
        ),
        h('div', { style: 'padding: 20px 24px; background: #fefce8; border: 1px solid #fde047; border-radius: 8px; margin: 0 0 48px 0; font-size: 14px; color: #854d0e; line-height: 1.6;' },
            '💡 以下对比从 AI Agent 的视角出发——不是比较哪个框架更好，而是分析哪个框架更容易被 AI 正确使用。'
        ),

        // === Pain point 1: State management ===
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, '1. 状态管理 — 闭包 vs 显式读写'),

            h('div', { style: 'margin-bottom: 24px; padding: 16px 20px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0;' },
                PainTitle('#991b1b', '🔴 为什么 React/Vue 对 AI 不友好'),
                h('ul', { style: 'font-size: 14px; color: #7f1d1d; line-height: 2; padding-left: 20px;' },
                    h('li', {}, 'React 的闭包捕获时机是反直觉的——代码中看到的变量值和实际运行时读取的值可能不同'),
                    h('li', {}, 'AI 生成的 setInterval、event handler 经常因为 stale closure 而读取旧值'),
                    h('li', {}, 'useCallback/useMemo 的依赖数组需要手动维护，漏一个就是 bug，AI 很难判断这个变量到底要不要加进去'),
                    h('li', {}, 'Vue 的响应式代理 .value 是运行时魔法——AI 需要知道什么时候该用 .value，什么时候不需要，但规则不统一')
                )
            ),

            h('div', { style: 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;' },
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #61dafb;' }, 'React'),
                        h(PainPointBadge, { severity: 'high' })
                    ),
                    h(CodeBlock, { lang: 'tsx', code: [
                        '// AI 常犯的错误：stale closure',
                        'const [count, setCount] = useState(0);',
                        '',
                        'useEffect(() => {',
                        '  const timer = setInterval(() => {',
                        '    console.log(count);',
                        '    // ❌ 永远是 0！',
                        '    // 闭包捕获了初始值',
                        '    setCount(count + 1);',
                        '    // ❌ 死循环或不变',
                        '  }, 1000);',
                        '  return () => clearInterval(timer);',
                        '}, []); // 空依赖数组',
                        '',
                        '// 正确做法（AI 很难自己想出来）：',
                        'setCount(prev => prev + 1);',
                        'const double = useMemo(',
                        '  () => count * 2, [count]',
                        '//              ^^^ 依赖数组'
                    ].join('\n') })
                ),
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #42b883;' }, 'Vue 3'),
                        h(PainPointBadge, { severity: 'medium' })
                    ),
                    h(CodeBlock, { lang: 'tsx', code: [
                        '<script setup>',
                        'const count = ref(0);',
                        '',
                        '// .value 什么时候加？',
                        '// 在 JS 中：count.value',
                        '// 在模板中：{{ count }}',
                        '// 规则不统一',
                        'const double = computed(',
                        '  () => count.value * 2',
                        '//        ^^^^^^^^ 需要加',
                        ');',
                        '',
                        'watch(count, (val) => {',
                        '  // val 是 newValue',
                        '  console.log(val);',
                        '});',
                        '</script>',
                        '',
                        '<template>',
                        '  <button @click="count++">',
                        '    {{ count }} {{ double }}',
                        '  </button>',
                        '</template>'
                    ].join('\n') })
                ),
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #3b82f6;' }, 'Sigil'),
                        h(PainPointBadge, { severity: 'low' })
                    ),
                    h(CodeBlock, { lang: 'tsx', code: [
                        '// 显式 .get() / .set()',
                        '// 没有闭包，没有捕获时机问题',
                        'const count = signal(0);',
                        '',
                        'const timer = setInterval(() => {',
                        '  console.log(count.get());',
                        '  // ✅ 永远是当前值',
                        '  count.set(count.get() + 1);',
                        '  // ✅ 直接读直接写',
                        '}, 1000);',
                        '',
                        '// 计算值自动追踪',
                        'const double = computed(',
                        '  () => count.get() * 2',
                        '//          ^^^^^^^^ 调用 .get()',
                        '//          自动建立依赖关系',
                        ');'
                    ].join('\n') })
                )
            ),

            h('div', { style: 'padding: 12px 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 14px; color: #166534; line-height: 1.6;' },
                h('b', {}, '✅ Sigil 的答案：'),
                ' 没有闭包捕获。每次读取都是 .get()，拿到的是当前值。AI 不需要推理这个变量什么时候被捕获的。'
            )
        ),

        // === Pain point 2: Side effects ===
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, '2. 副作用 — 依赖数组 vs 自动追踪'),

            h('div', { style: 'margin-bottom: 24px; padding: 16px 20px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0;' },
                PainTitle('#991b1b', '🔴 为什么 React/Vue 对 AI 不友好'),
                h('ul', { style: 'font-size: 14px; color: #7f1d1d; line-height: 2; padding-left: 20px;' },
                    h('li', {}, 'useEffect 的依赖数组是手动声明的——AI 很难准确判断哪些变量是依赖，哪些不是'),
                    h('li', {}, '漏加依赖 = 状态不同步，多加依赖 = 无限循环，两种都是常见 AI 错误'),
                    h('li', {}, 'React 的 ESLint 规则 react-hooks/exhaustive-deps 是事后补救，但 AI 生成的代码经常触发或误触发'),
                    h('li', {}, 'Vue 的 watch 需要手动列出依赖源，watchEffect 自动追踪但有边界情况')
                )
            ),

            h('div', { style: 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;' },
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #61dafb;' }, 'React'),
                        h(PainPointBadge, { severity: 'high' })
                    ),
                    h(CodeBlock, { lang: 'tsx', code: [
                        '// AI 经常写错的依赖数组',
                        'useEffect(() => {',
                        '  fetchData(userId);',
                        '}, []);',
                        '// ❌ 漏了 userId',
                        '// 用户切换时不会重新请求',
                        '',
                        '// 或者写对了但不知道',
                        '// 为什么加了这个变量',
                        'useEffect(() => {',
                        '  fetchData(userId);',
                        '}, [userId, data, props]);',
                        '// ❌ 多加了 data 和 props',
                        '// 可能导致无限循环',
                        '',
                        '// 清理函数的时机也不直观',
                        'useEffect(() => {',
                        '  const sub = store.subscribe(',
                        '    () => setState(store.get())',
                        '  );',
                        '  return () => sub.unsubscribe();',
                        '}, [store]);',
                        '// store 每次重新创建 = 重复订阅'
                    ].join('\n') })
                ),
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #42b883;' }, 'Vue 3'),
                        h(PainPointBadge, { severity: 'medium' })
                    ),
                    h(CodeBlock, { lang: 'tsx', code: [
                        '// watch 需要手动声明依赖',
                        'watch(userId, (id) => {',
                        '  fetchData(id);',
                        '});',
                        '// ✅ 但需要知道用 watch',
                        '// 而不是 watchEffect',
                        '',
                        '// watchEffect 自动追踪',
                        'watchEffect(() => {',
                        '  fetchData(userId.value);',
                        '});',
                        '// ✅ 但异步操作内部',
                        '// 的依赖不会被追踪',
                        '',
                        '// 生命周期混在一起',
                        'onMounted(() => {});',
                        'onUnmounted(() => {});'
                    ].join('\n') })
                ),
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #3b82f6;' }, 'Sigil'),
                        h(PainPointBadge, { severity: 'low' })
                    ),
                    h(CodeBlock, { lang: 'tsx', code: [
                        '// 自动追踪——不需要依赖数组',
                        'effect(() => {',
                        '  fetchData(userId.get());',
                        '  // ✅ userId.get() 被调用',
                        '  // userId 变化 → 自动重新执行',
                        '});',
                        '',
                        '// 更复杂的场景也自动追踪',
                        'effect(() => {',
                        '  const data = store.get();',
                        '  if (data.ready) {',
                        '    console.log(data.value);',
                        '  }',
                        '  // ✅ store 和 data.ready',
                        '  // 变化都会触发重新执行',
                        '});',
                        '',
                        '// 清理函数作为返回值',
                        'effect(() => {',
                        '  const sub = store.subscribe(',
                        '    () => state.set(store.get())',
                        '  );',
                        '  return () => sub.unsubscribe();',
                        '  // ✅ 每次重新执行前',
                        '  // 自动调用清理函数',
                        '});'
                    ].join('\n') })
                )
            ),

            h('div', { style: 'padding: 12px 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 14px; color: #166534; line-height: 1.6;' },
                h('b', {}, '✅ Sigil 的答案：'),
                ' 没有依赖数组。在 effect 内部调用 .get() 就建立了依赖关系，变化时自动重新执行。AI 只需要写出做什么，不需要声明依赖谁。'
            )
        ),

        // === Pain point 3: Build chain ===
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, '3. 构建配置 — 配置地狱 vs 零配置'),

            h('div', { style: 'margin-bottom: 24px; padding: 16px 20px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;' },
                PainTitle('#92400e', '🟡 为什么构建配置对 AI 不友好'),
                h('ul', { style: 'font-size: 14px; color: #78350f; line-height: 2; padding-left: 20px;' },
                    h('li', {}, 'AI 生成的 vite.config.ts / webpack.config.js 经常有版本冲突'),
                    h('li', {}, 'tsconfig.json 的 moduleResolution、jsx、paths 配置组合复杂，AI 经常配错'),
                    h('li', {}, 'CSS 方案选择需要配套配置，AI 容易混搭导致冲突'),
                    h('li', {}, 'ESLint + Prettier + TypeScript 三者规则冲突时，AI 很难判断正确配置')
                )
            ),

            h('div', { style: 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;' },
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #61dafb;' }, 'React'),
                        h(PainPointBadge, { severity: 'high' })
                    ),
                    h(CodeBlock, { lang: 'text', code: [
                        '// 需要的配置文件：',
                        'package.json        // 依赖管理',
                        'vite.config.ts      // 构建配置',
                        'tsconfig.json       // TypeScript',
                        'tsconfig.node.json  // TS node 配置',
                        '.eslintrc.js        // 代码检查',
                        'postcss.config.js   // CSS 后处理',
                        'tailwind.config.js  // 样式配置',
                        '',
                        '// 还需要安装的包：',
                        'vite, react, react-dom',
                        '@vitejs/plugin-react',
                        'typescript, @types/react',
                        'eslint, eslint-plugin-react',
                        'tailwindcss, postcss',
                        '',
                        '// 任何一个版本不兼容都会报错'
                    ].join('\n') })
                ),
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #42b883;' }, 'Vue'),
                        h(PainPointBadge, { severity: 'medium' })
                    ),
                    h(CodeBlock, { lang: 'text', code: [
                        '// 需要的配置文件：',
                        'package.json',
                        'vite.config.ts',
                        'tsconfig.json',
                        '.eslintrc.js',
                        '',
                        '// 需要安装的包：',
                        'vite, vue, @vitejs/plugin-vue',
                        'typescript, @types/node',
                        'eslint, eslint-plugin-vue',
                        '',
                        '// 比 React 少一些，但仍然',
                        '// 需要理解配置之间的关联'
                    ].join('\n') })
                ),
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #3b82f6;' }, 'Sigil'),
                        h(PainPointBadge, { severity: 'low' })
                    ),
                    h(CodeBlock, { lang: 'text', code: [
                        '// 零配置文件',
                        '',
                        '// 不需要 vite.config.ts',
                        '// 不需要 tsconfig.json',
                        '// 不需要 package.json',
                        '// 不需要 .eslintrc',
                        '',
                        'mkdir my-app && cd my-app',
                        'mkdir src',
                        '// 写代码...',
                        'sig serve --port 3000',
                        '',
                        '// TSX 编译、热重载、',
                        '// 实时刷新、类型剥离',
                        '// 全部内置，开箱即用'
                    ].join('\n') })
                )
            )
        ),

        // === Pain point 4: Component API ===
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, '4. 组件 API — 深度嵌套 vs 扁平导入'),

            h('div', { style: 'margin-bottom: 24px; padding: 16px 20px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;' },
                PainTitle('#92400e', '🟡 为什么深层 API 对 AI 不友好'),
                h('ul', { style: 'font-size: 14px; color: #78350f; line-height: 2; padding-left: 20px;' },
                    h('li', {}, 'AI 需要从大量子组件中挑选正确的（Button vs IconButton vs TextButton），选择空间越大出错概率越高'),
                    h('li', {}, '组件的 prop 命名不统一——有的用 size，有的用 variant，有的是 sm/md/lg'),
                    h('li', {}, 'CSS 方案与组件库绑定——MUI 的 sx prop、Ant Design 的 style 覆盖、Tailwind 的 className')
                )
            ),

            h('div', { style: 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;' },
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #61dafb;' }, 'React + MUI'),
                        h(PainPointBadge, { severity: 'medium' })
                    ),
                    h(CodeBlock, { lang: 'tsx', code: [
                        '// 5 个 import，来自同一个包',
                        'import {',
                        '  Button,',
                        '  Card,',
                        '  CardContent,',
                        '  Typography,',
                        '  ThemeProvider,',
                        '} from "@mui/material";',
                        '',
                        '// 还需要创建 theme',
                        'const theme = createTheme({',
                        '  palette: { primary: {} }',
                        '});',
                        '',
                        '// 使用 sx prop 写样式',
                        '<Button sx={{ m: 2 }}>Click</Button>'
                    ].join('\n') })
                ),
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #42b883;' }, 'Vue + Element Plus'),
                        h(PainPointBadge, { severity: 'medium' })
                    ),
                    h(CodeBlock, { lang: 'tsx', code: [
                        '// 3 个 import + CSS',
                        'import { ElButton, ElCard }',
                        '  from "element-plus";',
                        'import "element-plus/',
                        '  dist/index.css";',
                        '',
                        '// 需要全局注册或按需引入',
                        'app.use(ElementPlus);',
                        '',
                        '// 模板语法中的组件名',
                        '// 和 import 名不同',
                        '<el-button type="primary">',
                        '  Click',
                        '</el-button>'
                    ].join('\n') })
                ),
                h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
                    h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                        h('span', { style: 'font-size: 14px; font-weight: 600; color: #3b82f6;' }, 'Sigil + SigUI'),
                        h(PainPointBadge, { severity: 'low' })
                    ),
                    h(CodeBlock, { lang: 'tsx', code: [
                        '// 1 个 import，28 个组件全部可用',
                        'import {',
                        '  Button, Card, Heading,',
                        '  Text, Stack, Badge',
                        '} from "/@ui";',
                        '',
                        '// 纯内联样式，无 CSS 依赖',
                        'h(Stack, { gap: "16px" },',
                        '  h(Heading, { level: "h1" },',
                        '    "Hello")',
                        '  h(Button, {',
                        '    variant: "primary"',
                        '  }, "Click")',
                        ')'
                    ].join('\n') })
                )
            )
        ),

        // === Summary table ===
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'AI 友好度总览'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 24px 0; line-height: 1.6;' },
                '以下评估从 AI Agent 的视角出发——哪个框架更容易被 AI 正确使用、更少的运行时错误、更低的认知负担。'
            ),
            h('div', { style: 'border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;' },
                h('table', { style: 'width: 100%; border-collapse: collapse; font-size: 14px;' },
                    h('thead', {},
                        h('tr', { style: 'background: #f9fafb;' },
                            h('th', { style: 'padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; color: #374151;' }, '维度'),
                            h('th', { style: 'padding: 12px 16px; text-align: center; border-bottom: 1px solid #e5e7eb; color: #61dafb;' }, 'React'),
                            h('th', { style: 'padding: 12px 16px; text-align: center; border-bottom: 1px solid #e5e7eb; color: #42b883;' }, 'Vue 3'),
                            h('th', { style: 'padding: 12px 16px; text-align: center; border-bottom: 1px solid #e5e7eb; color: #3b82f6; background: #eff6ff;' }, 'Sigil')
                        )
                    ),
                    h('tbody', {},
                        ...[
                            ['闭包陷阱', '🔴 高 — useState + useEffect 闭包捕获反直觉', '🟡 中 — .value 规则在 JS/模板中不统一', '🟢 无 — .get()/.set() 显式读写'],
                            ['依赖追踪', '🔴 高 — 手动维护依赖数组，漏加/多加都出错', '🟡 中 — watchEffect 自动但边界情况多', '🟢 无脑 — 调用 .get() 自动建立依赖'],
                            ['虚拟 DOM', '🟡 中 — reconciliation 黑盒，key 策略难理解', '🟡 中 — 编译优化但运行时仍有抽象层', '🟢 透明 — 直接 DOM 操作'],
                            ['构建配置', '🔴 高 — 7+ 配置文件，版本冲突常见', '🟡 中 — 4+ 配置文件，仍有复杂度', '🟢 零 — 内置 SWC，一条命令'],
                            ['组件导入', '🟡 中 — 多包导入，样式方案绑定', '🟡 中 — 需要 CSS 文件 + 全局注册', '🟢 一 — 单路径 28 组件，样式内联注入'],
                            ['API 扁平度', '低 — hooks 规则多，心智模型复杂', '🟡 中 — 模板+脚本分离', '🟢 高 — 3 个原语 + h()'],
                            ['运行时错误', '常见 — stale closure, 无限重渲染', '偶尔 — .value 遗漏, 响应式丢失', '极少 — 显式读写，无魔法'],
                        ].map(function(row, i) {
                            return h('tr', { style: i % 2 === 0 ? 'background: white;' : 'background: #f9fafb;' },
                                h('td', { style: 'padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500; color: #111827;' }, row[0]),
                                h('td', { style: 'padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 13px;' }, row[1]),
                                h('td', { style: 'padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 13px;' }, row[2]),
                                h('td', { style: 'padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #1e40af; background: #eff6ff; font-weight: 500; font-size: 13px;' }, row[3])
                            );
                        })
                    )
                )
            )
        ),

        // === Design philosophy ===
        h('div', { style: 'margin-bottom: 64px;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 16px 0;' }, 'Sigil 的设计哲学'),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 24px 0; line-height: 1.8;' },
                '传统框架为人类设计，假设开发者有：多年经验、直觉判断力、对语言运行时机制的深刻理解、以及从错误中学习的能力。'
            ),
            h('p', { style: 'font-size: 15px; color: #4b5563; margin: 0 0 24px 0; line-height: 1.8;' },
                'AI Agent 没有这些——它有强大的代码生成能力，但缺乏对隐式规则的理解。Sigil 的每一个设计决策都围绕一个原则：'
            ),
            h('div', { style: 'padding: 24px; background: #0f172a; border-radius: 12px; text-align: center; margin: 24px 0;' },
                h('p', { style: 'font-size: 20px; font-weight: 700; color: #f8fafc; margin: 0; line-height: 1.6;' }, '让正确的代码成为唯一自然的写法'),
                h('p', { style: 'font-size: 14px; color: #94a3b8; margin: 8px 0 0 0;' }, 'Make the right way the only natural way')
            ),
            h('div', { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px;' },
                h('div', { style: 'padding: 20px; background: #fef2f2; border-radius: 8px;' },
                    h('h3', { style: 'font-size: 15px; font-weight: 600; color: #991b1b; margin: 0 0 8px 0;' }, '传统框架的假设'),
                    h('ul', { style: 'font-size: 13px; color: #7f1d1d; line-height: 1.8; padding-left: 16px; margin: 0;' },
                        h('li', {}, '开发者理解闭包捕获时机'),
                        h('li', {}, '开发者记得维护依赖数组'),
                        h('li', {}, '开发者能调试虚拟 DOM diff'),
                        h('li', {}, '开发者熟悉构建工具链'),
                        h('li', {}, '开发者能处理 CSS 作用域冲突')
                    )
                ),
                h('div', { style: 'padding: 20px; background: #f0fdf4; border-radius: 8px;' },
                    h('h3', { style: 'font-size: 15px; font-weight: 600; color: #166534; margin: 0 0 8px 0;' }, 'Sigil 的假设'),
                    h('ul', { style: 'font-size: 13px; color: #166534; line-height: 1.8; padding-left: 16px; margin: 0;' },
                        h('li', {}, '读写分离，无需理解闭包'),
                        h('li', {}, '自动追踪，无需维护依赖'),
                        h('li', {}, '直接 DOM，无需理解 diff'),
                        h('li', {}, '零配置，无需构建工具知识'),
                        h('li', {}, '内联样式，无需 CSS 知识')
                    )
                )
            )
        ),

        // Dogfood proof
        h('div', { style: 'margin-bottom: 64px; padding: 32px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; text-align: center;' },
            h('h2', { style: 'font-size: 22px; font-weight: 600; color: #166534; margin: 0 0 12px 0;' }, 'Dogfooding 证明'),
            h('p', { style: 'font-size: 15px; color: #166534; margin: 0 0 8px 0; line-height: 1.6;' },
                '你正在浏览的整个文档网站 —— 包括这个对比页面 —— 是用 Sigil 框架开发的。'
            ),
            h('p', { style: 'font-size: 15px; color: #166534; margin: 0 0 16px 0; line-height: 1.6;' },
                '侧边栏导航、页面切换、实时演示计数器、所有 UI 组件展示，全部运行在 Sigil 的信号响应式系统之上。'
            ),
            h('p', { style: 'font-size: 13px; color: #4ade80; margin: 0;' },
                '这就是 Eat Your Own Dog Food。'
            )
        ),
    );
});
