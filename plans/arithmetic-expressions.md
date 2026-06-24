# Plan: Arithmetic expression evaluation

> Closes upstream issues #98 and #65 in csstools/postcss-advanced-variables

## Background

Both issues describe arithmetic expressions that are stored or passed through as literal strings instead of being evaluated:

- **#98** — `$odd: ($i * 2) - 1;` inside a `@for` loop. After variable substitution the value is `(1 * 2) - 1`. The plugin stores this string verbatim, so `#{$odd}` in a selector outputs `(1 * 2) - 1` instead of `1`.
- **#65** — `@for $c from 1 to ($a + $b)`. After variable substitution `getForOpts` calls `Number("(1 + 4)")` which produces `NaN`, so the loop never runs.

---

## Root cause

### Variable assignment (issue #98)

`transform-decl.ts` does:

```ts
decl.value = getReplacedString(decl.value, ...);  // resolves $i → "1"
setVariable(decl.parent, "odd", decl.value, ...); // stores "(1 * 2) - 1" as-is
```

`getReplacedString` only substitutes variable references; it does not evaluate the resulting expression. The arithmetic string is stored verbatim and later interpolated verbatim into selectors and values.

### `@for` bounds (issue #65)

`transform-for-atrule.ts` does:

```ts
const end = Number(getReplacedString(params[4]!, ...)); // Number("(1 + 4)") → NaN
```

`Number()` parses bare numeric strings but not arithmetic expressions with operators or parentheses.

---

## Design

### Scope

Evaluate **pure arithmetic expressions only** — strings consisting entirely of integer/float literals, the operators `+`, `-`, `*`, `/`, `%`, and parentheses. Anything containing a CSS unit (`10px`), keyword (`span`), or variable (`$x`) that was not fully substituted is left unchanged.

This keeps the evaluator strict and predictable:
- `(1 * 2) - 1` → `1`
- `1 + 4` → `5`
- `0 / span 3` → unchanged (contains a keyword)
- `1px + 2px` → unchanged (contains units)

### Evaluation points

Apply the evaluator at exactly two points — no other callers change:

1. **Variable assignment** (`transform-decl.ts`): after `getReplacedString` resolves all variable references in `decl.value`, try to evaluate the result. If successful, store the number; otherwise store the string unchanged.

2. **`@for` bounds** (`transform-for-atrule.ts`): in `getForOpts`, evaluate each bound string before passing to `Number()`.

`transform-if-atrule.ts` handles arithmetic indirectly: once variable assignment evaluates `$computed: ($a + $b)` correctly, `@if $computed > 5` works without any change to the `@if` logic. Direct expressions in `@if` params like `@if ($a + $b) > 5` remain out of scope — the `list.space` tokenisation would require a more invasive rewrite.

---

## Implementation

### Step 1 — `src/lib/evaluate-expression.ts` (new file)

A recursive-descent parser/evaluator for pure arithmetic.

```ts
// Grammar:
//   expr    = term (('+' | '-') term)*
//   term    = factor (('*' | '/' | '%') factor)*
//   factor  = '-' factor | '(' expr ')' | NUMBER

export const evaluateExpression = (input: string): number | null => { ... }
```

Behaviour contract:
- Returns `null` if the input contains any character outside `[0-9 .+\-*/%()]` (no units, no identifiers).
- Returns `null` if the expression is syntactically invalid (unclosed parens, trailing operators, …).
- Returns `null` on division by zero.
- Returns the numeric result otherwise.

A single `null` return sentinel is fine — callers either substitute the number or fall through to the original string/`Number()`.

### Step 2 — `src/lib/transform-decl.ts`

After the existing `getReplacedString` call for variable assignment:

```ts
// existing
decl.value = getReplacedString(decl.value, decl as unknown as WithVariables, opts);

if (matchVariable.test(decl.prop)) {
  // NEW: evaluate arithmetic before storing
  const evaluated = evaluateExpression(decl.value);
  setVariable(
    decl.parent as WithVariables,
    decl.prop.slice(1),
    evaluated !== null ? String(evaluated) : decl.value,
    opts,
  );
  decl.remove();
} else {
  decl.prop = getReplacedString(decl.prop, decl as unknown as WithVariables, opts);
}
```

Only applied at the assignment branch — property values in output CSS are left unchanged to avoid corrupting valid CSS like `grid-column: 0 / span 3`.

### Step 3 — `src/lib/transform-for-atrule.ts`

In `getForOpts`, evaluate before `Number()`:

```ts
const resolveNumber = (raw: string, node: AtRule, opts: TransformOpts): number => {
  const str = getReplacedString(raw, node as unknown as WithVariables, opts);
  const n = evaluateExpression(str);
  return n !== null ? n : Number(str);
};

const getForOpts = (node: AtRule, opts: TransformOpts) => {
  const params = list.space(node.params);
  const varname = params[0]!.trim().slice(1);
  const start     = resolveNumber(params[2]!, node, opts);
  const end       = resolveNumber(params[4]!, node, opts);
  const increment = params[6] !== undefined ? resolveNumber(params[6], node, opts) : 1;
  return { varname, start, end, increment };
};
```

---

## Tests

New file `src/lib/arithmetic.test.ts` covering:

### Unit tests for `evaluateExpression`

| Input | Expected |
|---|---|
| `"1"` | `1` |
| `"1 + 2"` | `3` |
| `"(1 * 2) - 1"` | `1` |
| `"10 / 4"` | `2.5` |
| `"10 % 3"` | `1` |
| `"-(3 + 2)"` | `-5` |
| `"2 ** 3"` | `null` (unsupported operator) |
| `"1px + 2px"` | `null` (units) |
| `"0 / span 3"` | `null` (keyword) |
| `"(1 + "` | `null` (unclosed paren) |
| `"1 / 0"` | `null` (division by zero) |
| `""` | `null` |

### Integration tests

**Issue #98** — arithmetic assigned to a variable inside `@for`:

```css
@for $i from 1 through 3 {
  $odd: ($i * 2) - 1;
  .item-#{$odd} { order: $odd; }
}
```

Expected output contains `.item-1`, `.item-3`, `.item-5`, and `order: 1`, `order: 3`, `order: 5`.

**Issue #65** — arithmetic as `@for` bound:

```css
@each $a, $b in (1, 4), (2, 3) {
  @for $c from 1 to ($a + $b) {
    .x-#{$c} { z-index: $c; }
  }
}
```

First pair `$a=1, $b=4` → loop `$c` from 1 to 5 (exclusive), producing `.x-1` through `.x-4`.
Second pair `$a=2, $b=3` → loop `$c` from 1 to 5, same output range.

**Nested `@each` + `@for` with arithmetic span** (direct reproduction of #98 pattern):

```css
$span: 3;
@for $i from 1 through 2 {
  $start: (($i - 1) * $span);
  .col-#{$i} { grid-column: $start / span $span; }
}
```

Expected: `.col-1 { grid-column: 0 / span 3; }` and `.col-2 { grid-column: 3 / span 3; }`.

---

## Acceptance criteria

- [ ] `src/lib/evaluate-expression.ts` exists and all unit tests pass
- [ ] `src/lib/arithmetic.test.ts` exists with ≥ 10 tests; all pass
- [ ] Variable arithmetic from issue #98 pattern produces evaluated numbers
- [ ] `@for` bound arithmetic from issue #65 pattern loops correctly
- [ ] All existing tests (38) continue to pass
- [ ] `pnpm type-check` passes clean
- [ ] CHANGELOG updated with `1.3.0` entry referencing issues #98 and #65
- [ ] Version bumped to `1.3.0` in `package.json`

---

## Explicitly out of scope

- Arithmetic in `@if` conditions where the expression spans multiple space-tokenised params (e.g. `@if ($a + $b) > 5`). This requires restructuring how `@if` params are parsed and is a separate effort. The fix for variable assignment means `$sum: ($a + $b); @if $sum > 5` works correctly.
- CSS `calc()` expressions — left to the browser.
- Expressions with CSS units (`10px * 2`) — left to the browser or `calc()`.
- Exponentiation (`**`) and bitwise operators — not needed for CSS use cases.
