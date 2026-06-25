import type { Node } from "postcss";

export type VariableValue = string | number | boolean | VariableValue[] | VariableMap;
export type VariableMap = { [key: string]: VariableValue };
// All PostCSS nodes carry `variables` via the module augmentation below.
export type WithVariables = Node;

export const getVariables = (node: unknown): VariableMap => Object(Object(node).variables);

declare module "postcss" {
  interface Node {
    variables?: VariableMap;
  }
}
