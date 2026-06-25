import { list, type AtRule, type ChildNode } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { getReplacedString } from "./get-replaced-string.js";
import { setVariable } from "./set-variable.js";
import { transformNode } from "./transform-node.js";
import { evaluateExpression } from "./evaluate-expression.js";

const resolveNumber = (raw: string, node: AtRule, opts: TransformOpts): number => {
  const str = getReplacedString(raw, node, opts);
  const n = evaluateExpression(str);
  return n !== null ? n : Number(str);
};

const getForOpts = (node: AtRule, opts: TransformOpts) => {
  const params = list.space(node.params);
  const varname = params[0]!.trim().slice(1);
  const start = resolveNumber(params[2]!, node, opts);
  const end = resolveNumber(params[4]!, node, opts);
  const increment = params[6] !== undefined ? resolveNumber(params[6], node, opts) : 1;
  return { varname, start, end, increment };
};

export const transformForAtrule = async (rule: AtRule, opts: TransformOpts): Promise<void> => {
  if (!opts.transform.includes("@for")) return;

  const parent = rule.parent;
  if (!parent) return;

  const { varname, start, end, increment } = getForOpts(rule, opts);
  const direction = start <= end ? 1 : -1;
  const replacements: ChildNode[] = [];

  for (let i = start; i * direction <= end * direction; i += increment * direction) {
    setVariable(rule, varname, i, opts);
    const clone = rule.clone() as AtRule;
    clone.parent = parent;
    clone.variables = Object.assign({}, rule.variables);
    await transformNode(clone, opts);
    replacements.push(...(clone.nodes ?? []));
  }

  parent.insertBefore(rule, replacements);
  rule.remove();
};
