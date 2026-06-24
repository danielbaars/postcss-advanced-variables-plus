import type { Rule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import getReplacedString from "./get-replaced-string.js";
import type { WithVariables } from "./get-variables.js";

const transformRule = (rule: Rule, opts: TransformOpts): void => {
  rule.selector = getReplacedString(rule.selector, rule as unknown as WithVariables, opts);
};

export default transformRule;
