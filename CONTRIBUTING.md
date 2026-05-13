# Contributing to Sigil

Thank you for your interest in contributing to Sigil! This document provides guidelines for contributing.

## How to Contribute

### Report Bugs

- Open an issue on [GitHub Issues](https://github.com/DreamSailing/sigil/issues)
- Include a clear description, steps to reproduce, and expected vs. actual behavior
- Specify your OS, Rust version, and browser (if applicable)

### Suggest Features

- Open an issue with the label `enhancement`
- Describe the use case and why it benefits AI agent developers

### Submit Code

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Ensure tests pass:
   - `cargo test` — Rust unit tests
   - `node --import ./runtime/setup-globals.js runtime/runtime.test.js` — Runtime tests
5. Commit with a clear message
6. Open a Pull Request

## Development Setup

```bash
git clone https://github.com/DreamSailing/sigil
cd sigil
cargo build
```

### Running Tests

```bash
# Rust compiler tests
cargo test

# JavaScript runtime tests
node --import ./runtime/setup-globals.js runtime/runtime.test.js

# Dev server (for manual testing)
cargo run -- serve --port 3000
```

## Code Style

- **Rust**: Follow standard Rust formatting (`cargo fmt`)
- **JavaScript/TypeScript**: Keep consistent with existing code style

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
