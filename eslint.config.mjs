import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "public/sw.js"],
  },
  {
    // Règles « React Compiler » de react-hooks v7 : signal utile mais ~30
    // occurrences préexistantes — en warning le temps de refactorer.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/error-boundaries": "warn",
    },
  },
];

export default eslintConfig;
