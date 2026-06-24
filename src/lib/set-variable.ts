import type { PluginOptions } from "../options.js";
import getClosestVariable from "./get-closest-variable.js";
import type { WithVariables, VariableValue } from "./get-variables.js";

const matchDefault = /\s+!default$/;

const setVariable = (node: WithVariables, name: string, value: VariableValue, opts: PluginOptions): void => {
  if (!matchDefault.test(String(value)) || getClosestVariable(name, node, opts) === undefined) {
    const undefaultedValue = matchDefault.test(String(value)) ? String(value).replace(matchDefault, "") : value;

    node.variables = node.variables ?? {};
    node.variables[name] = undefaultedValue;
  }
};

export default setVariable;
