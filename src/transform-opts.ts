import type { Result } from "postcss";
import type { PluginOptions, ImportResolve, ImportFilter } from "./options.js";

export type TransformOpts = {
  result: Result;
  importCache: Record<string, unknown>;
  importFilter: ImportFilter;
  importPaths: string[];
  importResolve: ImportResolve;
  importRoot: string;
  transform: string[];
  unresolved: "throw" | "warn" | "ignore";
  variables: PluginOptions["variables"];
};
