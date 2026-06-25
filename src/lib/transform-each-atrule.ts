import type { AtRule, ChildNode } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { getReplacedString } from "./get-replaced-string.js";
import { getValueAsObject } from "./get-value-as-object.js";
import { setVariable } from "./set-variable.js";
import { transformNode } from "./transform-node.js";
import type { VariableValue, VariableMap } from "./get-variables.js";

const matchInOperator = " in ";

const getEachOpts = (node: AtRule, opts: TransformOpts) => {
  const params = node.params.split(matchInOperator);
  const args = (params[0] ?? "").trim().split(" ");
  const varname = args[0]!.trim().slice(1);
  const incname = args.length > 1 ? args[1]!.trim().slice(1) : undefined;
  const rawlist = getValueAsObject(getReplacedString(params.slice(1).join(matchInOperator), node, opts));
  const resolvedList = typeof rawlist === "string" ? [rawlist] : rawlist;
  return { varname, incname, list: resolvedList as VariableMap | VariableValue[] };
};

export const transformEachAtrule = async (rule: AtRule, opts: TransformOpts): Promise<void> => {
  if (!opts.transform.includes("@each")) return;

  const parent = rule.parent;
  if (!parent) return;

  const { varname, incname, list: eachList } = getEachOpts(rule, opts);
  const replacements: ChildNode[] = [];

  for (const key of Object.keys(eachList)) {
    setVariable(rule, varname, (eachList as VariableMap)[key]!, opts);
    if (incname) setVariable(rule, incname, key, opts);
    const clone = rule.clone() as AtRule;
    clone.parent = parent;
    clone.variables = Object.assign({}, rule.variables);
    await transformNode(clone, opts);
    replacements.push(...(clone.nodes ?? []));
  }

  parent.insertBefore(rule, replacements);
  rule.remove();
};
