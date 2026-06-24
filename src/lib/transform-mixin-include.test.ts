import { describe, expect, it } from "vitest";
import postcss from "postcss";
import postcssScss from "postcss-scss";
import plugin from "../index.js";

const run = (input: string) =>
  postcss([plugin()])
    .process(input, { from: undefined })
    .then((r) => r.css);

const runScss = (input: string) =>
  postcss([plugin()])
    .process(input, { from: undefined, syntax: postcssScss })
    .then((r) => r.css);

describe("mixin argument paren-splitting", () => {
  it("passes var() arg correctly", async () => {
    const result = await run(`
      @mixin foo($c: red) { color: $c; }
      a { @include foo(var(--color)); }
    `);
    expect(result).toContain("color: var(--color)");
  });

  it("passes rgb() arg correctly", async () => {
    const result = await run(`
      @mixin foo($c: red) { color: $c; }
      a { @include foo(rgb(0, 0, 0)); }
    `);
    expect(result).toContain("color: rgb(0, 0, 0)");
  });

  it("passes rgba() arg correctly", async () => {
    const result = await run(`
      @mixin foo($c: red) { color: $c; }
      a { @include foo(rgba(0, 0, 0, 0.7)); }
    `);
    expect(result).toContain("color: rgba(0, 0, 0, 0.7)");
  });

  it("passes hsl() arg correctly", async () => {
    const result = await run(`
      @mixin foo($c: red) { color: $c; }
      a { @include foo(hsl(270, 60%, 70%)); }
    `);
    expect(result).toContain("color: hsl(270, 60%, 70%)");
  });

  it("passes function value and plain value together", async () => {
    const result = await run(`
      @mixin foo($c: red, $s: 1em) { color: $c; font-size: $s; }
      a { @include foo(rgb(0, 0, 0), 6em); }
    `);
    expect(result).toContain("color: rgb(0, 0, 0)");
    expect(result).toContain("font-size: 6em");
  });

  it("passes var() with fallback (comma inside function)", async () => {
    const result = await run(`
      @mixin foo($c: red) { color: $c; }
      a { @include foo(var(--color, red)); }
    `);
    expect(result).toContain("color: var(--color, red)");
  });

  it("uses rgb() as mixin default when no arg passed", async () => {
    const result = await run(`
      @mixin foo($c: rgb(0, 0, 0)) { color: $c; }
      a { @include foo; }
    `);
    expect(result).toContain("color: rgb(0, 0, 0)");
  });

  it("uses var() as mixin default when no arg passed", async () => {
    const result = await run(`
      @mixin foo($c: var(--color)) { color: $c; }
      a { @include foo; }
    `);
    expect(result).toContain("color: var(--color)");
  });

  it("uses the default parameter value when called without arguments", async () => {
    const result = await run(`
      @mixin foo($c: red) { color: $c; }
      a { @include foo; }
    `);
    expect(result).toContain("color: red");
  });
});

describe("variable mixin names in @include (issue #112)", () => {
  it("resolves bare $v as mixin name", async () => {
    const result = await run(`
      @mixin foo { color: red; }
      $v: foo;
      a { @include $v; }
    `);
    expect(result).toContain("color: red");
  });

  it("resolves $(v) as mixin name", async () => {
    const result = await run(`
      @mixin foo { color: red; }
      $v: foo;
      a { @include $(v); }
    `);
    expect(result).toContain("color: red");
  });

  it("resolves $v as mixin name with args", async () => {
    const result = await run(`
      @mixin colored($c) { color: $c; }
      $v: colored;
      a { @include $v(blue); }
    `);
    expect(result).toContain("color: blue");
  });

  it("resolves $(v) as mixin name with args", async () => {
    const result = await run(`
      @mixin colored($c) { color: $c; }
      $v: colored;
      a { @include $(v)(blue); }
    `);
    expect(result).toContain("color: blue");
  });

  it("resolves mixin name from @each loop variable (issue #112 pattern)", async () => {
    const result = await runScss(`
      @mixin sm { font-size: 1rem; }
      @mixin md { font-size: 2rem; }
      @each $v in sm, md {
        .#{$v} { @include $(v); }
      }
    `);
    expect(result).toContain("font-size: 1rem");
    expect(result).toContain("font-size: 2rem");
  });
});
