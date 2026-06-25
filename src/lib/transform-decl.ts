import type { Declaration } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { getReplacedString } from "./get-replaced-string.js";
import { setVariable } from "./set-variable.js";
import { evaluateExpression } from "./evaluate-expression.js";

const matchVariable = /^\$[\w-]+$/;

export const transformDecl = (decl: Declaration, opts: TransformOpts): void => {
  decl.value = getReplacedString(decl.value, decl, opts);

  if (matchVariable.test(decl.prop)) {
    const evaluated = evaluateExpression(decl.value);
    if (decl.parent) {
      setVariable(decl.parent, decl.prop.slice(1), evaluated !== null ? evaluated : decl.value, opts);
    }
    decl.remove();
  } else {
    decl.prop = getReplacedString(decl.prop, decl, opts);
  }
};
