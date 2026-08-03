# AI Friendly Gap Analysis

## 目标定义

“真正 AI 友好的前端框架”至少要满足四件事：

- 契约单一且可生成，AI 不会同时学到多套说法
- 错误结构化且可诊断，AI 能根据错误自动修复
- 文档可验证且长期同步，README/docs/types/实现不漂移
- 回归自动化且覆盖关键路径，修改后能快速判定是否破坏既有能力

## 当前结论

Sigil 已经具备“可用框架雏形”，但在下面几项上仍未达到成熟工程化水平：

- 公开契约此前散落在 `compiler.rs`、`runtime/types.d.ts`、`README.md`、`docs-site`、CLI scaffold 多处维护
- 错误此前主要是自由文本，server/compiler/runtime/CLI 缺少统一字段
- scaffold 依赖源码仓库中的 `runtime/types.d.ts`，安装后可分发性不足
- CI、文档验真、browser smoke 之前没有闭环

## P0

- 单一事实源缺失：公开 runtime/UI contract 需要收敛到一份 registry
- 安装后稳定性不足：CLI scaffold 与 runtime 资源不应依赖源码目录结构
- 错误不可机器消费：至少 server/compiler/CLI 必须输出带 code 和修复建议的结构化错误
- 文档漂移：README 与 docs-site 中的组件数量、创建项目方式、零配置表述不一致

## P1

- 稳定 API 分级缺失：stable/beta/compat/experimental 需要明确落库
- AI 约束协议缺失：推荐写法、禁用写法、状态/副作用边界需要成文
- docs 示例验真薄弱：关键示例需要绑定 canonical source
- browser smoke tests 需纳入自动化而非手工脚本

## P2

- docs-site 仍偏“展示型”，缺少完整错误参考页与迁移页
- runtime 结构化错误还未全面覆盖所有内部告警点
- 示例、API 页面仍有部分手写描述，未来建议继续自动化生成

## 本轮已收敛范围

本轮选择高收益、低歧义、可验证的改造范围：

- 引入 `metadata/contracts.json` 作为公开 contract registry
- 生成 Rust 编译器导入清单和 docs-site 契约元数据
- 用 embedded assets 解决 CLI scaffold/runtime/types 的可分发问题
- 为 server/compiler/CLI 建立统一结构化错误基础
- 新增 `AI_GUIDE.md`、错误文档、迁移文档、路线图
- 接入 CI、docs 校验、browser smoke tests

## 暂不在本轮做

- 全面重写 docs-site 为纯生成式文档站
- 大规模调整 runtime API 设计
- 大范围兼容层移除或 breaking change
- 增加新的业务型功能模块

## 预期收益

- AI 生成代码时更容易学到唯一正确入口
- 用户安装 CLI 后，新项目不再依赖仓库相对路径
- 文档与实现不一致时，CI 会更早失败
- 编译/服务端错误变得可消费、可分类、可指导修复
