import { describe, expect, it } from "vitest";
import postcss from "postcss";
import plugin from "../index.js";

const run = (input: string, opts: Parameters<typeof plugin>[0] = {}) =>
  postcss([plugin(opts)])
    .process(input, { from: undefined })
    .then((r) => r.css);

describe("transformIncludeAtrule", () => {
  describe("unresolved @include", () => {
    it("throws when the mixin cannot be found by default", async () => {
      await expect(run("@include undefined-mixin;")).rejects.toThrow();
    });

    it("emits a warning when the mixin cannot be found and unresolved=warn", async () => {
      const result = await postcss([plugin({ unresolved: "warn" })]).process("@include undefined-mixin;", {
        from: undefined,
      });

      const warnings = result.warnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].text).toContain("undefined-mixin");
    });

    it("leaves @include in output when mixin is not found and unresolved=ignore", async () => {
      const result = await run("@include undefined-mixin;", { unresolved: "ignore" });

      expect(result).toContain("@include");
    });
  });
});
