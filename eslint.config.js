// ESLint flat config (ESLint 9+). Preconfigured from day one;
// CI starts enforcing `npm run lint` in Session 6.
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/", "coverage/", "node_modules/"],
  },
  tseslint.configs.recommended,
);