import { list } from "postcss";
import type { VariableValue, VariableMap } from "./get-variables.js";

const matchWrappingParens = /^\(([\W\w]*)\)$/g;
const matchDeclaration = /^([\w-]+)\s*:\s*([\W\w]+)\s*$/;
const matchTrailingComma = /\s*,\s*$/;

export const getValueAsObject = (value: string): VariableValue => {
  const hasWrappingParens = matchWrappingParens.test(value);
  matchWrappingParens.lastIndex = 0;
  const unwrappedValue = String(hasWrappingParens ? value.replace(matchWrappingParens, "$1") : value).replace(
    matchTrailingComma,
    "",
  );
  const separatedValue = list.comma(unwrappedValue);
  const firstValue = separatedValue[0];

  if (firstValue === value) return value;

  const objectValue: VariableMap = {};
  const arrayValue: VariableValue[] = [];

  separatedValue.forEach((subvalue, index) => {
    const match = subvalue.match(matchDeclaration);
    if (match) {
      const [, key, keyvalue] = match;
      if (key !== undefined && keyvalue !== undefined) {
        objectValue[key] = getValueAsObject(keyvalue);
      }
    } else {
      arrayValue[index] = getValueAsObject(subvalue);
    }
  });

  return Object.keys(objectValue).length > 0 ? Object.assign(objectValue, arrayValue) : arrayValue;
};
