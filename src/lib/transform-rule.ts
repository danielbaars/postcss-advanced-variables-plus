import type { Rule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { getReplacedString } from "./get-replaced-string.js";

export const transformRule = (rule: Rule, opts: TransformOpts): void => {
  rule.selector = getReplacedString(rule.selector, rule, opts);
};
