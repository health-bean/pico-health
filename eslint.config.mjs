import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "ios/**", "android/**", "node_modules/**", ".impeccable/**"]),
  {
    // React Compiler rules (new in eslint-plugin-react-hooks 6+). Real cleanups, but a
    // cross-cutting refactor; surface them as warnings until that pass is scheduled.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    // Test doubles and one-off maintenance scripts legitimately reach for `any`.
    files: ["**/*.test.ts", "**/*.test.tsx", "scripts/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
]);
