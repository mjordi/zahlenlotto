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
  ]),
  {
    settings: {
      // Explicitly set React version to avoid eslint-plugin-react calling
      // the removed context.getFilename() API when auto-detecting (ESLint 10+)
      react: {
        version: '19',
      },
    },
    rules: {
      // Allow setState in useEffect for hydration scenarios
      // This is necessary to avoid server/client mismatches while
      // still respecting user preferences from localStorage/browser
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);

export default eslintConfig;
