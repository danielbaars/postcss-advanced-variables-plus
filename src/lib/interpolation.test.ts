import { describe, expect, it } from "vitest";
import postcss from "postcss";
import postcssScss from "postcss-scss";
import plugin from "../index.js";

// Standard CSS parser — works for plain $var and #{} in at-rule params
const run = (input: string) =>
  postcss([plugin()]).process(input, { from: undefined }).then(r => r.css);

// SCSS parser — required for #{} in property names, values, and selectors
const runScss = (input: string) =>
  postcss([plugin()]).process(input, { from: undefined, syntax: postcssScss }).then(r => r.css);

describe("variable interpolation", () => {
  it("interpolates #{$var} in a CSS custom property name (requires SCSS parser)", async () => {
    const result = await runScss(`$n: foo; a { --#{$n}: 1; }`);
    expect(result).toContain("--foo: 1");
  });

  it("interpolates #{$layer} in custom property names inside @each (issue #75)", async () => {
    const result = await runScss(`
      $layers: alpha, beta;
      :root {
        @each $layer in $layers {
          --#{$layer}: 1;
        }
      }
    `);
    expect(result).toContain("--alpha: 1");
    expect(result).toContain("--beta: 1");
  });

  it("interpolates #{$var} in a declaration value (requires SCSS parser)", async () => {
    const result = await runScss(`$n: red; a { color: #{$n}; }`);
    expect(result).toContain("color: red");
  });

  it("interpolates #{$c} in a nested selector (issue #91 pattern)", async () => {
    const result = await runScss(`
      .nav {
        $c: nav;
        .#{$c}__item { color: red; }
      }
    `);
    expect(result).toContain(".nav__item");
  });

  it("interpolates #{$c}__label as a sibling selector (issue #91)", async () => {
    const result = await runScss(`
      .nav {
        $c: nav;
        #{$c}__label { color: red; }
      }
    `);
    expect(result).toContain("nav__label");
  });

  it("interpolates #{$n} in @each-generated selectors", async () => {
    const result = await runScss(`@each $n in a, b { .#{$n}-item { color: red; } }`);
    expect(result).toContain(".a-item");
    expect(result).toContain(".b-item");
  });

  it("interpolates #{$bp} in @media params (works with standard CSS parser)", async () => {
    const result = await run(`$bp: 600px; @media (min-width: #{$bp}) { a { color: red; } }`);
    expect(result).toContain("@media (min-width: 600px)");
  });
});
