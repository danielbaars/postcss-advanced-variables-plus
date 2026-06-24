import { describe, expect, it } from "vitest";
import postcss from "postcss";
import plugin from "../index.js";

const run = (input: string, opts: Parameters<typeof plugin>[0] = {}) =>
  postcss([plugin(opts)])
    .process(input, { from: undefined })
    .then((r) => r.css);

describe("transformIfAtrule", () => {
  describe("single-operand form", () => {
    it("keeps block when the value is truthy", async () => {
      const result = await run("@if true { a { x: yes; } }");

      expect(result).toContain("x: yes");
    });

    it("removes block when the value is falsy", async () => {
      const result = await run("@if false { a { x: yes; } }");

      expect(result).not.toContain("x: yes");
    });

    it("treats a non-empty string variable as truthy", async () => {
      const result = await run("$v: red; @if $v { a { x: yes; } }");

      expect(result).toContain("x: yes");
    });
  });

  describe("!= operator", () => {
    it("keeps block when values are not equal", async () => {
      const result = await run("$x: 1; @if $x != 2 { a { x: yes; } }");

      expect(result).toContain("x: yes");
    });

    it("removes block when values are equal", async () => {
      const result = await run("$x: 1; @if $x != 1 { a { x: yes; } }");

      expect(result).not.toContain("x: yes");
    });
  });

  describe("numeric comparison operators", () => {
    it.each([
      { op: "<", left: 1, right: 3, keeps: true },
      { op: "<", left: 3, right: 1, keeps: false },
      { op: "<=", left: 3, right: 3, keeps: true },
      { op: "<=", left: 4, right: 3, keeps: false },
      { op: ">", left: 5, right: 3, keeps: true },
      { op: ">", left: 1, right: 3, keeps: false },
      { op: ">=", left: 3, right: 3, keeps: true },
      { op: ">=", left: 2, right: 3, keeps: false },
    ])("$left $op $right keeps=$keeps", async ({ op, left, right, keeps }) => {
      const result = await run(`$x: ${left}; @if $x ${op} ${right} { a { x: yes; } }`);

      if (keeps) {
        expect(result).toContain("x: yes");
      } else {
        expect(result).not.toContain("x: yes");
      }
    });
  });

  describe("string comparison", () => {
    it("keeps block when string values match", async () => {
      const result = await run("$v: red; @if $v == red { a { x: yes; } }");

      expect(result).toContain("x: yes");
    });

    it("removes block when string values do not match", async () => {
      const result = await run("$v: red; @if $v == blue { a { x: yes; } }");

      expect(result).not.toContain("x: yes");
    });
  });

  describe("disabled feature", () => {
    it("leaves @if in output when the feature is disabled", async () => {
      const result = await run("@if true { a { x: yes; } }", { disable: "@if" });

      expect(result).toContain("@if");
    });
  });
});
