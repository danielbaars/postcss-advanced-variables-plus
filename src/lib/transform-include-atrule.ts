import { list } from "postcss";
import getClosestVariable from "./get-closest-variable.js";
import getReplacedString from "./get-replaced-string.js";
import setVariable from "./set-variable.js";
import manageUnresolved from "./manage-unresolved.js";
import transformNode from "./transform-node.js";
import type { AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import type { WithVariables } from "./get-variables.js";

const getIncludeOpts = (node: AtRule) => {
  const openParenIndex = node.params.indexOf("(");
  const name = openParenIndex === -1 ? node.params.trim() : node.params.slice(0, openParenIndex).trim();
  const args = openParenIndex === -1 ? [] : list.comma(node.params.slice(openParenIndex + 1, -1));
  return { name, args };
};

const transformIncludeAtrule = (rule: AtRule, opts: TransformOpts): Promise<void> | undefined => {
  if (!opts.transform.includes("@include")) return undefined;

  const { name, args } = getIncludeOpts(rule);
  const mixin = getClosestVariable(`@mixin ${name}`, rule.parent as WithVariables, opts) as
    | { params: Array<{ name: string; value: string | undefined }>; rule: AtRule }
    | undefined;

  if (mixin) {
    mixin.params.forEach((param, index) => {
      const arg = index in args
        ? getReplacedString(args[index]!, rule as unknown as WithVariables, opts)
        : param.value;
      if (arg !== undefined) setVariable(rule as unknown as WithVariables, param.name, arg, opts);
    });

    const clone = mixin.rule.clone() as AtRule;
    (clone as unknown as { original?: AtRule }).original = rule;
    clone.parent = rule.parent ?? undefined;
    (clone as unknown as WithVariables).variables = (rule as unknown as WithVariables).variables;

    return transformNode(clone, opts).then(() => {
      rule.parent!.insertBefore(rule, clone.nodes ?? []);
      rule.remove();
    });
  } else {
    manageUnresolved(rule, opts, name, `Could not resolve the mixin for "${name}"`);
  }
};

export default transformIncludeAtrule;
