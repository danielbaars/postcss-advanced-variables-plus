import getClosestVariable from "./get-closest-variable.js";
import manageUnresolved from "./manage-unresolved.js";
import type { WithVariables, VariableValue } from "./get-variables.js";
import type { TransformOpts } from "../transform-opts.js";

const matchVariables = /(.?)(?:\$([A-Za-z][\w-]*)|\$\(([A-Za-z][\w-]*)\)|#\{\$([A-Za-z][\w-]*)\})/g;

const stringify = (object: VariableValue): string => {
  if (Array.isArray(object)) return `(${object.map(stringify).join(",")})`;
  if (typeof object === "object" && object !== null) {
    return `(${Object.keys(object).map(key => `${key}:${stringify((object as Record<string, VariableValue>)[key])}`).join(",")})`;
  }
  return String(object);
};

const getReplacedString = (string: string, node: WithVariables, opts: TransformOpts): string =>
  string.replace(matchVariables, (match, before: string, name1: string, name2: string, name3: string) => {
    if (before === "\\") return match.slice(1);
    const name = name1 ?? name2 ?? name3;
    const value = getClosestVariable(name, node.parent as WithVariables, opts);

    if (value === undefined) {
      manageUnresolved(node, opts, name, `Could not resolve the variable "$${name}" within "${string}"`);
      return match;
    }

    return `${before}${stringify(value)}`;
  });

export default getReplacedString;
