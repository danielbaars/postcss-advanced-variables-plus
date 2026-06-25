import type { Plugin } from "postcss";
import { transformNode } from "./lib/transform-node.js";
import { createImportResolver } from "./lib/import-resolver.js";
import type { PluginOptions } from "./options.js";

export type { PluginOptions };
export type { ImportResolution, ImportResolve, ImportFilter } from "./options.js";
export { createImportResolver } from "./lib/import-resolver.js";
export type { ImportResolverOptions } from "./lib/import-resolver.js";

const matchProtocol = /^(?:[A-z]+:)?\/\//;

const allFeatures = ["@content", "@each", "@else", "@if", "@include", "@import", "@for", "@mixin"];

const plugin = (opts: PluginOptions = {}): Plugin => ({
  postcssPlugin: "postcss-advanced-variables-plus",
  Root(root, { result }) {
    const disabledFeatures = String(opts.disable ?? "").split(/\s*,\s*|\s+,?\s*|\s,?\s+/);
    const transform = allFeatures.filter((f) => !disabledFeatures.includes(f));
    const unresolved = opts.unresolved ?? "throw";
    const importCache = opts.importCache ?? {};
    const importFilter = opts.importFilter ?? ((id: string) => !matchProtocol.test(id));
    const importPaths = [...(opts.importPaths ?? [])];
    const importRoot = opts.importRoot ?? process.cwd();
    const importResolve = opts.importResolve ?? createImportResolver({ aliases: opts.aliases ?? {} });

    return transformNode(root, {
      result,
      importCache,
      importFilter,
      importPaths,
      importResolve,
      importRoot,
      transform,
      unresolved,
      variables: opts.variables,
    });
  },
});

plugin.postcss = true;

// PostCSS plugin convention requires a default export as the package's primary entry point.
export default plugin;
