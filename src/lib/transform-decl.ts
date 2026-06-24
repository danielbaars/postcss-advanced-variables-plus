import getReplacedString from "./get-replaced-string.js";
import setVariable from "./set-variable.js";
import type { Declaration } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import type { WithVariables } from "./get-variables.js";

const matchVariable = /^\$[\w-]+$/;

const transformDecl = (decl: Declaration, opts: TransformOpts): void => {
  decl.value = getReplacedString(decl.value, decl as unknown as WithVariables, opts);

  if (matchVariable.test(decl.prop)) {
    setVariable(decl.parent as WithVariables, decl.prop.slice(1), decl.value, opts);
    decl.remove();
  } else {
    decl.prop = getReplacedString(decl.prop, decl as unknown as WithVariables, opts);
  }
};

export default transformDecl;
