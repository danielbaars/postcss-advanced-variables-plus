# postcss-advanced-variables-plus

Use Sass-like variables, conditionals, and iterators in CSS.

Based on [postcss-advanced-variables](https://github.com/csstools/postcss-advanced-variables) by [Jonathan Neal](https://github.com/jonathantneal) and the [csstools](https://github.com/csstools) contributors. This fork adds TypeScript sources, a built-in pnpm/Vite-compatible resolver, and an `aliases` option.

## Attribution

Original work by **Jonathan Neal** ([@jonathantneal](https://github.com/jonathantneal)):

- Original repo: [jonathantneal/postcss-advanced-variables](https://github.com/jonathantneal/postcss-advanced-variables)
- Current upstream: [csstools/postcss-advanced-variables](https://github.com/csstools/postcss-advanced-variables)
- License: CC0-1.0

## Install

```sh
npm install postcss-advanced-variables-plus
```

PostCSS is a peer dependency:

```sh
npm install postcss
```

## Usage

```js
// postcss.config.js
import advancedVariables from 'postcss-advanced-variables-plus'

export default {
  plugins: [
    advancedVariables()
  ]
}
```

### With Vite aliases

```js
// vite.config.js
import { defineConfig } from 'vite'

const aliases = {
  '@styles': '/src/styles',
  '@tokens': '/src/tokens',
}

export default defineConfig({
  resolve: { alias: aliases },
  css: {
    postcss: {
      plugins: [
        advancedVariables({ aliases })
      ]
    }
  }
})
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `variables` | `VariableMap \| (name, node) => value` | `{}` | Additional variables available to all files |
| `unresolved` | `"throw" \| "warn" \| "ignore"` | `"throw"` | Behaviour when a variable reference cannot be resolved |
| `disable` | `string` | — | Space-separated list of at-rules to disable (e.g. `"@if @for"`) |
| `importPaths` | `string[]` | `[]` | Additional directories to search when resolving `@import` |
| `importResolve` | `(id, cwd) => Promise<{ file, contents }>` | built-in resolver | Override the file resolver entirely |
| `importFilter` | `((id, media) => boolean) \| RegExp` | — | Predicate to skip specific `@import` paths |
| `importRoot` | `string` | `process.cwd()` | Root directory for resolving bare imports |
| `aliases` | `Record<string, string>` | `{}` | Path aliases forwarded to the built-in resolver |

### `aliases` in detail

Aliases are resolved using longest-prefix matching, the same strategy Vite uses. An exact match (e.g. `@tokens` with no trailing slash) is resolved to the target path as-is; a prefix match (e.g. `@styles/button.css`) replaces the alias segment and appends the rest.

```css
/* with aliases: { '@styles': '/src/styles' } */
@import '@styles/button.css';
/* resolves to /src/styles/button.css */
```

## `ImportResolverOptions` (advanced)

When you need full control over specifier resolution without replacing the entire `importResolve` function, call `createImportResolver` directly:

```js
import advancedVariables, { createImportResolver } from 'postcss-advanced-variables-plus'

const resolve = createImportResolver({
  aliases: { '@styles': '/src/styles' },
  // Supply Vite's resolver instead of import.meta.resolve:
  resolveId: (id, base) => viteDevServer.moduleGraph.resolveUrl(id),
})

advancedVariables({ importResolve: resolve })
```

| Option | Type | Default | Description |
|---|---|---|---|
| `aliases` | `Record<string, string>` | `{}` | Path aliases |
| `resolveId` | `(id: string, base: string) => string` | `import.meta.resolve` | Specifier-to-file-URL resolver |

## Differences from the original

| | `postcss-advanced-variables` | `postcss-advanced-variables-plus` |
|---|---|---|
| Source language | JavaScript | TypeScript (strict) |
| Resolver | `@csstools/sass-import-resolve` | Built-in; uses `import.meta.resolve` |
| pnpm / `exports` map support | No | Yes |
| `aliases` option | No | Yes |
| Module format | CJS + ESM | ESM only |
| Node requirement | ≥ 12 | ≥ 18 |

## Migration from `postcss-advanced-variables`

This package is a drop-in replacement. All existing options work identically.

1. Uninstall the original:
   ```sh
   npm uninstall postcss-advanced-variables
   npm install postcss-advanced-variables-plus
   ```
2. Update imports:
   ```js
   // before
   import advancedVariables from 'postcss-advanced-variables'
   // after
   import advancedVariables from 'postcss-advanced-variables-plus'
   ```
3. If you were passing a custom `importResolve`, it continues to work unchanged.
4. If you relied on `@csstools/sass-import-resolve` behaviour for bare `@import` paths (e.g. `@import "bootstrap"`) you may need to add the relevant directory to `importPaths`, or configure `aliases`.

## License

CC0-1.0. See [LICENSE.md](LICENSE.md).

Original work CC0-1.0 by [Jonathan Neal](https://github.com/jonathantneal) and [csstools](https://github.com/csstools) contributors.
