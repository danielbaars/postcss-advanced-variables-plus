import type { AtRule, ChildNode, Container, Declaration, Rule } from "postcss";
import type { TransformOpts } from "../transform-opts.js";
import { transformAtrule } from "./transform-atrule.js";
import { transformContentAtrule } from "./transform-content-atrule.js";
import { transformDecl } from "./transform-decl.js";
import { transformEachAtrule } from "./transform-each-atrule.js";
import { transformForAtrule } from "./transform-for-atrule.js";
import { transformIfAtrule } from "./transform-if-atrule.js";
import { transformImportAtrule } from "./transform-import-atrule.js";
import { transformIncludeAtrule } from "./transform-include-atrule.js";
import { transformMixinAtrule } from "./transform-mixin-atrule.js";
import { transformRule } from "./transform-rule.js";

const structuralAtrules = new Set(["content", "each", "for", "if", "import", "include", "mixin"]);

const getNodesArray = (node: unknown): ChildNode[] => Array.from((node as Container).nodes ?? []);

/** Returns true if the child was a structural atrule whose feature is disabled — skip descending into it. */
const isDisabledStructural = (child: ChildNode, opts: TransformOpts): boolean => {
  if (child.type !== "atrule") return false;
  const name = ((child as AtRule).name ?? "").toLowerCase();
  if (!structuralAtrules.has(name)) return false;
  return !opts.transform.includes(`@${name}`);
};

const transformRuleOrDecl = async (child: ChildNode, opts: TransformOpts): Promise<void> => {
  if (child.type === "atrule") {
    const name = ((child as AtRule).name ?? "").toLowerCase();
    if (name === "content") return transformContentAtrule(child as AtRule, opts);
    if (name === "each") return transformEachAtrule(child as AtRule, opts);
    if (name === "if") return transformIfAtrule(child as AtRule, opts);
    if (name === "import") return transformImportAtrule(child as AtRule, opts);
    if (name === "include") return transformIncludeAtrule(child as AtRule, opts);
    if (name === "for") return transformForAtrule(child as AtRule, opts);
    if (name === "mixin") return transformMixinAtrule(child as AtRule, opts);
    return transformAtrule(child as AtRule, opts);
  } else if (child.type === "decl") {
    return transformDecl(child as Declaration, opts);
  } else if (child.type === "rule") {
    return transformRule(child as Rule, opts);
  }
};

export const transformNode = async (node: Container | { nodes: ChildNode[] }, opts: TransformOpts): Promise<void> => {
  for (const child of getNodesArray(node)) {
    await transformRuleOrDecl(child, opts);
    if (child.parent && !isDisabledStructural(child, opts)) {
      await transformNode(child as unknown as Container, opts);
    }
  }
};
