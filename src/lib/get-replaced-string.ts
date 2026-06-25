import type { TransformOpts } from "../transform-opts.js";
import { getClosestVariable } from "./get-closest-variable.js";
import { manageUnresolved } from "./manage-unresolved.js";
import type { WithVariables, VariableValue } from "./get-variables.js";

const matchVariables = /(.?)(?:\$([A-Za-z][\w-]*)|\$\(([A-Za-z][\w-]*)\)|#\{\$([A-Za-z][\w-]*)\})/g;

const stringify = (object: VariableValue): string => {
  if (Array.isArray(object)) return `(${object.map(stringify).join(",")})`;
  if (typeof object === "object" && object !== null) {
    return `(${Object.entries(object as Record<string, VariableValue>)
      .map(([key, val]) => `${key}:${stringify(val)}`)
      .join(",")})`;
  }
  return String(object);
};

export const getReplacedString = (string: string, node: WithVariables, opts: TransformOpts): string =>
  string.replace(matchVariables, (match, before: string, name1: string, name2: string, name3: string) => {
    if (before === "\\") return match.slice(1);
    const name = name1 ?? name2 ?? name3;
    const value = getClosestVariable(name, node.parent, opts);

    if (value === undefined) {
      manageUnresolved(node, opts, name, `Could not resolve the variable "$${name}" within "${string}"`);
      return match;
    }

    return `${before}${stringify(value)}`;
  });
