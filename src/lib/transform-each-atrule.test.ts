import { describe, expect, it } from "vitest";
import postcss from "postcss";
import plugin from "../index.js";

const run = (input: string, opts: Parameters<typeof plugin>[0] = {}) =>
  postcss([plugin(opts)])
    .process(input, { from: undefined })
    .then((r) => r.css);

describe("transformEachAtrule", () => {
  describe("index variable", () => {
    it("exposes the numeric index as a second variable", async () => {
      const result = await run("@each $v $i in (a, b, c) { .item-$i { content: $v; } }");

      expect(result).toContain(".item-0");
      expect(result).toContain(".item-1");
      expect(result).toContain(".item-2");
    });

    it("pairs each value with its correct index", async () => {
      const result = await run("@each $v $i in (a, b, c) { .item-$i { content: $v; } }");

      expect(result).toContain("content: a");
      expect(result).toContain("content: b");
      expect(result).toContain("content: c");
    });

    it("supports comma syntax for list values and indexes", async () => {
      const result = await run('@each $v, $i in (a, b, c) { .item-$i { content: "$v"; } }');

      expect(result).toContain(".item-0");
      expect(result).toContain(".item-1");
      expect(result).toContain(".item-2");
      expect(result).toContain('content: "a"');
      expect(result).toContain('content: "b"');
      expect(result).toContain('content: "c"');
    });
  });

  describe("single bare value", () => {
    it("iterates over a single value without parentheses", async () => {
      const result = await run("@each $v in red { a { color: $v; } }");

      expect(result).toContain("color: red");
      expect(result).not.toContain("@each");
    });
  });

  describe("key-value map iteration", () => {
    it("iterates over map values", async () => {
      const result = await run("@each $v in (color: red, size: 10) { a { x: $v; } }");

      expect(result).toContain("x: red");
      expect(result).toContain("x: 10");
    });

    it("exposes map keys as the index variable", async () => {
      const result = await run("@each $v $k in (color: red, size: 10) { .prop-$k { x: $v; } }");

      expect(result).toContain(".prop-color");
      expect(result).toContain(".prop-size");
    });

    it("iterates over map values when key-variable syntax is used", async () => {
      const result = await run("@each $v $k in (color: red, size: 10) { .prop-$k { x: $v; } }");

      expect(result).toContain("x: red");
      expect(result).toContain("x: 10");
    });

    it("supports Sass comma syntax for map keys and values", async () => {
      const result = await run('@each $key, $value in (one: "1", two: "2") { .prop-$key { x: $value; } }');

      expect(result).toContain(".prop-one");
      expect(result).toContain(".prop-two");
      expect(result).toContain('x: "1"');
      expect(result).toContain('x: "2"');
    });

    it("keeps legacy space syntax as value then key for map iteration", async () => {
      const result = await run('@each $value $key in (one: "1", two: "2") { .prop-$key { x: $value; } }');

      expect(result).toContain(".prop-one");
      expect(result).toContain(".prop-two");
      expect(result).toContain('x: "1"');
      expect(result).toContain('x: "2"');
    });

    it("supports quoted map keys in Sass comma syntax", async () => {
      const result = await run('@each $key, $value in ("one": "1", "two": "2") { .prop-$key { x: $value; } }');

      expect(result).toContain(".prop-one");
      expect(result).toContain(".prop-two");
      expect(result).toContain('x: "1"');
      expect(result).toContain('x: "2"');
    });
  });

  describe("disabled feature", () => {
    it("leaves @each in output when the feature is disabled", async () => {
      const result = await run("@each $v in (a, b) { .$v { x: 1; } }", { disable: "@each" });

      expect(result).toContain("@each");
    });
  });
});
