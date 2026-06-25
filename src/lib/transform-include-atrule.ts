import { list, type AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { getClosestVariable } from "./get-closest-variable.js";
import { getReplacedString } from "./get-replaced-string.js";
import { setVariable } from "./set-variable.js";
import { manageUnresolved } from "./manage-unresolved.js";
import { transformNode } from "./transform-node.js";

const getIncludeOpts = (node: AtRule, opts: TransformOpts) => {
  const resolved = getReplacedString(node.params, node, opts);
  const openParenIndex = resolved.indexOf("(");
  const name = openParenIndex === -1 ? resolved.trim() : resolved.slice(0, openParenIndex).trim();
  const args = openParenIndex === -1 ? [] : list.comma(resolved.slice(openParenIndex + 1, -1));
  return { name, args };
};

export const transformIncludeAtrule = async (rule: AtRule, opts: TransformOpts): Promise<void> => {
  if (!opts.transform.includes("@include")) return;

  const { name, args } = getIncludeOpts(rule, opts);
  const mixin = getClosestVariable(`@mixin ${name}`, rule.parent, opts) as
    | { params: { name: string; value: string | undefined }[]; rule: AtRule }
    | undefined;

  if (mixin) {
    const parent = rule.parent;
    if (!parent) return;

    mixin.params.forEach((param, index) => {
      const arg = index in args ? getReplacedString(args[index]!, rule, opts) : param.value;
      if (arg !== undefined) setVariable(rule, param.name, arg, opts);
    });

    const clone = mixin.rule.clone() as AtRule;
    // `original` links the mixin clone back to the @include node for @content resolution.
    (clone as unknown as { original?: AtRule }).original = rule;
    clone.parent = parent;
    if (rule.variables !== undefined) clone.variables = rule.variables;

    await transformNode(clone, opts);
    parent.insertBefore(rule, clone.nodes ?? []);
    rule.remove();
  } else {
    manageUnresolved(rule, opts, name, `Could not resolve the mixin for "${name}"`);
  }
};
