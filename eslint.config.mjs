import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "eslint.config.mjs",
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      ".artifacts/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["packages/database/drizzle.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: [
      "infrastructure/terraform/runtime/api-smoke.mjs",
      "scripts/**/*.mjs",
    ],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        URL: "readonly",
      },
    },
  },
);
