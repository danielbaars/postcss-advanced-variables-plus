import { describe, it, expect } from "vitest";
import postcss from "postcss";
import plugin from "./index.js";

const process = (css: string, opts = {}) =>
  postcss([plugin(opts)])
    .process(css, { from: undefined })
    .then((r) => r.css);

describe("postcss-advanced-variables-plus", () => {
  it("is a valid postcss plugin", () => {
    expect(plugin.postcss).toBe(true);
    const instance = plugin();
    expect(instance.postcssPlugin).toBe("postcss-advanced-variables-plus");
  });

  describe("variables", () => {
    it("replaces $variable references", async () => {
      const result = await process("$color: red; a { color: $color; }");
      expect(result).toContain("color: red");
      expect(result).not.toContain("$color");
    });

    it("supports !default", async () => {
      const result = await process("$a: 1; $a: 2 !default; a { x: $a; }");
      expect(result).toContain("x: 1");
    });

    it("injects variables from options", async () => {
      const result = await process("a { color: $brand; }", { variables: { brand: "blue" } });
      expect(result).toContain("color: blue");
    });

    it("throws on unresolved variables by default", async () => {
      await expect(process("a { color: $missing; }")).rejects.toThrow();
    });

    it("warns on unresolved variables when unresolved=warn", async () => {
      const result = await process("a { color: $missing; }", { unresolved: "warn" });
      expect(result).toContain("$missing");
    });

    it("ignores unresolved variables when unresolved=ignore", async () => {
      const result = await process("a { color: $missing; }", { unresolved: "ignore" });
      expect(result).toContain("$missing");
    });
  });

  describe("@each", () => {
    it("expands @each loops", async () => {
      const result = await process("@each $n in (a, b) { .$n { x: 1; } }");
      expect(result).toContain(".a");
      expect(result).toContain(".b");
    });
  });

  describe("@for", () => {
    it("expands @for loops", async () => {
      const result = await process("@for $i from 1 through 3 { .i$i { x: $i; } }");
      expect(result).toContain(".i1");
      expect(result).toContain(".i2");
      expect(result).toContain(".i3");
    });
  });

  describe("@if / @else", () => {
    it("keeps truthy @if blocks", async () => {
      const result = await process("$x: 1; @if $x == 1 { a { x: yes; } }");
      expect(result).toContain("x: yes");
    });

    it("removes falsy @if blocks", async () => {
      const result = await process("$x: 2; @if $x == 1 { a { x: yes; } }");
      expect(result).not.toContain("x: yes");
    });

    it("uses @else when @if is falsy", async () => {
      const result = await process("$x: 2; @if $x == 1 { a { x: if; } } @else { a { x: else; } }");
      expect(result).toContain("x: else");
      expect(result).not.toContain("x: if");
    });
  });

  describe("@mixin / @include", () => {
    it("expands mixins", async () => {
      const result = await process("@mixin foo { color: red; } a { @include foo; }");
      expect(result).toContain("color: red");
    });

    it("passes arguments to mixins", async () => {
      const result = await process("@mixin colored($c) { color: $c; } a { @include colored(blue); }");
      expect(result).toContain("color: blue");
    });
  });

  describe("disable option", () => {
    it("disables specified features", async () => {
      const result = await process("@each $n in (a, b) { .$n { x: 1; } }", { disable: "@each" });
      expect(result).toContain("@each");
    });
  });
});
