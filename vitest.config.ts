import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests next to the code (`*.test.ts`), including the DataSource contract suite (Company OS integration, rule E12).
export default defineConfig({
  resolve: { alias: { "@ds": fileURLToPath(new URL("./packages/design-system/src", import.meta.url)), "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"], environment: "node" },
});
