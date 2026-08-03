# Sigil Repair Checklist

## Scope

- Fix runtime and UI API contract drift across compiler, runtime, types, and scaffold output.
- Fix import/path rewriting so nested `src/` modules resolve correctly in dev and build outputs.
- Fix dev server static file boundaries so root assets and `public/` files behave consistently.
- Restore a working JavaScript test entry and add targeted regression coverage for the repaired paths.

## Checklist

- [x] Add missing runtime imports for lifecycle APIs in compiler output and scaffold template.
- [x] Repair `h()` support for callback refs and keyed nodes used by new UI components.
- [x] Fix `Rating` runtime dependency and declare new UI component types.
- [x] Rewrite local imports using the current module path instead of string stripping.
- [x] Emit correct relative runtime paths for nested build output files.
- [x] Allow dev server static fallback to serve files from the project root safely.
- [x] Restore the JS test harness and add regression tests for nested imports and runtime hooks.
- [x] Run Rust and JS test suites.
- [x] Commit changes and push to `origin/main`.
