# Sigil

> A UI framework designed for AI agents. TSX compilation + signal-based reactivity + inline UI components, zero configuration.

**[📖 Full Documentation Site](http://localhost:3000)** — built with Sigil itself. See the [framework comparison](http://localhost:3000/#comparison) for side-by-side code comparisons with React and Vue.

[中文文档](#sigil-中文)

---

## Why Sigil exists

AI agents writing frontend code face four fundamental friction points. Sigil was designed from the ground up to eliminate them.

### 1. Hooks and closures

React requires understanding closure capture timing and dependency arrays. Vue avoids closures but introduces template syntax and reactivity proxy semantics. Both require mental models that don't map well to how LLMs process code.

```tsx
// React — stale closure trap
const [count, setCount] = useState(0);
useEffect(() => {
  const timer = setInterval(() => console.log(count), 1000); // always 0
  return () => clearInterval(timer);
}, []);

// Vue 3 — reactive proxy abstraction
const count = ref(0);
watch(count, (val) => console.log(val)); // needs to understand .value
```

```tsx
// Sigil — explicit, no closures, no proxies
const count = signal(0);
effect(() => console.log(count.get())); // always current value
```

**Sigil's answer**: Three primitives — `signal`, `computed`, `effect`. No hooks, no dependency arrays, no closure traps, no proxy magic. Read with `.get()`, write with `.set()`.

### 2. Virtual DOM reconciliation

Both React and Vue rely on virtual DOM diffing — a black box where keys matter and reconciliation strategy is framework-internal. Sigil operates directly on real DOM nodes.

### 3. Build chain complexity

A typical React/Vue project needs a bundler config, TypeScript setup, CSS pipeline, and a dozen plugins. AI-generated configurations frequently conflict.

**Sigil's answer**: Built-in SWC compiler. Zero config. One command:

```bash
sig serve --port 3000
```

### 4. Deep API surfaces

Importing from multiple packages to render a simple UI increases the chance of picking the wrong API.

**Sigil's answer**: 28 UI components from a single `/@ui` import. Zero external CSS files — styles injected inline at runtime.

## Quick start

### Build from source

```bash
git clone https://github.com/DreamSailing/sigil
cd sigil
cargo build --release
```

### Create a project

```bash
mkdir my-app && cd my-app
mkdir src
```

### Write your first component

**`src/main.tsx`**

```tsx
import { signal, defineComponent, h } from '/@runtime';
import { Button, Heading, Text, Stack } from '/@ui';

const App = defineComponent(() => {
  const count = signal(0);

  return () => h(Stack, { gap: '16px', style: 'padding: 40px;' },
    h(Heading, { level: 'h1' }, 'Hello Sigil!'),
    h(Text, {}, 'Count: ' + count.get()),
    h(Button, {
      variant: 'primary',
      onClick: () => count.set(count.get() + 1),
    }, 'Increment')
  );
});

document.body.appendChild(App());
```

### Start the dev server

```bash
sig serve --port 3000
```

### Production build

```bash
sig build --output dist
```

## Core concepts

| Concept | Description |
|---------|-------------|
| `signal<T>(initial)` | Reactive state. `.get()` reads, `.set(value)` writes |
| `computed<T>(getter)` | Derived value with automatic dependency tracking |
| `effect(fn)` | Side effect with auto-tracking, returns dispose function |
| `defineComponent(fn)` | Define a reactive component |
| `onMount(fn)` | Register mount callback inside component |
| `onUnmount(fn)` | Register unmount callback inside component |
| `h(tag, props?, ...children)` | Create DOM element or call component |

Full API reference: [Documentation Site](http://localhost:3000/#api)

## SigUI

28 built-in components, zero external CSS files:

| Category | Components |
|----------|-----------|
| Layout | Container, Flex, Grid, Stack, Divider |
| Typography | Heading, Text |
| Data | Card, Badge, Avatar, Stat, Table, TableHeader, TableBody, TableRow, EmptyState |
| Form | Button, Input, Textarea, SearchInput, Checkbox, Select |
| Feedback | Modal, showToast, Tooltip |
| Navigation | Tabs, Pagination |
| Other | Separator |

## Architecture

```
sigil/
├── src/
│   ├── main.rs           # CLI (new, serve, build)
│   ├── server.rs         # Axum + SSE live reload
│   ├── compiler.rs       # SWC compilation + import analysis
│   ├── visitor.rs        # JSX → h() transformation
│   └── builder.rs        # Production build
├── runtime/
│   ├── runtime.js        # signal/computed/effect/h/diff
│   ├── ui.js             # SigUI — 28 components
│   └── types.d.ts        # TypeScript declarations
├── demo-project/         # Demo application
├── docs-site/            # Documentation website (built with Sigil)
├── Cargo.toml
└── LICENSE
```

## Framework comparison

For detailed side-by-side code comparisons with React and Vue, see the [Comparison page](http://localhost:3000/#comparison) on the documentation site.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. By contributing, you agree that your contributions will be licensed under the MIT License.

## License

MIT License, Copyright (c) 2026 DreamSailing

---

# Sigil 中文

> 专为 AI Agent 设计的前端框架。TSX 编译 + 信号响应式 + 内联 UI 组件，零配置启动。

**[📖 完整文档网站](http://localhost:3000)** — 本框架自身构建，包含详细的 [框架对比](http://localhost:3000/#comparison)。

## 为什么需要 Sigil

AI Agent 编写前端代码时面临四个核心痛点。

### 痛点一：Hooks 和闭包

React 需要理解闭包捕获时机和依赖数组，Vue 引入了响应式代理的抽象概念。两者都需要 LLM 不擅长的心智模型。

**Sigil 的答案**：只有 `signal`、`computed`、`effect` 三个原语。无 hooks，无依赖数组，无闭包陷阱，无代理魔法。

### 痛点二：虚拟 DOM

React 和 Vue 都依赖虚拟 DOM diff，这是一个黑盒。Sigil 直接操作真实 DOM。

### 痛点三：构建链复杂

**Sigil 的答案**：内置 SWC 编译器，零配置。

```bash
sig serve --port 3000
```

### 痛点四：API 层次过深

**Sigil 的答案**：28 个组件从单一 `/@ui` 导入，零外部 CSS 文件，样式内联注入。

## 快速开始

```bash
git clone https://github.com/DreamSailing/sigil
cd sigil
cargo build --release

mkdir my-app && cd my-app && mkdir src
sig serve --port 3000
```

## 核心概念

| 概念 | 说明 |
|------|------|
| **signal** | 最小响应式状态，`.get()` 读取，`.set()` 写入 |
| **computed** | 派生值，自动追踪依赖 |
| **effect** | 副作用，自动追踪 signal 依赖 |
| **defineComponent** | 定义响应式组件 |
| **onMount** | 组件挂载回调 |
| **onUnmount** | 组件卸载回调 |
| **h()** | 创建 DOM 元素 |

## SigUI 组件库

28 个组件，零外部 CSS 文件：Container, Flex, Grid, Stack, Heading, Text, Card, Badge, Avatar, Stat, Table, TableHeader, TableBody, TableRow, Checkbox, Divider, EmptyState, SearchInput, Modal, showToast, Tooltip, Tabs, Select, Pagination, Separator

## 贡献

欢迎贡献！请随时提交 Pull Request。贡献的内容将以 MIT 许可证授权。

## 许可证

MIT License, Copyright (c) 2026 DreamSailing
