import type { Node, Result } from "postcss";

export type UnresolvedBehavior = "throw" | "warn" | "ignore";

const manageUnresolved = (
  node: Node,
  opts: { unresolved: UnresolvedBehavior; result: Result },
  word: string,
  message: string,
): void => {
  if (opts.unresolved === "warn") {
    node.warn(opts.result, message, { word });
  } else if (opts.unresolved !== "ignore") {
    throw node.error(message, { word });
  }
};

export default manageUnresolved;
