import { describe, expect, it, vi } from "vitest";
import postcss from "postcss";
import plugin, { type ImportResolve } from "../index.js";

const makeResolve = (contents: string, file = "/resolved/file.css"): ImportResolve =>
  vi.fn().mockResolvedValue({ file, contents });

const run = (input: string, opts: Parameters<typeof plugin>[0] = {}) =>
  postcss([plugin(opts)]).process(input, { from: undefined });

describe("transformImportAtrule", () => {
  describe("resolving imports", () => {
    it("replaces @import with the resolved file's content", async () => {
      const importResolve = makeResolve(".comp { color: red; }");
      const { css } = await run("@import './comp.css';", { importResolve });

      expect(css).toContain(".comp { color: red; }");
      expect(css).not.toContain("@import");
    });

    it("wraps imported content in @media when a media query is given", async () => {
      const importResolve = makeResolve(".comp { color: red; }");
      const { css } = await run("@import './comp.css' screen;", { importResolve });

      expect(css).toContain("@media screen");
      expect(css).toContain(".comp { color: red; }");
    });

    it("strips single quotes from the import path", async () => {
      const importResolve = makeResolve(".comp {}");
      await run("@import './comp.css';", { importResolve });

      expect(importResolve).toHaveBeenCalledWith("./comp.css", expect.any(String));
    });

    it("strips double quotes from the import path", async () => {
      const importResolve = makeResolve(".comp {}");
      await run('@import "./comp.css";', { importResolve });

      expect(importResolve).toHaveBeenCalledWith("./comp.css", expect.any(String));
    });

    it("strips url() with quotes from the import path", async () => {
      const importResolve = makeResolve(".comp {}");
      await run('@import url("./comp.css");', { importResolve });

      expect(importResolve).toHaveBeenCalledWith("./comp.css", expect.any(String));
    });

    it("strips url() without quotes from the import path", async () => {
      const importResolve = makeResolve(".comp {}");
      await run("@import url(./comp.css);", { importResolve });

      expect(importResolve).toHaveBeenCalledWith("./comp.css", expect.any(String));
    });

    it("interpolates variables in the import path", async () => {
      const importResolve = makeResolve(".theme { color: blue; }", "/styles/theme.css");
      const { css } = await run("$file: theme; @import './$file.css';", { importResolve });

      expect(css).toContain(".theme { color: blue; }");
      expect(importResolve).toHaveBeenCalledWith("./theme.css", expect.any(String));
    });

    it("adds a dependency message for each resolved import", async () => {
      const importResolve = makeResolve(".comp {}", "/styles/comp.css");
      const result = await run("@import './comp.css';", { importResolve });

      const dep = result.messages.find((m) => m.type === "dependency");
      expect(dep).toBeDefined();
      expect(dep?.file).toBe("/styles/comp.css");
    });

    it("tries custom importPaths when the file is not in cwd", async () => {
      const importResolve = vi
        .fn<ImportResolve>()
        .mockRejectedValueOnce(new Error("not in cwd"))
        .mockResolvedValueOnce({ file: "/custom/comp.css", contents: ".comp { color: red; }" });
      const { css } = await run("@import 'comp.css';", { importResolve, importPaths: ["/custom"] });

      expect(css).toContain(".comp { color: red; }");
      expect(importResolve).toHaveBeenCalledWith("comp.css", "/custom");
    });
  });

  describe("importFilter", () => {
    it("skips URL imports by default", async () => {
      const importResolve = vi.fn<ImportResolve>();
      const { css } = await run("@import 'https://example.com/style.css';", { importResolve });

      expect(css).toContain("@import");
      expect(importResolve).not.toHaveBeenCalled();
    });

    it("imports only files matching importFilter RegExp", async () => {
      const importResolve = makeResolve(".comp { color: red; }");
      const { css } = await run("@import './comp.css';", { importResolve, importFilter: /comp/ });

      expect(css).not.toContain("@import");
      expect(css).toContain(".comp { color: red; }");
    });

    it("skips imports not matching importFilter RegExp", async () => {
      const importResolve = vi.fn<ImportResolve>();
      const { css } = await run("@import './other.css';", { importResolve, importFilter: /comp/ });

      expect(css).toContain("@import");
      expect(importResolve).not.toHaveBeenCalled();
    });

    it("imports when importFilter function returns true", async () => {
      const importResolve = makeResolve(".comp { color: red; }");
      const { css } = await run("@import './comp.css';", {
        importResolve,
        importFilter: () => true,
      });

      expect(css).not.toContain("@import");
    });

    it("skips import when importFilter function returns false", async () => {
      const importResolve = vi.fn<ImportResolve>();
      const { css } = await run("@import './comp.css';", {
        importResolve,
        importFilter: () => false,
      });

      expect(css).toContain("@import");
      expect(importResolve).not.toHaveBeenCalled();
    });
  });

  describe("disabled feature", () => {
    it("leaves @import in output when the feature is disabled", async () => {
      const { css } = await run("@import './comp.css';", { disable: "@import" });

      expect(css).toContain("@import");
    });
  });

  describe("unresolved import", () => {
    it("throws when the imported file cannot be resolved by default", async () => {
      const importResolve = vi.fn<ImportResolve>().mockRejectedValue(new Error("ENOENT"));
      await expect(run("@import './missing.css';", { importResolve })).rejects.toThrow();
    });

    it("emits a warning when the file cannot be resolved and unresolved=warn", async () => {
      const importResolve = vi.fn<ImportResolve>().mockRejectedValue(new Error("ENOENT"));
      const result = await postcss([plugin({ importResolve, unresolved: "warn" })]).process(
        "@import './missing.css';",
        { from: undefined },
      );

      expect(result.warnings().length).toBeGreaterThan(0);
    });

    it("leaves @import in output when file is unresolved and unresolved=ignore", async () => {
      const importResolve = vi.fn<ImportResolve>().mockRejectedValue(new Error("ENOENT"));
      const { css } = await run("@import './missing.css';", { importResolve, unresolved: "ignore" });

      expect(css).toContain("@import");
    });
  });
});
