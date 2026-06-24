import type { AtRule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import getReplacedString from "./get-replaced-string.js";
import type { WithVariables } from "./get-variables.js";

const transformAtrule = (rule: AtRule, opts: TransformOpts): void => {
  rule.params = getReplacedString(rule.params, rule as unknown as WithVariables, opts);
};

export default transformAtrule;
