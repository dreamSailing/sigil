# Contributing to Sigil

Thank you for your interest in contributing to Sigil! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** with code examples
- **Expected vs actual Behavior**
- **Environment**: OS, browser, Sigil version
- **Minimal reproduction** if possible

Example:
```markdown
**Title**: Signal effect doesn't clean up properly

**Steps**:
1. Create signal: `const s = signal(0)`
2. Create effect with cleanup: `effect(() => { s.get(); onCleanup(() => console.log('cleanup')); })`
3. Call s.set(1) multiple times

**Expected**: Cleanup runs once before each re-run
**Actual**: Cleanup never runs
```

### Suggesting Features

Feature suggestions should include:
- **Use case** — what problem does this solve?
- **Proposed API** — how would developers use it?
- **Alternatives considered** — what other approaches did you think about?

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `cargo test`
6. Commit with clear messages: `feat: add router system`
7. Push to your fork and submit a PR

#### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, semicolons, etc)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

Examples:
```
feat: add router system with createRouter and Link components
fix: correct VLQ encoding in source map generation
docs: update API reference with new component props
test: add integration tests for compiler pipeline
```

## Development Setup

### Prerequisites

- **Rust** (latest stable): `rustup install stable`
- **Node.js** 18+: for running runtime tests
- **Cargo**: comes with Rust installation

### Building from Source

```bash
git clone https://github.com/DreamSailing/sigil.git
cd sigil
cargo build --release
```

The binary will be at `target/release/sig`.

### Running Tests

**Rust tests** (compiler, builder, server):
```bash
cargo test
```

**JavaScript runtime tests**:
```bash
node --import ./runtime/setup-globals.js runtime/runtime.test.js
```

### Project Structure

```
sigil/
├── src/
│   ├── main.rs           # CLI entry point
│   ├── server.rs         # Development server with SSE
│   ├── compiler.rs       # TSX compilation pipeline
│   ├── visitor.rs        # JSX → h() AST transformation
│   └── builder.rs        # Production build with minification
├── runtime/
│   ├── runtime.js        # Core reactive system (signal, computed, effect, h)
│   ├── ui.js             # UI component library (36 components)
│   ├── types.d.ts        # TypeScript declarations
│   ├── runtime.test.js   # Runtime unit tests
│   └── setup-globals.js  # Test setup for Node.js
├── demo-project/         # Example application
├── docs-site/            # Documentation website
├── Cargo.toml
└── CHANGELOG.md
```

### Key Architecture Points

1. **Compiler Pipeline**: Parse TSX → Scope analysis → Strip types → JSX transform → Code gen → Import injection
2. **Reactivity**: Signals track subscribers during effect execution, enabling automatic dependency tracking
3. **DOM Diffing**: Keyed reconciliation uses LIS (Longest Increasing Subsequence) algorithm for minimal moves
4. **UI Components**: Headless design with inline styles, zero external CSS dependencies

## Adding UI Components

When adding new UI components:

1. **Add to `runtime/ui.js`**:
```javascript
export function MyComponent(props, ...children) {
    const p = props || {};
    return h('div', { style: css(mergeStyle({ /* styles */ }, p.style)) }, ...children);
}
```

2. **Add to `ALL_UI_COMPONENTS` in `src/compiler.rs`**:
```rust
const ALL_UI_COMPONENTS: &[&str] = &[
    // ... existing components ...
    "MyComponent",
];
```

3. **Add TypeScript types to `runtime/types.d.ts`**:
```typescript
export interface MyComponentProps {
    variant?: 'primary' | 'secondary';
    style?: string | Record<string, string>;
}
export function MyComponent(props: MyComponentProps, ...children: any[]): HTMLElement;
```

4. **Add tests to `runtime/runtime.test.js`**:
```javascript
function test_my_component() {
    const el = MyComponent({ variant: 'primary' }, 'Content');
    if (el.tagName !== 'DIV') throw new Error('Expected DIV');
}
```

## Common Tasks

### Adding a New Runtime Export

1. Export from `runtime/runtime.js`
2. Add type declaration to `runtime/types.d.ts`
3. Update import injection in `src/compiler.ts` (line with `import { signal, computed, ...`)

### Modifying the Compiler

- Test compilation with: `cargo test test_transform_tsx_basic`
- Check source maps load in browser devtools
- Verify component detection works: `cargo test test_transform_tsx_component_detection`

### Testing the CLI

```bash
cargo run -- new test-project
cargo run -- serve -d test-project --port 3001
cargo run -- build -d test-project --output dist
```

## Questions?

- Check the [documentation site](http://localhost:3000) when running demo-project
- Review existing code for patterns and conventions
- Open a discussion issue for complex questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
