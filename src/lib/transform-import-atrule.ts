import path from "node:path";
import postcss, { type AtRule, type Plugin, type Container } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { manageUnresolved } from "./manage-unresolved.js";
import { getReplacedString } from "./get-replaced-string.js";
import { transformNode } from "./transform-node.js";

const trimWrappingQuotes = (string: string): string => string.replace(/^("|')([\W\w]*)\1$/, "$2");
const trimWrappingURL = (string: string): string => trimWrappingQuotes(string.replace(/^url\(([\W\w]*)\)$/, "$1"));

const noopPlugin = (): Plugin => ({ postcssPlugin: "noop-plugin", Once() {} });
noopPlugin.postcss = true;
const processor = postcss([noopPlugin()]);

const getImportOpts = (node: AtRule, opts: TransformOpts) => {
  const { list } = postcss;
  const [rawid, ...medias] = list.space(node.params);
  const id = getReplacedString(trimWrappingURL(rawid!), node, opts);
  const media = medias.join(" ");
  const cwf = node.source?.input?.file ?? opts.result.opts.from;
  const cwd = cwf ? path.dirname(cwf) : opts.importRoot;
  return { id, media, cwf, cwd };
};

export const transformImportAtrule = async (rule: AtRule, opts: TransformOpts): Promise<void> => {
  if (!opts.transform.includes("@import")) return;

  const { id, media, cwf, cwd } = getImportOpts(rule, opts);
  const options = opts.result.opts;
  const parser = options.parser ?? (options.syntax as { parse?: unknown } | undefined)?.parse ?? null;

  const shouldImport =
    (opts.importFilter instanceof Function && opts.importFilter(id, media)) ||
    (opts.importFilter instanceof RegExp && opts.importFilter.test(id));

  if (!shouldImport) return;

  const cwds = [cwd, ...opts.importPaths];
  let resolved: { file: string; contents: string } | undefined;

  for (const thiscwd of cwds) {
    try {
      resolved = await opts.importResolve(id, thiscwd);
      break;
    } catch {
      // try next path
    }
  }

  if (!resolved) {
    manageUnresolved(rule, opts, "@import", `Could not resolve the @import for "${id}"`);
    return;
  }

  const { file, contents } = resolved;
  const { root } = await processor.process(
    contents,
    parser != null
      ? { from: file, parser: parser as NonNullable<Parameters<typeof processor.process>[1]["parser"]> }
      : { from: file },
  );

  opts.result.messages.push({ type: "dependency", file, parent: cwf ?? "" });
  const nodes = root.nodes.slice(0);

  if (media) {
    const mediaRule = postcss.atRule({
      name: "media",
      params: media,
      ...(rule.source != null ? { source: rule.source } : {}),
    });
    mediaRule.append(nodes);
    rule.replaceWith(mediaRule);
  } else {
    rule.replaceWith(nodes);
  }

  await transformNode({ nodes } as Container, opts);
};
