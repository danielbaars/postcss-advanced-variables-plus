import transformNode from "./transform-node.js";
import manageUnresolved from "./manage-unresolved.js";
import type { AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import type { WithVariables } from "./get-variables.js";

const getClosestMixin = (node: AtRule): AtRule | undefined => {
  if (node.type === "atrule" && node.name === "mixin") return node;
  if (node.parent) return getClosestMixin(node.parent as AtRule);
  return undefined;
};

const transformContentAtrule = (rule: AtRule, opts: TransformOpts): Promise<void> | undefined => {
  if (!opts.transform.includes("@content")) return undefined;

  const mixin = getClosestMixin(rule);

  if (mixin) {
    const original = (mixin as unknown as { original?: AtRule }).original;
    if (!original) return undefined;

    const clone = original.clone() as AtRule;
    clone.parent = rule.parent ?? undefined;
    (clone as unknown as WithVariables).variables = (rule as unknown as WithVariables).variables;

    return transformNode(clone, opts).then(() => {
      rule.parent!.insertBefore(rule, clone.nodes ?? []);
      rule.remove();
    });
  } else {
    manageUnresolved(rule, opts, "@content", "Could not resolve the mixin for @content");
  }
};

export default transformContentAtrule;
