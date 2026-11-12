// After a test deploy (deploy-test.yml, last step): from outside, through Railway's edge, the address in APP_URL serves
// the passphrase-gated site. `/` must answer 401 with the gate's form, and `/healthz/` must answer 200 `ok` (it needs no
// cookie). It sends no passphrase. Fails the run with a workflow error naming what is wrong; the usual one is Railway's
// "Application not found" 404, which means the custom domain is not attached to `web` or not verified yet.
// Known limit: `/healthz/` reports no commit, so this cannot prove the live build is this commit; on a re-run it can pass
// against the previous instance while the new one is still coming up.
// Run: APP_URL=https://test.<domain> node scripts/smoke-test-address.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

const ask = (url, requestMs) => fetch(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(requestMs) });

/** What a failed fetch means, from its cause's code (never a URL or body). A certificate that doesn't cover the name is
 *  Railway's wildcard one: the domain isn't verified yet, or its own certificate is still being issued (retried). */
export function fetchFailure(what, err) {
  const cause = err && typeof err === "object" ? err.cause : undefined;
  const code = cause && typeof cause.code === "string" && /^[A-Z0-9_]+$/.test(cause.code) ? cause.code : err instanceof Error ? err.name : "error";
  if (/CERT|ALTNAME|SELF_SIGNED/.test(code)) return `${what} did not answer (${code}): the certificate does not cover this address yet; Railway has not verified the domain (check its _railway-verify TXT record) or is still issuing the certificate`;
  return `${what} did not answer (${code})`;
}

/** One look at the address: null when it is right, else what is wrong. */
async function look(base, requestMs) {
  let page;
  try {
    page = await ask(`${base}/`, requestMs);
  } catch (err) {
    return { retry: true, why: fetchFailure("GET /", err) };
  }
  const body = await page.text();
  if (page.status === 404 && /Application not found/i.test(body)) return { fatal: true, why: "GET / answered Railway's 404 (Application not found): domain not attached or not verified in Railway (check its CNAME and _railway-verify TXT records)" };
  if (page.status === 200) return { fatal: true, why: "GET / answered 200: the gate is off, the test site is open to everyone" };
  if (page.status >= 300 && page.status < 400) return { fatal: true, why: `GET / answered a redirect (${page.status}): the address should serve the gate page itself` };
  if (page.status !== 401 || !body.includes('action="/test-gate/"')) return { retry: true, why: `GET / answered ${page.status}, expected 401 with the passphrase form` };
  try {
    const health = await ask(`${base}/healthz/`, requestMs);
    const text = (await health.text()).trim();
    if (health.status !== 200 || text !== "ok") return { retry: true, why: `GET /healthz/ answered ${health.status}, expected 200 ok` };
  } catch (err) {
    return { retry: true, why: fetchFailure("GET /healthz/", err) };
  }
  return null;
}

/** Resolves when the address passes; rejects with what is wrong. */
export async function smokeTestAddress(base, { timeoutMs = 300_000, intervalMs = 5_000, requestMs = 10_000 } = {}) {
  const end = Date.now() + timeoutMs;
  let last;
  for (;;) {
    last = await look(base, requestMs);
    if (!last) return;
    if (last.fatal) throw new Error(last.why);
    if (Date.now() + intervalMs >= end) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`${base}/healthz/ did not pass within ${Math.round(timeoutMs / 1000)} s (last: ${last.why})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  try {
    if (!base) throw new Error("needs APP_URL");
    await smokeTestAddress(base);
    console.log(`smoke-test-address: ${base} serves the gated site`);
  } catch (err) {
    console.log(`::error::Test address smoke check: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
