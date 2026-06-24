import { describe, expect, it } from "vitest";
import postcss from "postcss";
import plugin from "../index.js";

const run = (input: string) =>
  postcss([plugin()]).process(input, { from: undefined }).then(r => r.css);

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

  it("no-arg include still works", async () => {
    const result = await run(`
      @mixin foo($c: red) { color: $c; }
      a { @include foo; }
    `);
    expect(result).toContain("color: red");
  });
});
