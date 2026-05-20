# Changelog

All notable changes to Sigil will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Router System**: `createRouter`, `Link`, `Navigate`, `useParams`, `useQuery` for client-side routing
- **New UI Components**:
  - `Alert` - Notification banners with variant styles (success, danger, warning, info)
  - `Progress` - Progress bars with variant colors and custom heights
  - `Skeleton` - Loading placeholders with animation
  - `Dropdown` - Context menus and dropdown panels
  - `Accordion` - Collapsible content sections
  - `Breadcrumbs` - Navigation breadcrumb trails
  - `Steps` - Step indicators (horizontal and vertical)
  - `Timeline` - Timeline displays for chronological data
- **Source Maps**: Proper VLQ encoding for accurate browser debugging
- **Component Detection**: Compiler now detects all 36 UI components for automatic imports

### Changed
- Improved source map generation with proper VLQ encoding (zigzag + base64)
- Enhanced error messages in compiler with better span information

### Fixed
- Source map mappings now correctly map generated code back to original TSX positions
- Router path normalization handles edge cases with trailing slashes

## [0.1.0] - 2026-05-20

### Added
- **CLI Commands**: `sig new`, `sig serve`, `sig build`
- **TSX Compiler**: SWC-based TSX to JavaScript transformation
  - JSX → `h()` function calls
  - TypeScript type stripping
  - Source map generation
  - Automatic UI component import injection
- **Reactive Runtime**:
  - `signal<T>()` - Reactive state primitives
  - `computed<T>()` - Derived values with auto-tracking
  - `effect()` - Side effects with cleanup
  - `defineComponent()` - Reactive component definition
  - `onMount()` / `onUnmount()` - Lifecycle hooks
  - `h()` - HyperScript DOM creation
  - `Fragment` - Child grouping without DOM nodes
  - `errorBoundary()` - Error catching wrapper
  - `reactiveTemplate` - Template literal reactivity
- **DOM Diffing**:
  - Keyed list reconciliation with LIS-based reordering
  - Attribute and style synchronization
  - Form element state sync (input, checkbox, select)
- **UI Component Library (28 components)**:
  - Layout: `Container`, `Flex`, `Grid`, `Stack`
  - Typography: `Heading`, `Text`
  - Data Display: `Card`, `Badge`, `Avatar`, `Stat`, `Table`, `TableHeader`, `TableBody`, `TableRow`, `EmptyState`
  - Forms: `Button`, `Input`, `Textarea`, `SearchInput`, `Checkbox`, `Select`
  - Feedback: `Modal`, `showToast`, `Tooltip`
  - Navigation: `Tabs`, `Pagination`
  - Other: `Separator`, `Divider`
- **Development Server**:
  - Axum-based HTTP server
  - SSE live reload on file changes
  - Compilation cache with etag invalidation
  - Auto-increment port on conflict
- **Production Build**:
  - TSX compilation with minification
  - JavaScript comment stripping
  - Whitespace reduction
  - Build summary with file sizes
- **TypeScript Support**: Complete type declarations in `types.d.ts`
- **Demo Project**: Admin dashboard example with search and filtering
- **Documentation Site**: Full docs built with Sigil itself

[Unreleased]: https://github.com/DreamSailing/sigil/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DreamSailing/sigil/releases/tag/v0.1.0
