import { list, type AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { getClosestVariable } from "./get-closest-variable.js";
import { getReplacedString } from "./get-replaced-string.js";
import { setVariable } from "./set-variable.js";
import { manageUnresolved } from "./manage-unresolved.js";
import { transformNode } from "./transform-node.js";

type IncludeArg = { type: "named"; name: string; value: string } | { type: "positional"; value: string };

const getCallOpenParenIndex = (params: string): number => {
  for (let index = 0; index < params.length; index += 1) {
    if (params[index] === "(" && params[index - 1] !== "$") return index;
  }

  return -1;
};

const parseIncludeArg = (arg: string): IncludeArg => {
  const namedArg = arg.match(/^\$([A-Za-z][\w-]*)\s*:\s*([\s\S]*)$/);
  const name = namedArg?.[1];
  const value = namedArg?.[2];

  return name !== undefined && value !== undefined
    ? { type: "named", name, value }
    : { type: "positional", value: arg };
};

const getIncludeOpts = (node: AtRule, opts: TransformOpts) => {
  const openParenIndex = getCallOpenParenIndex(node.params);
  const rawName = openParenIndex === -1 ? node.params.trim() : node.params.slice(0, openParenIndex).trim();
  const name = getReplacedString(rawName, node, opts);
  const args = openParenIndex === -1 ? [] : list.comma(node.params.slice(openParenIndex + 1, -1)).map(parseIncludeArg);
  return { name, args };
};

export const transformIncludeAtrule = async (rule: AtRule, opts: TransformOpts): Promise<void> => {
  if (!opts.transform.includes("@include")) return;

  const { name, args } = getIncludeOpts(rule, opts);
  const mixin = getClosestVariable(`@mixin ${name}`, rule.parent, opts) as
    { params: { name: string; value: string | undefined }[]; rule: AtRule } | undefined;

  if (mixin) {
    const parent = rule.parent;
    if (!parent) return;

    const positionalArgs = args.filter((arg) => arg.type === "positional");
    const namedArgs = new Map(args.filter((arg) => arg.type === "named").map((arg) => [arg.name, arg.value]));

    mixin.params.forEach((param, index) => {
      const namedArg = namedArgs.get(param.name);
      const positionalArg = positionalArgs[index]?.value;
      const arg =
        namedArg !== undefined
          ? getReplacedString(namedArg, rule, opts)
          : positionalArg !== undefined
            ? getReplacedString(positionalArg, rule, opts)
            : param.value;
      if (arg !== undefined) setVariable(rule, param.name, arg, opts);
    });

    const clone = mixin.rule.clone() as AtRule;
    // `original` links the mixin clone back to the @include node for @content resolution.
    (clone as unknown as { original?: AtRule }).original = rule;
    clone.parent = parent;
    if (rule.variables !== undefined) clone.variables = rule.variables;

    await transformNode(clone, opts);
    parent.insertBefore(rule, clone.nodes ?? []);
    rule.remove();
  } else {
    manageUnresolved(rule, opts, name, `Could not resolve the mixin for "${name}"`);
  }
};
