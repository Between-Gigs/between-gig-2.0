import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script
import { checkAppUrl } from "./check-app-url.mjs";

const check = checkAppUrl as (v: string | undefined, o?: { test?: boolean }) => string | null;

describe("checkAppUrl", () => {
  it("accepts the test and the production origins", () => {
    expect(check("https://test.between-gigs.com", { test: true })).toBeNull();
    expect(check("https://between-gigs.com", { test: false })).toBeNull();
    expect(check("https://between-gigs.com")).toBeNull();
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["http", "http://test.between-gigs.com"],
    ["trailing slash", "https://test.between-gigs.com/"],
    ["a path", "https://test.between-gigs.com/x"],
    ["a query", "https://test.between-gigs.com?a=1"],
    ["a fragment", "https://test.between-gigs.com#a"],
    ["a port", "https://test.between-gigs.com:8443"],
    ["whitespace", "https://test.between-gigs.com "],
    ["a control character", "https://test.between-gigs.com\n"],
    ["a Railway generated domain", "https://web-test-9432.up.railway.app"],
    ["a Railway generated domain in capitals", "https://Web-Test.UP.Railway.App"],
    ["the placeholder", "https://placeholder.invalid"],
    ["an empty label", "https://test."],
    ["an empty middle label", "https://test..x.com"],
    ["a trailing dot", "https://test.between-gigs.com."],
    ["a trailing dot on a Railway address", "https://test.x.up.railway.app."],
    ["userinfo", "https://user@test.between-gigs.com"],
    ["a non-ASCII label", "https://tést.between-gigs.com"],
    ["an invalid TLD", "https://test.foo.invalid"],
    ["localhost", "https://test.localhost"],
    ["bare localhost", "https://localhost"],
    ["a label starting with a hyphen", "https://test.-x.com"],
    ["a label ending with a hyphen", "https://test.x-.com"],
    ["a single label", "https://test"],
  ])("refuses %s, without echoing the value", (_n, value) => {
    const msg = check(value, { test: true });
    expect(msg).toEqual(expect.any(String));
    if (value) expect(msg!).not.toContain(value.trim());
  });

  it("in test mode refuses a host that does not start with test.", () => {
    expect(check("https://between-gigs.com", { test: true })).toEqual(expect.any(String));
  });

  it("refuses capitals: the value is built into links as written", () => {
    expect(check("https://TEST.between-gigs.com", { test: true })).toEqual(expect.any(String));
    expect(check("https://Between-Gigs.com")).toEqual(expect.any(String));
  });

  it("in test mode the first label must be exactly test", () => {
    expect(check("https://testing.between-gigs.com", { test: true })).toEqual(expect.any(String));
    expect(check("https://test-x.between-gigs.com", { test: true })).toEqual(expect.any(String));
  });

  it("the CLI exits 1 with an ::error:: that does not echo the value, and 0 when fine", () => {
    const run = (url: string) => spawnSync("node", [fileURLToPath(new URL("./check-app-url.mjs", import.meta.url)), "--test"], { env: { ...process.env, APP_URL: url }, encoding: "utf8" });
    const bad = run("https://secret-host.up.railway.app");
    expect(bad.status).toBe(1);
    expect(bad.stderr + bad.stdout).toContain("::error::");
    expect(bad.stderr + bad.stdout).not.toContain("secret-host");
    expect(run("https://test.between-gigs.com").status).toBe(0);
  });
});
