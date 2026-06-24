import type { PluginOptions } from "../options.js";
import getVariables, { type VariableValue, type VariableMap, type WithVariables } from "./get-variables.js";

const requiresAncestorVariable = (variable: VariableValue | undefined, node: WithVariables): boolean =>
  variable === undefined && node != null && node.parent != null;

const requiresFnVariable = (value: VariableValue | undefined, opts: PluginOptions): boolean =>
  value === undefined && typeof opts.variables === "object" && opts.variables !== null;

const getFnVariable = (
  name: string,
  node: WithVariables,
  variables: PluginOptions["variables"],
): VariableValue | undefined => {
  if (typeof variables === "function") return variables(name, node);
  if (typeof variables === "object" && variables !== null) return (variables as VariableMap)[name];
  return undefined;
};

const getClosestVariable = (name: string, node: WithVariables, opts: PluginOptions): VariableValue | undefined => {
  const variables = getVariables(node);
  let variable: VariableValue | undefined = variables[name];

  if (requiresAncestorVariable(variable, node)) {
    variable = getClosestVariable(name, node.parent as WithVariables, opts);
  }

  if (requiresFnVariable(variable, opts)) {
    variable = getFnVariable(name, node, opts.variables);
  }

  return variable;
};

export default getClosestVariable;
