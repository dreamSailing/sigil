# Migration Policy

Sigil 当前仍处于早期版本，但从本轮开始采用明确的 API 分级和迁移策略，避免“暗中兼容”或“无提示破坏”。

## 分级规则

- `stable`: 默认长期支持，允许修 bug，但不允许无迁移路径的破坏式改动
- `beta`: 可用，但在小版本内仍可能调整
- `compat`: 为迁移存在，不作为新代码推荐路径
- `experimental`: 默认不承诺长期稳定

## 迁移约束

- 新公开 API 先进入 registry，并标明 stability
- 从 `stable` 移除能力前，至少先经历：
  - 文档标记
  - CHANGELOG 说明
  - AI_GUIDE 更新
  - 至少一个版本窗口的替代方案
- `compat` API 后续若要移除，必须先提供 stable 替代写法

## 当前建议

- 新代码统一显式从 `'/@runtime'` / `'/@ui'` 导入
- 新代码不要默认使用 `watch`, `watchEffect`, `ref`, `toRefs`
- experimental UI 组件不要进入 README、脚手架模板和主文档默认示例

## 本轮迁移说明

- `sig new` 现在会生成本地 `sigil-env.d.ts`，不再依赖源码仓库中的相对路径类型声明
- docs/README 的项目创建方式统一为 `sig new my-app`
- docs-site、compiler 的公开 contract 由 `metadata/contracts.json` 生成
