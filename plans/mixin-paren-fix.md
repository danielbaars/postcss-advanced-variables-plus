# Plan: Mixin paren-splitting fix

> Closes upstream issues #77 and #78 in csstools/postcss-advanced-variables

## Root cause

Both `transform-include-atrule.ts` and `transform-mixin-atrule.ts` split `node.params` on `"("` with a limit of 2:

```ts
const [name, sourceArgs] = node.params.split("(", 2);
```

JavaScript's `split(sep, limit)` returns at most `limit` substrings, where each substring is the text *between* consecutive occurrences of the separator. For a call like:

```
heading-text(rgb(0, 0, 0))
```

`split("(", 2)` returns `["heading-text", "rgb"]` — the second element is the text between the *first* and *second* `(`, not everything after the first `(`. The subsequent `slice(0, -1)` then strips one character off `"rgb"`, producing `"rg"`.

**Fix**: use `indexOf("(")` to locate the first `(`, take everything before it as the name, and everything from `indexOf + 1` to `-1` (trimming the trailing `)`) as the raw argument string. PostCSS's `list.comma` already tracks paren depth and splits only on top-level commas, so the subsequent argument-splitting step requires no changes.

## Architectural decisions

- **No new dependencies** — the fix is pure string manipulation using `String.prototype.indexOf` and the existing `postcss/list` utilities
- **Both call sites fixed together** — the split logic is duplicated in `getIncludeOpts` (`transform-include-atrule.ts`) and `getMixinOpts` (`transform-mixin-atrule.ts`); both must be updated for the fix to be complete
- **`list.comma` and `list.split` are paren-aware** — no changes needed downstream of the argument extraction step

---

## Phase 1: Fix argument extraction and add regression tests

### What to build

Replace the `split("(", 2)` pattern in both `getIncludeOpts` and `getMixinOpts` with an `indexOf`-based split that preserves the full content after the first `(`.

**`transform-include-atrule.ts` — `getIncludeOpts`:**

```ts
// before
const [name, sourceArgs] = node.params.split(matchOpeningParen, 2) as [string, string | undefined];
const args = sourceArgs ? list.comma(sourceArgs.slice(0, -1)) : [];

// after
const openParenIndex = node.params.indexOf("(");
const name = openParenIndex === -1 ? node.params.trim() : node.params.slice(0, openParenIndex).trim();
const args = openParenIndex === -1 ? [] : list.comma(node.params.slice(openParenIndex + 1, -1));
```

**`transform-mixin-atrule.ts` — `getMixinOpts`:**

```ts
// before
const [name, sourceParams] = node.params.split(matchOpeningParen, 2) as [string, string | undefined];
const params: MixinParam[] = sourceParams && sourceParams.slice(0, -1).trim()
  ? list.comma(sourceParams.slice(0, -1).trim()).map(...)
  : [];

// after
const openParenIndex = node.params.indexOf("(");
const name = openParenIndex === -1 ? node.params.trim() : node.params.slice(0, openParenIndex).trim();
const rawParams = openParenIndex === -1 ? undefined : node.params.slice(openParenIndex + 1, -1).trim();
const params: MixinParam[] = rawParams
  ? list.comma(rawParams).map(...)
  : [];
```

The `matchOpeningParen` constant becomes dead code in both files and should be removed.

Add a new test file `src/lib/transform-mixin-include.test.ts` covering the cases from the upstream issues, plus the edge case of a comma inside a function default (which exercises `list.comma`'s depth tracking):

| Scenario | Input | Expected |
|---|---|---|
| `var(--x)` as `@include` arg | `@include foo(var(--color))` | `color: var(--color)` |
| `rgb(...)` as `@include` arg | `@include foo(rgb(0,0,0))` | `color: rgb(0,0,0)` |
| `rgba(...)` as `@include` arg | `@include foo(rgba(0,0,0,0.7))` | `color: rgba(0,0,0,0.7)` |
| `hsl(...)` as `@include` arg | `@include foo(hsl(270,60%,70%))` | `color: hsl(270,60%,70%)` |
| function value + plain value | `@include foo(rgb(0,0,0), 6em)` | `color: rgb(0,0,0); font-size: 6em` |
| `var(--x, fallback)` (comma inside function) | `@include foo(var(--color, red))` | `color: var(--color, red)` |
| `rgb(...)` as `@mixin` default | `@mixin foo($c: rgb(0,0,0))` + `@include foo` | `color: rgb(0,0,0)` |
| `var(...)` as `@mixin` default | `@mixin foo($c: var(--x))` + `@include foo` | `color: var(--x)` |
| no-arg `@include` still works | `@include foo` | unchanged baseline |

### Acceptance criteria

- [x] `transform-include-atrule.ts` uses `indexOf("(")` instead of `split("(", 2)`; `matchOpeningParen` constant removed
- [x] `transform-mixin-atrule.ts` uses `indexOf("(")` instead of `split("(", 2)`; `matchOpeningParen` constant removed
- [x] All 9 new test cases in `transform-mixin-include.test.ts` pass
- [x] All 22 existing tests continue to pass
- [x] `pnpm type-check` passes clean
- [x] CHANGELOG updated with a `1.1.0` entry describing the fix and referencing upstream issues #77 and #78
- [x] Version bumped to `1.1.0` in `package.json`
