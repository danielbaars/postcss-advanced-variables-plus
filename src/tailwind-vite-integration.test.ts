import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import plugin from "./index.js";

const createTailwindFixture = async (): Promise<string> => {
  const fixtureRoot = path.join(process.cwd(), ".tmp", "tailwind-vite-integration");

  await mkdir(fixtureRoot, { recursive: true });

  const fixtureDir = await mkdtemp(path.join(fixtureRoot, "fixture-"));
  const srcDir = path.join(fixtureDir, "src");

  await mkdir(srcDir);
  await Promise.all([
    writeFile(
      path.join(fixtureDir, "index.html"),
      [
        "<!doctype html>",
        "<html>",
        "  <head>",
        '    <meta charset="UTF-8" />',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        "  </head>",
        "  <body>",
        '    <div class="fixture grid"></div>',
        '    <script type="module" src="/src/main.js"></script>',
        "  </body>",
        "</html>",
      ].join("\n"),
    ),
    writeFile(path.join(srcDir, "main.js"), 'import "./styles.css";\n'),
    writeFile(
      path.join(srcDir, "mixins.css"),
      ["@mixin full-size {", "  inline-size: 100%;", "  block-size: 100%;", "}"].join("\n"),
    ),
    writeFile(
      path.join(srcDir, "styles.css"),
      ['@import "tailwindcss";', '@import "./mixins.css";', "", ".fixture {", "  @include full-size;", "}"].join("\n"),
    ),
  ]);

  return fixtureDir;
};

describe("Tailwind and Vite integration", () => {
  it("expands mixins before Tailwind 4 processes a production Vite build", async () => {
    const fixtureDir = await createTailwindFixture();
    const [{ default: tailwind }, { build }] = await Promise.all([import("@tailwindcss/postcss"), import("vite")]);

    try {
      const result = await build({
        root: fixtureDir,
        configFile: false,
        logLevel: "silent",
        css: {
          postcss: {
            plugins: [plugin(), tailwind()],
          },
        },
        build: {
          write: false,
          rollupOptions: {
            input: path.join(fixtureDir, "index.html"),
          },
        },
      });

      if ("close" in result) {
        throw new Error("Expected Vite build output, received a Rollup watcher");
      }

      const outputs = Array.isArray(result) ? result : [result];
      const cssChunks: string[] = [];

      for (const output of outputs) {
        for (const item of output.output) {
          if (item.type === "asset" && item.fileName.endsWith(".css")) {
            cssChunks.push(String(item.source));
          }
        }
      }

      const css = cssChunks.join("\n");

      expect(css).toContain("tailwindcss v4.");
      expect(css).toContain(".grid{display:grid}");
      expect(css).toContain(".fixture{block-size:100%;inline-size:100%}");
      expect(css).not.toContain("@include");
    } finally {
      await rm(fixtureDir, { recursive: true, force: true });
    }
  });
});
