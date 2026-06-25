import type { PluginOptions } from "../options.js";
import { getVariables, type VariableValue, type WithVariables } from "./get-variables.js";

const getFnVariable = (
  name: string,
  node: WithVariables,
  variables: PluginOptions["variables"],
): VariableValue | undefined => {
  if (typeof variables === "function") return variables(name, node);
  if (typeof variables === "object" && variables !== null) return variables[name];
  return undefined;
};

export const getClosestVariable = (
  name: string,
  node: WithVariables | undefined,
  opts: PluginOptions,
): VariableValue | undefined => {
  if (!node) return undefined;

  const variables = getVariables(node);
  let variable: VariableValue | undefined = variables[name];

  if (variable === undefined && node.parent != null) {
    variable = getClosestVariable(name, node.parent, opts);
  }

  if (variable === undefined && opts.variables !== undefined) {
    variable = getFnVariable(name, node, opts.variables);
  }

  return variable;
};
