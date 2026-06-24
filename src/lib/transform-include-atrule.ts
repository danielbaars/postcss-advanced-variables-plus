import { list } from "postcss";
import getClosestVariable from "./get-closest-variable.js";
import getReplacedString from "./get-replaced-string.js";
import setVariable from "./set-variable.js";
import manageUnresolved from "./manage-unresolved.js";
import transformNode from "./transform-node.js";
import type { AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import type { WithVariables } from "./get-variables.js";

const matchOpeningParen = "(";

const getIncludeOpts = (node: AtRule) => {
  const [name, sourceArgs] = node.params.split(matchOpeningParen, 2) as [string, string | undefined];
  const args = sourceArgs ? list.comma(sourceArgs.slice(0, -1)) : [];
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
