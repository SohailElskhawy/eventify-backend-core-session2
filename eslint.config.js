// ESLint flat config (ESLint 9+). Preconfigured from day one;
// CI starts enforcing `npm run lint` in Session 6.
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/", "coverage/", "node_modules/"],
  },
  tseslint.configs.recommended,
  {
    rules: {
      // Allow _-prefixed params (Express error handlers need 4 args even when
      // `next` isn't called — the arity is how Express identifies them).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
);