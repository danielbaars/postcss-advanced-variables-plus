import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ImportResolution, ImportResolve } from "../options.js";

export type ImportResolverOptions = {
  readonly aliases?: Readonly<Record<string, string>>;
  /** Override the specifier-to-file-URL resolver. Defaults to `import.meta.resolve`. Useful for Vite integration or testing. */
  readonly resolveId?: (id: string, base: string) => string;
};

const getBaseUrl = (cwd: string): string => {
  return new URL("./", pathToFileURL(path.resolve(cwd))).href;
};

const resolveAliasImport = (id: string, aliases: Readonly<Record<string, string>>): string | undefined => {
  const sortedAliases = Object.entries(aliases).sort(([left], [right]) => right.length - left.length);

  for (const [alias, target] of sortedAliases) {
    if (id === alias) {
      return target;
    }

    if (id.startsWith(`${alias}/`)) {
      return path.join(target, id.slice(alias.length + 1));
    }
  }

  return undefined;
};

const isFileUrl = (url: URL): boolean => {
  return url.protocol === "file:";
};

const createResolutionError = (id: string, cwd: string, cause: unknown): Error => {
  const message = cause instanceof Error ? cause.message : String(cause);
  return new Error(`Failed to resolve CSS import "${id}" from "${cwd}": ${message}`, { cause });
};

const resolveLocalPath = (id: string, cwd: string, aliases: Readonly<Record<string, string>>): string | undefined => {
  const aliasedPath = resolveAliasImport(id, aliases);
  if (aliasedPath) return path.resolve(aliasedPath);
  if (path.isAbsolute(id)) return id;
  if (id.startsWith(".")) return path.resolve(cwd, id);
  return undefined;
};

const defaultResolveId = (id: string, base: string): string => import.meta.resolve(id, base);

export const createImportResolver = (options: ImportResolverOptions = {}): ImportResolve => {
  const aliases = options.aliases ?? {};
  const resolveId = options.resolveId ?? defaultResolveId;

  const resolvePackagePath = (id: string, cwd: string): string => {
    const resolvedUrl = new URL(resolveId(id, getBaseUrl(cwd)));
    if (!isFileUrl(resolvedUrl)) {
      throw new Error(`Resolved import "${id}" from "${cwd}" to non-file URL "${resolvedUrl.href}"`);
    }
    return fileURLToPath(resolvedUrl);
  };

  return async (id: string, cwd: string): Promise<ImportResolution> => {
    try {
      const file = resolveLocalPath(id, cwd, aliases) ?? resolvePackagePath(id, cwd);
      const contents = await readFile(file, "utf8");
      return { contents, file };
    } catch (cause) {
      throw createResolutionError(id, cwd, cause);
    }
  };
};
