# AI Friendly Roadmap

## 30 天

- 完成 contract registry 全面接线，让 compiler、types、docs-site、README 都引用同一事实源
- 把 server/compiler/CLI 错误统一到同一 schema
- 把 CI 固化为默认门禁：`cargo test`、`npm run ci`
- 让 README、Guide、Components、API 页面与当前实现一致

## 60 天

- 让 docs-site 的 API/组件页由 registry 自动生成更多内容，减少手写描述
- 为 runtime 关键错误路径补更多结构化错误码和回归测试
- 扩展 smoke tests 到 docs-site 更多交互页和 demo-project
- 增加 migration note 模板与 deprecation policy

## 90 天

- 引入更完整的错误码手册和分层诊断（compiler/runtime/router/io/internal）
- 建立版本化 API 分级与升级指南流程
- 扩大示例验真范围，让 docs-site 关键代码块直接来自 canonical examples
- 为 AI 维护场景补“变更前检查单”和“发布前契约检查”

## 本轮建议继续推进

- 继续把 `runtime/types.d.ts` 中的公开声明自动化生成
- 为 docs-site 增加错误参考页和迁移页入口
- 把 demo-project 也纳入 smoke tests
- 为 experimental API 增加单独的稳定性门槛和退出策略
