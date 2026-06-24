import { describe, expect, it } from "vitest";
import postcss from "postcss";
import plugin from "../index.js";

const run = (input: string, opts: Parameters<typeof plugin>[0] = {}) =>
  postcss([plugin(opts)])
    .process(input, { from: undefined })
    .then((r) => r.css);

describe("transformContentAtrule", () => {
  describe("@content injection", () => {
    it("injects the @include block at the @content position", async () => {
      const result = await run(`
        @mixin wrapper { a { @content; } }
        @include wrapper { color: red; }
      `);

      expect(result).toContain("color: red");
    });

    it("removes the @content rule from output", async () => {
      const result = await run(`
        @mixin foo { a { @content; } }
        @include foo { color: blue; }
      `);

      expect(result).not.toContain("@content");
    });

    it("injects multiple declarations from the include block", async () => {
      const result = await run(`
        @mixin theme { .card { @content; } }
        @include theme { color: red; background: white; }
      `);

      expect(result).toContain("color: red");
      expect(result).toContain("background: white");
    });

    it("injects nested rules from the include block", async () => {
      const result = await run(`
        @mixin layout { .wrapper { @content; } }
        @include layout { .inner { display: flex; } }
      `);

      expect(result).toContain(".inner");
      expect(result).toContain("display: flex");
    });
  });

  describe("disabled feature", () => {
    it("leaves @content in output when the feature is disabled", async () => {
      const result = await run("@mixin foo { a { @content; } } @include foo { color: red; }", { disable: "@content" });

      expect(result).toContain("@content");
    });
  });

  describe("unresolved @content", () => {
    it("throws when @content is used outside a mixin by default", async () => {
      await expect(run("a { @content; }")).rejects.toThrow();
    });

    it("emits a warning when @content is outside a mixin and unresolved=warn", async () => {
      const result = await postcss([plugin({ unresolved: "warn" })]).process("a { @content; }", { from: undefined });

      const warnings = result.warnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].text).toContain("@content");
    });

    it("leaves @content in output when outside a mixin and unresolved=ignore", async () => {
      const result = await run("a { @content; }", { unresolved: "ignore" });

      expect(result).toContain("@content");
    });
  });
});
