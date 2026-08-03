# AI Guide

Sigil 的目标不是“让 AI 也能凑合写前端”，而是让 AI 可以稳定生成、稳定调试、稳定扩展、稳定维护前端代码。

本文件面向长期维护 Sigil 的 AI Agent 和使用 Sigil 生成业务代码的 AI Agent。仓库内公开契约的唯一事实源是 `metadata/contracts.json`。

## 默认策略

- 先用 stable API，只有在需求明确需要时才使用 beta。
- compat API 仅用于迁移或适配现有心智模型，不应作为新代码默认写法。
- experimental API 不能作为脚手架模板、README 示例或 AI 默认输出。
- 所有业务代码默认显式从 `'/@runtime'` 和 `'/@ui'` 导入，不依赖全局注入心智模型。
- 状态更新优先 `signal().get()` / `signal().set()`，不要混用 `ref().value`。
- 新增或修改公开 API 时，先改 `metadata/contracts.json`，再运行 `node ./scripts/generate-contracts.mjs`。

## 推荐写法

- 状态管理：`signal`, `computed`, `effect`
- 组件定义：`defineComponent(() => { ...; return () => ... })`
- 生命周期：`onMount` / `onUnmount` 仅在 `defineComponent` 工厂内部使用
- 列表渲染：稳定项必须传 `key` 或 `data-key`
- 样式：优先组件 `style` 对象或简单字符串；共享样式再考虑 `createStyleSheet`
- 路由：`createRouter`, `Link`, `Navigate`, `useParams`, `useQuery`
- 表单：优先受控 `signal` + `Input` / `Textarea` / `Select`
- 异步：在 `effect()` 中读取依赖，在 cleanup 中清理订阅、定时器、监听器

## 禁止写法

- 在新代码中默认使用 `watch`, `watchEffect`, `ref`, `toRefs`
- 在 `effect()` 外依赖隐式更新语义
- 在组件列表中省略稳定 key
- 把 experimental UI 组件当成基础模板能力
- 在 README、docs-site、types、compiler 中手工复制导出清单
- 为了“兼容”吞掉错误或静默兜底

## API 分级

### Stable

- `signal`, `computed`, `effect`, `h`, `defineComponent`, `Fragment`, `reactiveTemplate`, `errorBoundary`
- `onMount`, `onUnmount`
- `createRouter`, `Link`, `Navigate`, `useParams`, `useQuery`
- 稳定 UI：`Container`, `Flex`, `Grid`, `Stack`, `Heading`, `Text`, `Card`, `Badge`, `Avatar`, `Stat`, `Table`, `TableHeader`, `TableBody`, `TableRow`, `EmptyState`, `Timeline`, `Button`, `Input`, `Textarea`, `SearchInput`, `Checkbox`, `Select`, `Modal`, `showToast`, `Tooltip`, `Alert`, `Progress`, `Skeleton`, `Tabs`, `Pagination`, `Breadcrumbs`, `Steps`, `Dropdown`, `Accordion`, `Separator`, `Divider`

### Beta

- `createI18n`, `useTranslation`, `Translate`
- `createStyleSheet`, `withScope`, `cssScoped`, `keyframes`
- `batch`

### Compat

- `watch`, `watchEffect`
- `ref`, `unref`, `toRef`, `toRefs`
- `memo`

### Experimental

- `debounce`, `throttle`, `deepClone`, `deepEqual`, `nextTick`, `clamp`, `range`, `uniqueId`, `createEventEmitter`, `createValidator`, `validators`
- `VirtualList`, `AutoComplete`, `ColorPicker`, `Rating`, `Tree`

## 组件范式

- 页面骨架：`Container` / `Stack` / `Flex`
- 数据卡片：`Card` + `Heading` + `Text` + `Stat`
- 表格：`Table` + `TableHeader` + `TableBody` + `TableRow`
- 表单：`Stack` 组织字段，状态保存在 `signal`
- 反馈：轻提示用 `showToast`，块级错误用 `Alert`，模态确认用 `Modal`

## 状态与副作用边界

- 初始化状态只放在 `defineComponent` 工厂中
- `effect()` 只做副作用，不返回 DOM
- cleanup 统一通过 `effect` 返回函数或 `onUnmount`
- `onMount` 适合 DOM 读取、事件订阅、启动定时器
- `onUnmount` 适合清理资源，不做新的状态写入

## 列表 / key / ref

- 任意可重排列表必须提供稳定 `key`
- `ref` 只用于拿到底层 DOM，不用于驱动主要状态流
- `Tree` 节点主键优先 `id`，兼容 `key`

## 异步 / 表单 / 路由 / 样式

- 异步加载：`effect(() => { dependency.get(); ... })`
- 表单校验：优先业务显式校验；`createValidator` 仍属 experimental
- 路由跳转：用户交互优先 `Link`，业务流程跳转用 `Navigate` 或 `router.navigate`
- 样式：先局部 `style`，再 `createStyleSheet`；不要引入外部 CSS 依赖作为默认方案

## 生成后自检

- 是否只使用 stable/beta API？
- 是否所有 effect 都有清晰依赖来源？
- 是否列表项有稳定 key？
- 是否文档、类型、实现、测试一起更新？
- 是否新公开能力已写入 `metadata/contracts.json` 并重新生成？
