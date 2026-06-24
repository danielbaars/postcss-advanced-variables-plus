# Plan: postcss-advanced-variables-plus (fork)

> Upstream: https://github.com/csstools/postcss-advanced-variables (CC0-1.0, originally by Jonathan Neal)
> New repo: https://github.com/danielbaars/postcss-advanced-variables-plus
> npm: `postcss-advanced-variables-plus`

## Architectural decisions

- **Package name**: `postcss-advanced-variables-plus` — signals it's an extended fork, not a rename
- **Repository**: `https://github.com/danielbaars/postcss-advanced-variables-plus`
- **API surface**: Drop-in compatible with `postcss-advanced-variables` — identical options interface (`variables`, `unresolved`, `disable`, `importPaths`, `importResolve`, `importFilter`, `importRoot`). The only behavioural difference is the default `importResolve`.
- **Default resolver**: `@csstools/sass-import-resolve` is replaced by a built-in resolver that handles Vite aliases and pnpm's non-flat `node_modules` / `exports` maps. Consumers can still override it via `importResolve`.
- **Module format**: ESM-only, `"type": "module"`, `.mjs` output via tsdown
- **Source layout**: `src/lib/` — one file per transform function, TypeScript
- **Node**: `>=18`
- **PostCSS peer dep**: `^8.4`
- **Build tool**: tsdown
- **Test runner**: vitest
- **License**: CC0-1.0 — same as upstream; README prominently credits Jonathan Neal and csstools

---

## Phase 1: Repo bootstrap & TypeScript port ✅

All 17 upstream `src/lib/*.js` files ported to TypeScript. Build, type-check, and tests all pass.

### What was built

- GitHub repo created at `danielbaars/postcss-advanced-variables-plus`, cloned to `/Users/danielbaars/Dev/postcss-advanced-variables-plus/`
- Toolchain: tsdown (build), vitest (tests), TypeScript strict
- Source structure:
  - `src/lib/` — 17 transform files (one function each), plus `get-variables.ts`, `waterfall.ts`
  - `src/options.ts` — `PluginOptions`, `ImportResolution`, `ImportResolve`, `ImportFilter` types
  - `src/transform-opts.ts` — internal `TransformOpts` type used across all transforms
  - `src/index.ts` — plugin entry, re-exports public types
  - `src/index.test.ts` — 15 tests covering variables, @each, @for, @if/@else, @mixin/@include, disable option
- `dist/index.mjs` and `dist/index.d.ts` produced by `pnpm build`

### Deviations from upstream worth knowing

- **Default `importResolve` throws** rather than using `@csstools/sass-import-resolve`. This is intentional — Phase 2 replaces it with the real built-in resolver. The error message is explicit: _"Pass an importResolve function in plugin options."_
- **`disable` option fix**: the upstream had a bug where disabled structural at-rules (`@each`, `@for`, etc.) still had their children walked. Fixed in `transform-node.ts` by skipping recursion into those blocks.
- **`list.split` signature**: upstream used a 2-arg form; TypeScript required the 3-arg form `list.split(param, [":"], true)` in `transform-mixin-atrule.ts`.
- **`@types/node`** added to `devDependencies` (needed for `process.cwd()` and `node:path`).

### Pending before Phase 2

- No `.gitignore`, `LICENSE.md`, or `README.md` yet — intentionally deferred to Phase 3
- No initial git commit has been made — the repo is still empty on GitHub

---

## Phase 2: Modern resolver integration ✅

**Goal**: The fork works in pnpm + Vite environments out of the box, with no wrapper or extra configuration required.

### What was built

- `src/lib/import-resolver.ts` — ported from `nvwa-component-library/build-tools/advanced-variables-import-resolver.ts`
- `src/lib/import-resolver.test.ts` — 7 tests, all passing
- `src/options.ts` — `aliases` field added to `PluginOptions`
- `src/index.ts` — default `importResolve` now uses `createImportResolver`; both `createImportResolver` and `ImportResolverOptions` re-exported from package root

### Deviations from the original plan worth knowing

- **`resolveId` added to `ImportResolverOptions`**: vitest rewrites `import.meta.resolve` to `__vite_ssr_import_meta__.resolve` (its SSR transform), which is unavailable in tests. Rather than fighting the transform, an optional `resolveId?: (id: string, base: string) => string` was added to `ImportResolverOptions`. It defaults to `import.meta.resolve` at runtime. This is also a legitimate escape hatch for Vite consumers who want to pass Vite's own resolver instead.

- **`normalizeImportId` dropped** as planned — quote-stripping already happens upstream in `transform-import-atrule.ts`.

- **`createAdvancedVariablesImportResolver` renamed** to `createImportResolver` as planned.

### Acceptance criteria

- [x] `@csstools/sass-import-resolve` is not present in `package.json`
- [x] Default `importResolve` uses the ported resolver; no external resolver package is required
- [x] `aliases` option is accepted at the plugin level and passed to the built-in resolver
- [x] `createImportResolver` and `ImportResolverOptions` are exported from the package root
- [x] Resolver tests pass (7 tests: relative path, absolute path, alias exact match, alias prefix match, longest-alias-wins, package specifier via `resolveId`, resolution error message)
- [x] All Phase 1 tests continue to pass (22 total)
- [x] `pnpm build` and `pnpm type-check` pass clean

---

## Phase 3: Publication & attribution

**Goal**: The package is live on npm, CI-gated, and clearly attributed to its origins.

### What to build

#### 0. Fix `package.json` dist path mismatches (do this first)

tsdown (with `"type": "module"` and no explicit `outExtension`) currently outputs:
- `dist/index.js` — but `package.json` has `"main": "dist/index.mjs"` and `"exports"."import": "./dist/index.mjs"`
- `dist/index-D4JDHPek.d.ts` (content-hashed) — but `package.json` has `"types": "dist/index.d.ts"`

Fix by choosing one of:
- **Option A (recommended)**: Update `package.json` to reference `dist/index.js` and `dist/index.d.ts`. Verify tsdown writes a stable (non-hashed) `.d.ts` filename after a clean build.
- **Option B**: Add `outExtension: () => ({ js: '.mjs' })` to `tsdown.config.ts` and keep `package.json` as-is.

Confirm with `npm publish --dry-run` that the entry points actually resolve before tagging.

#### 1. `LICENSE.md`

CC0-1.0 full text (same as upstream).

#### 2. `README.md`

Structure:
- Brief description and "based on" attribution at the top
- **Attribution** section: name Jonathan Neal as original author, link to `jonathantneal/postcss-advanced-variables` and `csstools/postcss-advanced-variables`
- **Install** section (`npm install postcss-advanced-variables-plus`)
- **Usage** section — basic PostCSS config example
- **Options** table: all `PluginOptions` fields with types and defaults
- **`aliases` option** example showing Vite alias config
- **Differences from the original** section: TypeScript source, built-in pnpm/Vite-compatible resolver, `aliases` option, ESM-only
- **Migration** section: drop-in replacement steps for users coming from `postcss-advanced-variables`

#### 3. `.gitignore`

At minimum: `node_modules/`, `dist/`, `*.tsbuildinfo`

#### 4. `CHANGELOG.md`

Initial `1.0.0` entry documenting: TypeScript port, built-in resolver, `aliases` option.

#### 5. GitHub Actions CI (`.github/workflows/ci.yml`)

Trigger: push and pull_request on `main`. Steps: `pnpm install`, `pnpm type-check`, `pnpm test`.

#### 6. `package.json` tweaks before publish

- Verify `"files": ["dist"]` is correct (it is)
- Add `"publishConfig": { "access": "public" }` if publishing as a scoped package (not needed here since the name is unscoped)
- Consider bumping version to `1.0.0` or keeping it — already set to `1.0.0`

#### 7. npm publish

```bash
npm publish --dry-run   # verify what gets included
npm publish
```

#### 8. Initial git commit + push

Phase 3 is also when the first commit lands on GitHub. Suggested commit sequence:
1. Initial commit with all Phase 1 + 2 source
2. Add CI workflow
3. Add docs (LICENSE, README, CHANGELOG)
4. Tag `v1.0.0` and push

### Acceptance criteria

- [ ] `package.json` entry points (`main`, `exports`, `types`) resolve to the actual tsdown output filenames
- [ ] `LICENSE.md` is CC0-1.0
- [ ] README attributes Jonathan Neal and csstools
- [ ] README covers all options including `aliases` and `resolveId` (on `ImportResolverOptions`)
- [ ] CI workflow passes on GitHub
- [ ] `npm publish --dry-run` shows only `dist/`, `package.json`, `README.md`, `LICENSE.md`, `CHANGELOG.md`
- [ ] Package published and installable via `npm install postcss-advanced-variables-plus`
- [ ] `v1.0.0` tag exists on GitHub
