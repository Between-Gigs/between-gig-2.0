// Checks the APP_URL variable of a deploy environment: the site's origin, https, no path, no trailing slash, no port.
// Test (--test) must be a `test.` host: Railway's generated *.up.railway.app address is never the site's address.
// The message never repeats the value.
//   APP_URL=https://test.between-gigs.com node scripts/check-app-url.mjs --test
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Returns null when the value is fine, else what is wrong (without the value). */
export function checkAppUrl(value, { test = false } = {}) {
  if (!value) return "APP_URL is not set: set the environment's variable APP_URL to https://<the domain> (no path, no trailing slash)";
  const shape = "APP_URL must look like https://<the domain>: https, no path, query, fragment, port or trailing slash, no spaces";
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return shape;
  const m = /^https:\/\/([a-zA-Z0-9.-]+)$/.exec(value);
  if (!m) return shape;
  const host = m[1].toLowerCase();
  if (host.endsWith(".up.railway.app")) return "APP_URL is a Railway-generated address: use the custom domain attached to the web service";
  if (host === "placeholder.invalid" || host.endsWith(".invalid")) return "APP_URL is a placeholder: set the real domain";
  if (test && !host.startsWith("test.")) return "APP_URL on test must be a test. host (for example https://test.between-gigs.com)";
  return null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const error = checkAppUrl(process.env.APP_URL, { test: process.argv.includes("--test") });
  if (error) { console.error(`::error::${error}`); process.exit(1); }
  console.log("APP_URL looks right");
}
