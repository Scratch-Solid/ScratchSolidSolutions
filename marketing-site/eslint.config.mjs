import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Selenium tests use CommonJS require() legitimately
    "tests/selenium/**",
    // Build artifacts and dependencies
    "node_modules/**",
    ".open-next/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
