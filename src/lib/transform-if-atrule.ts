import { list, type AtRule, type ChildNode } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import getReplacedString from "./get-replaced-string.js";
import transformNode from "./transform-node.js";
import type { WithVariables } from "./get-variables.js";

const ifPromise = (condition: unknown, trueFunction: () => Promise<void> | void): Promise<void> =>
  Promise.resolve(condition ? trueFunction() : undefined).then(() => undefined);

const getInterprettedString = (value: string): boolean | number | string => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (!isNaN(Number(value))) return Number(value);
  return value;
};

const isIfTruthy = (node: AtRule, opts: TransformOpts): boolean => {
  const params = list.space(node.params);
  const left = getInterprettedString(getReplacedString(params[0] ?? "", node as unknown as WithVariables, opts));
  const operator = params[1];
  const right = getInterprettedString(getReplacedString(params[2] ?? "", node as unknown as WithVariables, opts));

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

const isElseRule = (node: ChildNode | undefined): boolean =>
  node != null && node.type === "atrule" && (node as AtRule).name === "else";

const transformAndInsertBeforeParent = (node: AtRule, opts: TransformOpts): Promise<void> =>
  transformNode(node, opts).then(() => {
    node.parent!.insertBefore(node, node.nodes ?? []);
  });

const transformIfAtrule = (rule: AtRule, opts: TransformOpts): Promise<void> | undefined => {
  if (!opts.transform.includes("@if")) return undefined;

  const isTruthy = isIfTruthy(rule, opts);
  const next = rule.next() as AtRule | undefined;

  return ifPromise(true, () =>
    ifPromise(isTruthy, () => transformAndInsertBeforeParent(rule, opts)).then(() => {
      rule.remove();
    }),
  ).then(() =>
    ifPromise(opts.transform.includes("@else") && isElseRule(next), () =>
      ifPromise(!isTruthy, () => transformAndInsertBeforeParent(next!, opts)).then(() => {
        next!.remove();
      }),
    ),
  );
};

export default transformIfAtrule;
