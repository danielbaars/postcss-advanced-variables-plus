# Plan: Variable interpolation fixes

> Closes upstream issues #75 and #91 in csstools/postcss-advanced-variables

## Background

Both issues describe `#{}` interpolation silently failing or throwing "Could not resolve variable" in specific contexts:

- **#75** — `--#{$layer}` in `@each`: custom property names whose value comes from a loop variable are not interpolated
- **#91** — `#{$c}__label` as a nested selector: variable captured via `$c: &;` cannot be resolved when used in a sibling rule's selector

The interpolation machinery lives in `get-replaced-string.ts`. The regex there has a related latent bug: all three alternatives use `[A-z]` as the first-character class, which (due to ASCII ordering) includes the non-letter characters `[`, `\`, `]`, `^`, `_`, `` ` `` between uppercase Z and lowercase a. It should be `[A-Za-z]`.

---

## Root cause analysis

### Issue #75 — `--#{$layer}` in `@each`

`transform-decl.ts` processes a declaration in two passes:

```ts
decl.value = getReplacedString(decl.value, decl as WithVariables, opts);  // pass 1

if (matchVariable.test(decl.prop)) {          // pure assignment — $foo: value
  setVariable(...); decl.remove();
} else {
  decl.prop = getReplacedString(decl.prop, decl as WithVariables, opts);  // pass 2
}
```

Pass 2 calls `getReplacedString(decl.prop, decl, opts)`. Inside that function the variable lookup is:

```ts
const value = getClosestVariable(name, node.parent as WithVariables, opts);
```

`node` here is `decl`; `node.parent` is `decl.parent`. In the `@each` expansion, `decl.parent` is the cloned `@each` atrule whose `variables` map was populated with `{ layer: "alpha", i: "0" }` before `transformNode` ran on it. This should work — but only if `decl.parent` still points at the clone at the time pass 2 executes.

Pass 1 **does not move the declaration**, so `decl.parent` is unchanged. The theoretical path is correct. Whether the bug manifests depends on `getValueAsObject` correctly parsing the list value for `$layers` and on the `@each` clone carrying its variables into the nested declaration transform.

### Issue #91 — `#{$c}__label` in selector

`transform-rule.ts` calls `getReplacedString(rule.selector, rule, opts)`. The lookup is again `getClosestVariable(name, rule.parent, opts)`.

`$c: &;` is a sibling declaration that appears **before** `#{$c}__label` in the same parent rule. `transform-node.ts` uses `waterfall` (strictly sequential), so `$c: &;` is processed first: it calls `setVariable(decl.parent, "c", "&", opts)` setting `c` on the parent rule. By the time `#{$c}__label` is processed, `c` should be in `parent.variables`.

The theoretical path again looks correct. The "Could not resolve" error in the upstream plugin could be a result of the JavaScript version walking nodes non-sequentially or of a different processing order.

### Confirmed bug — `[A-z]` character class

The regex in `get-replaced-string.ts`:

```ts
const matchVariables = /(.?)(?:\$([A-z][\w-]*)|\$\(([A-z][\w-]*)\)|#\{\$([A-z][\w-]*)\})/g;
```

`[A-z]` should be `[A-Za-z]`. This affects variable names starting with `[`, `\`, `]`, `^`, `_`, or `` ` `` — uncommon but incorrect. Fix this unconditionally.

---

## Phase 1: Confirm and document current behaviour with tests

**Goal**: write test cases that reproduce both upstream issues exactly. If they pass, the bugs do not affect our fork; the tests become permanent regression guards. If they fail, move to Phase 2.

### What to build

Add a new file `src/lib/interpolation.test.ts` with tests for:

| Scenario | Input CSS | Expected output |
|---|---|---|
| `--#{$var}` in property name (simple) | `$n: foo; a { --#{$n}: 1; }` | `--foo: 1` |
| `--#{$layer}` in `@each` loop (issue #75) | `$layers: alpha, beta; :root { @each $layer in $layers { --#{$layer}: 1; } }` | `:root { --alpha: 1; --beta: 1; }` |
| `#{$var}` in value (sanity check) | `$n: red; a { color: #{$n}; }` | `color: red` |
| `#{$c}` alone as selector | `.nav { $c: nav; .#{$c}__item { color: red; } }` | `.nav__item { color: red }` |
| `#{$c}__label` (issue #91 pattern) | `.nav { $c: nav; #{$c}__label { color: red; } }` | contains `nav__label` |
| `#{$c}` in `@each`-generated selector | `@each $n in a, b { .#{$n}-item { } }` | `.a-item` and `.b-item` |
| Interpolation in at-rule params | `$bp: 600px; @media (min-width: #{$bp}) { }` | `@media (min-width: 600px)` |

### Parser requirement (discovered in Phase 1)

PostCSS's standard CSS parser rejects `{` inside `#{}` in anything except at-rule params (where surrounding `()` prevent the parser from treating `{` as opening a block). The plugin transform logic is correct — the parser discards the input before the plugin ever runs.

`#{}` interpolation in property names, values, and selectors therefore requires a SCSS-aware parser. The recommended approach is `postcss-scss`:

```js
import postcssScss from 'postcss-scss'
postcss([advancedVariables()]).process(css, { syntax: postcssScss })
```

`@media (min-width: #{$bp})` works with the standard parser because `#{$bp}` is wrapped in `()`, protecting the inner `{` from being interpreted as a block opener.

### Acceptance criteria

- [x] `src/lib/interpolation.test.ts` exists and all 7 tests pass
- [x] `[A-z]` corrected to `[A-Za-z]` in `matchVariables` in `get-replaced-string.ts`
- [x] `postcss-scss` added as devDependency; SCSS parser used for `#{}` tests
- [x] All 38 tests pass
- [x] `pnpm type-check` passes clean
- [ ] README updated: note that `#{}` in property names/selectors/values requires `postcss-scss` (or equivalent)
- [ ] CHANGELOG updated with `1.2.0` entry referencing issues #75 and #91
- [ ] Version bumped to `1.2.0` in `package.json`
