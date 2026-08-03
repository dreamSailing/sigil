# Errors

Sigil 现在以统一结构输出关键错误，目标是让人和 AI 都能直接消费。

## Schema

```json
{
  "error": {
    "code": "SIG-COMPILE-FAILED",
    "message": "TSX compilation failed for 'main.tsx'.",
    "likelyCause": "The module contains invalid TSX syntax.",
    "suggestedFix": "Fix the first diagnostic location, then retry.",
    "location": {
      "file": "input.tsx",
      "line": 4,
      "column": 12
    },
    "details": {}
  }
}
```

## Current codes

- `SIG-CLI-SCAFFOLD-FAILED`: `sig new` 写文件失败或目录已存在
- `SIG-CLI-SERVE-FAILED`: `sig serve` 启动失败
- `SIG-CLI-BUILD-FAILED`: `sig build` 构建失败
- `SIG-COMPILE-FAILED`: TSX 编译失败，`details.diagnostics` 中包含结构化诊断
- `SIG-SERVER-SRC-NOT-FOUND`: `/src/*` 模块不存在
- `SIG-SERVER-PATH-FORBIDDEN`: 请求越界访问 `src/` 或项目根目录之外
- `SIG-SERVER-SRC-READ-FAILED`: 源文件存在但读取失败
- `SIG-SERVER-RUNTIME-ASSET-MISSING`: runtime 内置资源缺失
- `SIG-SERVER-UI-ASSET-MISSING`: UI 内置资源缺失
- `SIG-RUNTIME-COMPUTED-READONLY`: 试图对 `computed()` 调用 `.set()`
- `SIG-RUNTIME-LIFECYCLE-OUTSIDE-COMPONENT`: 在 `defineComponent` 外调用生命周期钩子
- `SIG-RUNTIME-WATCH-INVALID-SOURCE`: `watch()` 使用了无效 source
- `SIG-RUNTIME-BOUNDARY-CAUGHT`: `errorBoundary()` 捕获到渲染错误

## AI 修复建议

- 先处理 `code` 对应的首要原因，不要从 `details.cause` 猜实现细节
- 优先使用 `location` 中的第一处位置进行修复
- 对 compile/server 错误，先修路径、导入、语法，再重试
- 对 runtime 错误，优先检查是否用了 compat/experimental API，或是否越过了生命周期边界
