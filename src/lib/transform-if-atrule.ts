import { list, type AtRule, type ChildNode } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { getReplacedString } from "./get-replaced-string.js";
import { transformNode } from "./transform-node.js";

const getInterprettedString = (value: string): boolean | number | string => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (!isNaN(Number(value))) return Number(value);
  return value;
};

const isIfTruthy = (node: AtRule, opts: TransformOpts): boolean => {
  const params = list.space(node.params);
  const left = getInterprettedString(getReplacedString(params[0] ?? "", node, opts));
  const operator = params[1];
  const right = getInterprettedString(getReplacedString(params[2] ?? "", node, opts));

  return (
    (!operator && Boolean(left)) ||
    (operator === "==" && left === right) ||
    (operator === "!=" && left !== right) ||
    (operator === "<" && (left as number) < (right as number)) ||
    (operator === "<=" && (left as number) <= (right as number)) ||
    (operator === ">" && (left as number) > (right as number)) ||
    (operator === ">=" && (left as number) >= (right as number))
  );
};

const isElseRule = (node: ChildNode | undefined): node is AtRule =>
  node != null && node.type === "atrule" && (node as AtRule).name === "else";

const transformAndInsertBeforeParent = async (node: AtRule, opts: TransformOpts): Promise<void> => {
  const parent = node.parent;
  await transformNode(node, opts);
  if (parent) parent.insertBefore(node, node.nodes ?? []);
};

export const transformIfAtrule = async (rule: AtRule, opts: TransformOpts): Promise<void> => {
  if (!opts.transform.includes("@if")) return;

  const isTruthy = isIfTruthy(rule, opts);
  const next = rule.next();

  if (isTruthy) await transformAndInsertBeforeParent(rule, opts);
  rule.remove();

  if (opts.transform.includes("@else") && isElseRule(next)) {
    if (!isTruthy) await transformAndInsertBeforeParent(next, opts);
    next.remove();
  }
};
