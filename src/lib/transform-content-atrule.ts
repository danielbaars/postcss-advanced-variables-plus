import type { AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { transformNode } from "./transform-node.js";
import { manageUnresolved } from "./manage-unresolved.js";

const getClosestMixin = (node: AtRule): AtRule | undefined => {
  if (node.type === "atrule" && node.name === "mixin") return node;
  if (node.parent) return getClosestMixin(node.parent as AtRule);
  return undefined;
};

export const transformContentAtrule = async (rule: AtRule, opts: TransformOpts): Promise<void> => {
  if (!opts.transform.includes("@content")) return;

  const mixin = getClosestMixin(rule);

  if (mixin) {
    // `original` is set dynamically by transform-include-atrule to link the @content back to its @include.
    const original = (mixin as unknown as { original?: AtRule }).original;
    if (!original) return;

    const parent = rule.parent;
    if (!parent) return;

    const clone = original.clone() as AtRule;
    clone.parent = parent;
    if (rule.variables !== undefined) clone.variables = rule.variables;

    await transformNode(clone, opts);
    parent.insertBefore(rule, clone.nodes ?? []);
    rule.remove();
  } else {
    manageUnresolved(rule, opts, "@content", "Could not resolve the mixin for @content");
  }
};
