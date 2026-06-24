import { describe, expect, it } from "vitest";
import postcss from "postcss";
import plugin from "../index.js";

const run = (input: string, opts: Parameters<typeof plugin>[0] = {}) =>
  postcss([plugin(opts)])
    .process(input, { from: undefined })
    .then((r) => r.css);

describe("transformForAtrule", () => {
  describe("loop direction", () => {
    it("counts down when start is greater than end", async () => {
      const result = await run("@for $i from 3 through 1 { .item-$i { x: $i; } }");

      expect(result).toContain(".item-3");
      expect(result).toContain(".item-2");
      expect(result).toContain(".item-1");
    });

    it("does not include values outside the reverse range", async () => {
      const result = await run("@for $i from 3 through 1 { .item-$i { x: $i; } }");

      expect(result).not.toContain(".item-0");
      expect(result).not.toContain(".item-4");
    });
  });

  describe("custom step", () => {
    it("increments by the given step value", async () => {
      const result = await run("@for $i from 1 through 9 by 2 { .step-$i { x: $i; } }");

      expect(result).toContain(".step-1");
      expect(result).toContain(".step-3");
      expect(result).toContain(".step-5");
      expect(result).toContain(".step-7");
      expect(result).toContain(".step-9");
    });

    it("does not include values skipped by the step", async () => {
      const result = await run("@for $i from 1 through 9 by 2 { .step-$i { x: $i; } }");

      expect(result).not.toContain(".step-2");
      expect(result).not.toContain(".step-4");
    });

    it("applies custom step on a reverse loop", async () => {
      const result = await run("@for $i from 9 through 1 by 2 { .step-$i { x: $i; } }");

      expect(result).toContain(".step-9");
      expect(result).toContain(".step-7");
      expect(result).toContain(".step-5");
      expect(result).toContain(".step-3");
      expect(result).toContain(".step-1");
      expect(result).not.toContain(".step-8");
    });
  });

  describe("disabled feature", () => {
    it("leaves @for in output when the feature is disabled", async () => {
      const result = await run("@for $i from 1 through 3 { .i { x: 1; } }", { disable: "@for" });

      expect(result).toContain("@for");
    });
  });
});
