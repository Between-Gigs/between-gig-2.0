import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // The vendored design system is linted upstream; the reference templates are not built here.
    ignores: ["packages/design-system/**", ".next/**", "out/**", "qa/**", "public/artifacts/**", "next-env.d.ts"],
  },
  {
    rules: {
      // Sample photos and email previews are plain <img>: the static export has no image optimizer.
      "@next/next/no-img-element": "off",
      // Product copy is full of apostrophes; React renders them safely.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
