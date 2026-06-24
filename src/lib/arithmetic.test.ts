import { describe, expect, it } from "vitest";
import postcss from "postcss";
import postcssScss from "postcss-scss";
import plugin from "../index.js";
import { evaluateExpression } from "./evaluate-expression.js";

const run = (input: string) =>
  postcss([plugin()]).process(input, { from: undefined }).then(r => r.css);

// SCSS parser required when $var declarations appear inside nested blocks
const runScss = (input: string) =>
  postcss([plugin()]).process(input, { from: undefined, syntax: postcssScss }).then(r => r.css);

// ─── Unit tests for evaluateExpression ───────────────────────────────────────

describe("evaluateExpression", () => {
  it("evaluates a bare integer", () => {
    expect(evaluateExpression("1")).toBe(1);
  });

  it("evaluates addition", () => {
    expect(evaluateExpression("1 + 2")).toBe(3);
  });

  it("evaluates parenthesised expression", () => {
    expect(evaluateExpression("(1 * 2) - 1")).toBe(1);
  });

  it("evaluates division", () => {
    expect(evaluateExpression("10 / 4")).toBe(2.5);
  });

  it("evaluates modulo", () => {
    expect(evaluateExpression("10 % 3")).toBe(1);
  });

  it("evaluates unary minus", () => {
    expect(evaluateExpression("-(3 + 2)")).toBe(-5);
  });

  it("returns null for unsupported operator **", () => {
    expect(evaluateExpression("2 ** 3")).toBeNull();
  });

  it("returns null for CSS values with units", () => {
    expect(evaluateExpression("1px + 2px")).toBeNull();
  });

  it("returns null for CSS grid shorthand with keyword", () => {
    expect(evaluateExpression("0 / span 3")).toBeNull();
  });

  it("returns null for unclosed parenthesis", () => {
    expect(evaluateExpression("(1 + ")).toBeNull();
  });

  it("returns null for division by zero", () => {
    expect(evaluateExpression("1 / 0")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(evaluateExpression("")).toBeNull();
  });

  it("evaluates a float literal", () => {
    expect(evaluateExpression("3.5 * 2")).toBe(7);
  });

  it("returns null for extra trailing content", () => {
    expect(evaluateExpression("1 + 2 abc")).toBeNull();
  });
});

// ─── Integration tests ────────────────────────────────────────────────────────

describe("arithmetic in variable assignment (issue #98)", () => {
  it("evaluates arithmetic before storing a variable", async () => {
    const result = await run(`$x: (3 * 2) - 1; a { order: $x; }`);
    expect(result).toContain("order: 5");
  });

  it("evaluates $i-based arithmetic inside @for", async () => {
    const result = await runScss(`
      @for $i from 1 through 3 {
        $odd: ($i * 2) - 1;
        .item-#{$odd} { order: $odd; }
      }
    `);
    expect(result).toContain(".item-1");
    expect(result).toContain(".item-3");
    expect(result).toContain(".item-5");
    expect(result).toContain("order: 1");
    expect(result).toContain("order: 3");
    expect(result).toContain("order: 5");
  });

  it("evaluates a span offset pattern (direct #98 reproduction)", async () => {
    const result = await runScss(`
      $span: 3;
      @for $i from 1 through 2 {
        $start: (($i - 1) * $span);
        .col-#{$i} { grid-column: $start / span $span; }
      }
    `);
    expect(result).toContain("grid-column: 0 / span 3");
    expect(result).toContain("grid-column: 3 / span 3");
  });
});

describe("arithmetic in @for bounds (issue #65)", () => {
  it("evaluates an arithmetic expression as @for end bound", async () => {
    // $a + $b = 2 + 3 = 5; loop runs through 5 (current @for treats through/to as inclusive)
    const result = await runScss(`
      $a: 2;
      $b: 3;
      @for $c from 1 through ($a + $b) {
        .x-#{$c} { z-index: $c; }
      }
    `);
    expect(result).toContain(".x-1");
    expect(result).toContain(".x-5");
    expect(result).not.toContain(".x-6");
  });

  it("evaluates arithmetic @for bound from @each loop variable", async () => {
    // $a iterates 1, 2; @for end = $a + 3 = 4 then 5
    const result = await runScss(`
      @each $a in 1, 2 {
        @for $c from 1 through ($a + 3) {
          .item-#{$a}-#{$c} { x: 1; }
        }
      }
    `);
    // $a=1: ($a+3)=4 → .item-1-1 through .item-1-4
    expect(result).toContain(".item-1-1");
    expect(result).toContain(".item-1-4");
    expect(result).not.toContain(".item-1-5");
    // $a=2: ($a+3)=5 → .item-2-1 through .item-2-5
    expect(result).toContain(".item-2-1");
    expect(result).toContain(".item-2-5");
    expect(result).not.toContain(".item-2-6");
  });
});
