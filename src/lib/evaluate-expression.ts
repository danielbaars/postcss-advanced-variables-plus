// Only allow digits, decimal point, arithmetic operators, parens, and spaces.
// Any CSS unit, identifier, or un-substituted variable causes an early null return.
const VALID_CHARS = /^[\d .+\-*/%()]+$/;

// Recursive-descent parser for: expr = term (('+' | '-') term)*
//                                term = factor (('*' | '/' | '%') factor)*
//                                factor = '-' factor | '(' expr ')' | NUMBER

export const evaluateExpression = (input: string): number | null => {
  const s = input.trim();
  if (!s || !VALID_CHARS.test(s)) return null;

  let pos = 0;

  const skip = (): void => {
    while (pos < s.length && s[pos] === " ") pos++;
  };

  const parseFactor = (): number | null => {
    skip();
    if (pos >= s.length) return null;

    if (s[pos] === "-") {
      pos++;
      const val = parseFactor();
      return val !== null ? -val : null;
    }

    if (s[pos] === "(") {
      pos++;
      const val = parseExpr();
      if (val === null) return null;
      skip();
      if (pos >= s.length || s[pos] !== ")") return null;
      pos++;
      return val;
    }

    let numStr = "";
    let hasDot = false;
    while (
      pos < s.length &&
      ((s[pos]! >= "0" && s[pos]! <= "9") || (s[pos] === "." && !hasDot))
    ) {
      if (s[pos] === ".") hasDot = true;
      numStr += s[pos++];
    }
    if (!numStr) return null;
    return parseFloat(numStr);
  };

  const parseTerm = (): number | null => {
    let left = parseFactor();
    if (left === null) return null;
    skip();
    while (pos < s.length && (s[pos] === "*" || s[pos] === "/" || s[pos] === "%")) {
      const op = s[pos++];
      const right = parseFactor();
      if (right === null) return null;
      if (op === "/") {
        if (right === 0) return null;
        left = left / right;
      } else if (op === "%") {
        if (right === 0) return null;
        left = left % right;
      } else {
        left = left * right;
      }
      skip();
    }
    return left;
  };

  const parseExpr = (): number | null => {
    let left = parseTerm();
    if (left === null) return null;
    skip();
    while (pos < s.length && (s[pos] === "+" || s[pos] === "-")) {
      const op = s[pos++];
      const right = parseTerm();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
      skip();
    }
    return left;
  };

  const result = parseExpr();
  skip();
  if (pos !== s.length) return null;
  return result;
};

export default evaluateExpression;
