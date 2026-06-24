import { list } from "postcss";
import getReplacedString from "./get-replaced-string.js";
import setVariable from "./set-variable.js";
import type { AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import type { WithVariables, VariableValue } from "./get-variables.js";

type MixinParam = { name: string; value: string | undefined };

const getMixinOpts = (node: AtRule, opts: TransformOpts) => {
  const openParenIndex = node.params.indexOf("(");
  const name = openParenIndex === -1 ? node.params.trim() : node.params.slice(0, openParenIndex).trim();
  const rawParams = openParenIndex === -1 ? undefined : node.params.slice(openParenIndex + 1, -1).trim();
  const params: MixinParam[] = rawParams
    ? list.comma(rawParams).map(param => {
        const parts = list.split(param, [":"], true);
        const paramName = parts[0]!.slice(1);
        const paramValue = parts.length > 1
          ? getReplacedString(parts.slice(1).join(":"), node as unknown as WithVariables, opts)
          : undefined;
        return { name: paramName, value: paramValue };
      })
    : [];
  return { name, params };
};

const transformMixinAtrule = (rule: AtRule, opts: TransformOpts): void => {
  if (!opts.transform.includes("@mixin")) return;
  const { name, params } = getMixinOpts(rule, opts);
  setVariable(rule.parent as WithVariables, `@mixin ${name}`, { params, rule } as unknown as VariableValue, opts);
  rule.remove();
};

export default transformMixinAtrule;
