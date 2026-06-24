# Changelog

## 1.1.0 — 2026-06-24

### Bug fixes

- **Mixin arguments with parenthesised values now resolve correctly** — `var(--x)`, `rgb(...)`, `hsl(...)`, and any other function-valued argument passed to `@include` were being truncated to the text before the inner `(`. The same bug affected parenthesised default values in `@mixin` definitions. Closes csstools/postcss-advanced-variables#77 and #78.

---

## 1.0.0 — 2026-06-24

Initial release as `postcss-advanced-variables-plus`.

### Changes from upstream (`postcss-advanced-variables`)

- **TypeScript source** — all 17 transform files ported to strict TypeScript
- **Built-in resolver** — replaces `@csstools/sass-import-resolve` with a resolver that handles pnpm's non-flat `node_modules`, package `exports` maps, and Vite aliases via Node's native `import.meta.resolve`
- **`aliases` option** — pass Vite/Webpack alias config directly to the plugin; the built-in resolver applies longest-prefix matching
- **`resolveId` option** (on `ImportResolverOptions`) — escape hatch to supply a custom specifier resolver (e.g. Vite's own `resolve.resolveId`) or to inject a test double
- **ESM-only** — `"type": "module"`, `.mjs` output; no CommonJS build
- **`disable` option fix** — upstream walked children of disabled structural at-rules (`@each`, `@for`, etc.); this fork skips them correctly
- **Node ≥ 18** required
