import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The web server holds only what it uses (least privilege). Company OS verifies the Clerk session token itself, so
// 2.0's server never needs CLERK_SECRET_KEY: no deploy may hand it over (coordinator, merge of F1 and F2).
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("the web server's environment", () => {
  it("never gets the Clerk secret key from the deploy", () => {
    for (const path of [".github/workflows/deploy-test.yml", ".github/workflows/deploy-prod.yml"]) {
      expect(read(path), path).not.toContain("secrets.CLERK_SECRET_KEY");
    }
    expect(read(".railway/railway.ts")).not.toMatch(/CLERK_SECRET_KEY\s*:/);
  });

  it("still gets the two Company OS service tokens and its own address", () => {
    const railway = read(".railway/railway.ts");
    for (const name of ["COMPANY_OS_READ_TOKEN", "COMPANY_OS_SUBMIT_TOKEN", "APP_URL"]) expect(railway).toMatch(new RegExp(`${name}\\s*:`));
  });
});
