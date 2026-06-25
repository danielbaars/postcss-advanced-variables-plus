import type { AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { getReplacedString } from "./get-replaced-string.js";

export const transformAtrule = (rule: AtRule, opts: TransformOpts): void => {
  rule.params = getReplacedString(rule.params, rule, opts);
};
