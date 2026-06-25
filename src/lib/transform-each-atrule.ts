import { list, type AtRule, type ChildNode } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { getReplacedString } from "./get-replaced-string.js";
import { getValueAsObject } from "./get-value-as-object.js";
import { setVariable } from "./set-variable.js";
import { transformNode } from "./transform-node.js";
import type { VariableValue, VariableMap } from "./get-variables.js";

const matchInOperator = " in ";

const getVariableName = (rawName: string | undefined): string => (rawName ?? "").trim().replace(/^\$/, "");

const getEachOpts = (node: AtRule, opts: TransformOpts) => {
  const params = node.params.split(matchInOperator);
  const rawArgs = (params[0] ?? "").trim();
  const isCommaSyntax = rawArgs.includes(",");
  const args = isCommaSyntax ? list.comma(rawArgs) : rawArgs.split(/\s+/);
  const varname = getVariableName(args[0]);
  const incname = args.length > 1 ? getVariableName(args[1]) : undefined;
  const rawlist = getValueAsObject(getReplacedString(params.slice(1).join(matchInOperator), node, opts));
  const resolvedList = typeof rawlist === "string" ? [rawlist] : rawlist;
  return { varname, incname, isCommaSyntax, list: resolvedList as VariableMap | VariableValue[] };
};

export const transformEachAtrule = async (rule: AtRule, opts: TransformOpts): Promise<void> => {
  if (!opts.transform.includes("@each")) return;

  const parent = rule.parent;
  if (!parent) return;

  const { varname, incname, isCommaSyntax, list: eachList } = getEachOpts(rule, opts);
  const replacements: ChildNode[] = [];
  const isMap = !Array.isArray(eachList);

  for (const key of Object.keys(eachList)) {
    const value = (eachList as VariableMap)[key];
    if (value === undefined) continue;

    if (isCommaSyntax && isMap && incname) {
      setVariable(rule, varname, key, opts);
      setVariable(rule, incname, value, opts);
    } else {
      setVariable(rule, varname, value, opts);
      if (incname) setVariable(rule, incname, key, opts);
    }

    const clone = rule.clone() as AtRule;
    clone.parent = parent;
    clone.variables = Object.assign({}, rule.variables);
    await transformNode(clone, opts);
    replacements.push(...(clone.nodes ?? []));
  }

  parent.insertBefore(rule, replacements);
  rule.remove();
};
