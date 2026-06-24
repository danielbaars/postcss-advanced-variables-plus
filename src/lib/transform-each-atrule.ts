import getReplacedString from "./get-replaced-string.js";
import getValueAsObject from "./get-value-as-object.js";
import setVariable from "./set-variable.js";
import waterfall from "./waterfall.js";
import transformNode from "./transform-node.js";
import type { AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import type { WithVariables, VariableValue, VariableMap } from "./get-variables.js";

const matchInOperator = " in ";

const getEachOpts = (node: AtRule, opts: TransformOpts) => {
  const params = node.params.split(matchInOperator);
  const args = (params[0] ?? "").trim().split(" ");
  const varname = args[0]!.trim().slice(1);
  const incname = args.length > 1 ? args[1]!.trim().slice(1) : undefined;
  const rawlist = getValueAsObject(
    getReplacedString(params.slice(1).join(matchInOperator), node as unknown as WithVariables, opts)
  );
  const resolvedList = typeof rawlist === "string" ? [rawlist] : rawlist;
  return { varname, incname, list: resolvedList as VariableMap | VariableValue[] };
};

const transformEachAtrule = (rule: AtRule, opts: TransformOpts): Promise<void> | undefined => {
  if (!opts.transform.includes("@each")) return undefined;

  const { varname, incname, list: eachList } = getEachOpts(rule, opts);
  const replacements: import("postcss").ChildNode[] = [];
  const ruleClones: AtRule[] = [];

  Object.keys(eachList).forEach(key => {
    setVariable(rule as unknown as WithVariables, varname, (eachList as VariableMap)[key]!, opts);
    if (incname) setVariable(rule as unknown as WithVariables, incname, key, opts);

    const clone = rule.clone() as AtRule;
    clone.parent = rule.parent ?? undefined;
    (clone as unknown as WithVariables).variables = Object.assign({}, (rule as unknown as WithVariables).variables);

    ruleClones.push(clone);
  });

  return waterfall(ruleClones, clone =>
    transformNode(clone, opts).then(() => {
      replacements.push(...(clone.nodes ?? []));
    })
  ).then(() => {
    rule.parent!.insertBefore(rule, replacements);
    rule.remove();
  });
};

export default transformEachAtrule;
