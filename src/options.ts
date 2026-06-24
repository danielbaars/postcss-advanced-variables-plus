import type { WithVariables, VariableMap, VariableValue } from "./lib/get-variables.js";

export type ImportResolution = { file: string; contents: string };
export type ImportResolve = (id: string, cwd: string) => Promise<ImportResolution>;
export type ImportFilter = ((id: string, media: string) => boolean) | RegExp;

export type PluginOptions = {
  variables?: VariableMap | ((name: string, node: WithVariables) => VariableValue | undefined);
  unresolved?: "throw" | "warn" | "ignore";
  disable?: string;
  importPaths?: string[];
  importResolve?: ImportResolve;
  importFilter?: ImportFilter;
  importRoot?: string;
  importCache?: Record<string, unknown>;
  aliases?: Readonly<Record<string, string>>;
};
