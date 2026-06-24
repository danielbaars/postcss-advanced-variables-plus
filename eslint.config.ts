import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importX from "eslint-plugin-import-x";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/dist", "**/node_modules", "**/coverage"] },

  js.configs.recommended,

  prettierConfig,

  {
    plugins: { prettier, "import-x": importX },
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "prettier/prettier": "warn",
      "linebreak-style": ["warn", "unix"],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": ["warn", { destructuring: "any", ignoreReadBeforeAssign: false }],
    },
  },

  {
    files: ["**/*.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },
    rules: {
      "@typescript-eslint/array-type": ["warn", { default: "array" }],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
          allowAny: false,
          allowNullish: false,
          allowRegExp: false,
          allowNever: false,
        },
      ],
    },
  },

  {
    files: ["**/*.test.ts", "**/*.spec.ts", "*.config.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  {
    files: ["**/*.ts", "**/*.js"],
    rules: {
      "no-duplicate-imports": "off",
      "import-x/no-duplicates": ["error", { "prefer-inline": true }],
      "import-x/order": ["warn"],
      quotes: ["warn", "double", { avoidEscape: true }],
    },
  },
);
