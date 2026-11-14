import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { libraryComponents } from "@/components/ds/library";

describe("design system page: full library list", () => {
  it("lists exactly the components in packages/design-system", () => {
    const dir = path.resolve(__dirname, "../packages/design-system/src/components");
    const files = fs.readdirSync(dir).filter((f) => /^[A-Z].*\.tsx$/.test(f) && !f.endsWith(".test.tsx")).map((f) => f.replace(/\.tsx$/, "")).sort();
    expect([...libraryComponents].sort()).toEqual(files);
  });
});
