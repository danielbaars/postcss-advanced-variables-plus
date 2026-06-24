# Plan: Variable mixin names in @include (issue #112)

> Closes upstream issue #112 in csstools/postcss-advanced-variables

## Background

The reporter uses `@include $(v)` inside an `@each` loop to dynamically select a mixin by name:

```css
@each $v in (small, medium, large) {
  @include $(v) {
    @for $i from 1 through 3 {
      .col-#{$v}-#{$i} { width: $i; }
    }
  }
}
```

Running this produces the error **"Could not resolve the mixin for `$`"** — note the bare dollar sign, not the variable's value.

---

## Root cause

`getIncludeOpts` in `transform-include-atrule.ts` splits `node.params` into a name and an argument list by finding the first `(`:

```ts
const getIncludeOpts = (node: AtRule) => {
  const openParenIndex = node.params.indexOf("(");
  const name = openParenIndex === -1
    ? node.params.trim()
    : node.params.slice(0, openParenIndex).trim();  // ← wrong for $(v)
  const args = openParenIndex === -1
    ? []
    : list.comma(node.params.slice(openParenIndex + 1, -1));
  return { name, args };
};
```

For `@include $(v)`:
- `node.params = "$(v)"`
- `openParenIndex = 1` — the `(` inside the variable syntax `$(v)`
- `name = "$"` — everything before that paren
- `args = ["v"]` — the letter `v` between the parens

The `(` in `$(v)` is part of the PostCSS variable-reference syntax, not the delimiter between the mixin name and its argument list. The function never resolves variable references before attempting the split, so it misreads the structure.

---

## Fix

The variable substitution logic lives in `getReplacedString`, which is already imported in `transform-include-atrule.ts`. The fix is to resolve all variable references in `node.params` first, then parse the resolved string:

```ts
// Before (no variable resolution, wrong parse for $(v)):
const getIncludeOpts = (node: AtRule) => {
  const openParenIndex = node.params.indexOf("(");
  const name = openParenIndex === -1 ? node.params.trim() : node.params.slice(0, openParenIndex).trim();
  const args = openParenIndex === -1 ? [] : list.comma(node.params.slice(openParenIndex + 1, -1));
  return { name, args };
};

// After (resolve variables first, then parse):
const getIncludeOpts = (node: AtRule, opts: TransformOpts) => {
  const resolved = getReplacedString(node.params, node as unknown as WithVariables, opts);
  const openParenIndex = resolved.indexOf("(");
  const name = openParenIndex === -1 ? resolved.trim() : resolved.slice(0, openParenIndex).trim();
  const args = openParenIndex === -1 ? [] : list.comma(resolved.slice(openParenIndex + 1, -1));
  return { name, args };
};
```

One additional line change: the call site in `transformIncludeAtrule` passes `opts`:

```ts
// Before:
const { name, args } = getIncludeOpts(rule);

// After:
const { name, args } = getIncludeOpts(rule, opts);
```

### Effect on args

Pre-resolving `node.params` means the `args` array returned by `getIncludeOpts` contains already-resolved values. `transformIncludeAtrule` then calls `getReplacedString(args[index]!, rule, opts)` on each arg. Calling `getReplacedString` on an already-resolved string is idempotent — `"blue"` resolves to `"blue"` — so the existing arg-handling code is left unchanged.

### Variable syntax coverage

`getReplacedString` handles all three variable-reference forms:

| Syntax in `@include` params | After resolution | Parsed name |
|---|---|---|
| `@include $v` | `"small"` | `small` |
| `@include $(v)` | `"small"` | `small` |
| `@include #{$v}` | `"small"` (via SCSS parser) | `small` |
| `@include $v($arg)` | `"small(blue)"` | `small`, args `["blue"]` |
| `@include $(v)($arg)` | `"small(blue)"` | `small`, args `["blue"]` |

---

## Change surface

Exactly two files, five lines changed:

**`src/lib/transform-include-atrule.ts`**:
1. `getIncludeOpts` signature: add `opts: TransformOpts` parameter
2. `getIncludeOpts` body: resolve params before parsing (two lines changed, one added)
3. Call site in `transformIncludeAtrule`: pass `opts` to `getIncludeOpts`

No new imports are required — `getReplacedString`, `WithVariables`, and `TransformOpts` are already imported.

---

## Tests

Add to `src/lib/transform-mixin-include.test.ts`:

| Test | Input | Asserts |
|---|---|---|
| bare `$v` as name | `@mixin foo { color: red; } $v: foo; a { @include $v; }` | `color: red` present |
| `$(v)` syntax as name | `@mixin foo { color: red; } $v: foo; a { @include $(v); }` | `color: red` present |
| variable name + args | `@mixin colored($c) { color: $c; } $v: colored; a { @include $v(blue); }` | `color: blue` present |
| `$(v)` name + args | `@mixin colored($c) { color: $c; } $v: colored; a { @include $(v)(blue); }` | `color: blue` present |
| full `@each + @include $(v)` pattern | `@mixin sm { font-size: 1; } @mixin md { font-size: 2; } @each $v in sm, md { .#{$v} { @include $(v); } }` (SCSS parser for `#{$v}`) | `.sm { font-size: 1; }` and `.md { font-size: 2; }` |

---

## Acceptance criteria

- [ ] `src/lib/transform-include-atrule.ts` updated: `getIncludeOpts` resolves params before parsing
- [ ] 5 new tests in `src/lib/transform-mixin-include.test.ts`; all pass
- [ ] All existing tests continue to pass
- [ ] `pnpm type-check` passes clean
- [ ] CHANGELOG updated with `1.4.0` entry referencing issue #112
- [ ] Version bumped to `1.4.0` in `package.json`
