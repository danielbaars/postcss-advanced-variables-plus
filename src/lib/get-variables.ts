import type { ChildNode, Container } from "postcss";

export type VariableValue = string | number | boolean | VariableValue[] | VariableMap;
export type VariableMap = { [key: string]: VariableValue };
export type WithVariables = (ChildNode | Container) & { variables?: VariableMap };

const getVariables = (node: unknown): VariableMap => Object(Object(node).variables);

export default getVariables;
