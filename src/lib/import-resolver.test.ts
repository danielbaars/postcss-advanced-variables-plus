import { describe, it, expect, vi, beforeEach } from "vitest";
import { createImportResolver } from "./import-resolver.js";
import * as fs from "node:fs/promises";
import path from "node:path";

vi.mock("node:fs/promises");

const mockReadFile = vi.mocked(fs.readFile);

beforeEach(() => {
  vi.resetAllMocks();
});

const CSS_CONTENT = "body { color: red; }";

describe("createImportResolver", () => {
  it("resolves a relative path", async () => {
    mockReadFile.mockResolvedValue(CSS_CONTENT as never);
    const resolver = createImportResolver();
    const cwd = "/project/styles";
    const result = await resolver("./foo.css", cwd);
    expect(result.file).toBe(path.resolve(cwd, "./foo.css"));
    expect(result.contents).toBe(CSS_CONTENT);
  });

  it("resolves an absolute path", async () => {
    mockReadFile.mockResolvedValue(CSS_CONTENT as never);
    const resolver = createImportResolver();
    const result = await resolver("/absolute/path/to/tokens.css", "/any/cwd");
    expect(result.file).toBe("/absolute/path/to/tokens.css");
    expect(result.contents).toBe(CSS_CONTENT);
  });

  it("resolves an alias exact match", async () => {
    mockReadFile.mockResolvedValue(CSS_CONTENT as never);
    const resolver = createImportResolver({
      aliases: { "@tokens": "/path/to/tokens.css" },
    });
    const result = await resolver("@tokens", "/project");
    expect(result.file).toBe(path.resolve("/path/to/tokens.css"));
    expect(result.contents).toBe(CSS_CONTENT);
  });

  it("resolves an alias prefix match", async () => {
    mockReadFile.mockResolvedValue(CSS_CONTENT as never);
    const resolver = createImportResolver({
      aliases: { "@tokens": "/path/to/tokens" },
    });
    const result = await resolver("@tokens/color.css", "/project");
    expect(result.file).toBe(path.resolve("/path/to/tokens/color.css"));
    expect(result.contents).toBe(CSS_CONTENT);
  });

  it("longest alias wins when multiple aliases could match", async () => {
    mockReadFile.mockResolvedValue(CSS_CONTENT as never);
    const resolver = createImportResolver({
      aliases: {
        "@tokens": "/short",
        "@tokens/color": "/long",
      },
    });
    // "@tokens/color/base.css" matches both "@tokens" (prefix) and "@tokens/color" (prefix).
    // Longest key "@tokens/color" (13 chars) wins over "@tokens" (7 chars).
    const result = await resolver("@tokens/color/base.css", "/project");
    expect(result.file).toBe(path.resolve("/long/base.css"));
  });

  it("resolves a package specifier via import.meta.resolve", async () => {
    mockReadFile.mockResolvedValue(CSS_CONTENT as never);
    const resolver = createImportResolver({
      resolveId: () => "file:///node_modules/some-package/index.css",
    });
    const result = await resolver("some-package/index.css", "/project");
    expect(result.file).toBe("/node_modules/some-package/index.css");
    expect(result.contents).toBe(CSS_CONTENT);
  });

  it("throws a resolution error containing the id and cwd when resolution fails", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));
    const resolver = createImportResolver();
    await expect(resolver("./missing.css", "/project/styles")).rejects.toThrow(
      /Failed to resolve CSS import "\.\/missing\.css" from "\/project\/styles"/
    );
  });
});
