import getReplacedString from "./get-replaced-string.js";
import setVariable from "./set-variable.js";
import waterfall from "./waterfall.js";
import transformNode from "./transform-node.js";
import { list } from "postcss";
import type { AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import type { WithVariables } from "./get-variables.js";

const getForOpts = (node: AtRule, opts: TransformOpts) => {
  const params = list.space(node.params);
  const varname = params[0]!.trim().slice(1);
  const start = Number(getReplacedString(params[2]!, node as unknown as WithVariables, opts));
  const end = Number(getReplacedString(params[4]!, node as unknown as WithVariables, opts));
  const increment = params[6] !== undefined ? Number(getReplacedString(params[6], node as unknown as WithVariables, opts)) : 1;
  return { varname, start, end, increment };
};

const transformForAtrule = (rule: AtRule, opts: TransformOpts): Promise<void> | undefined => {
  if (!opts.transform.includes("@for")) return undefined;

  const { varname, start, end, increment } = getForOpts(rule, opts);
  const direction = start <= end ? 1 : -1;
  const replacements: import("postcss").ChildNode[] = [];
  const ruleClones: AtRule[] = [];

  for (let i = start; i * direction <= end * direction; i += increment * direction) {
    setVariable(rule as unknown as WithVariables, varname, i, opts);
    const clone = rule.clone() as AtRule;
    clone.parent = rule.parent ?? undefined;
    (clone as unknown as WithVariables).variables = Object.assign({}, (rule as unknown as WithVariables).variables);
    ruleClones.push(clone);
  }

  return waterfall(ruleClones, clone =>
    transformNode(clone, opts).then(() => {
      replacements.push(...(clone.nodes ?? []));
    })
  ).then(() => {
    rule.parent!.insertBefore(rule, replacements);
    rule.remove();
  });
};

export default transformForAtrule;
