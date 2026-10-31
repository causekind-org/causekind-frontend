import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// React Compiler rules. The compiler is not enabled (no reactCompiler in next.config),
// so these are advice for a future refactor, not errors.
const compilerRulesAsWarnings = {
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/refs": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
  "react-hooks/purity": "warn",
};

const eslintConfig = [
  // Applied inside the entry that registers the react-hooks plugin, as flat config requires.
  ...nextCoreWebVitals.map((entry) =>
    entry.plugins?.["react-hooks"] ? { ...entry, rules: { ...entry.rules, ...compilerRulesAsWarnings } } : entry,
  ),
  { ignores: [".next/**", "node_modules/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"] },
];

export default eslintConfig;
