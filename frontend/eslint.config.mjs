// eslint-config-next v16 ships native flat-config exports. Routing it through
// FlatCompat (the legacy eslintrc bridge) made eslint 9 hang during config
// resolution — import the flat config directly instead.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    // Directory form ("dir/") stops eslint from descending into these trees at
    // all; the previous "dir/**" form still enumerated .next's ~142 MB of build
    // output on every run, which made `eslint .` appear to hang.
    ignores: ["e2e/", ".next/", "node_modules/"],
  },
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
