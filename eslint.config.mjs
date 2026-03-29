import nextConfig from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextConfig,
  {
    // react-hooks/purity fires on Date.now() calls in server components —
    // these are async RSCs that never re-render on the client, so purity
    // rules don't apply. Turn it off project-wide.
    rules: {
      "react-hooks/purity": "off",
    },
  },
];

export default eslintConfig;
