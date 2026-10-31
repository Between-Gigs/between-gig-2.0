// Checks the server build (`pnpm build:server`) by starting it: the 18 "Make live" routes answer 200, the internal and
// waiting ones 404 and are not in the build output, and every page carries the security headers with a fresh CSP
// nonce that each of its scripts uses. Run after the build; exits 1 on any failure.
//   node scripts/check-server.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTERNAL, LIVE_ROUTES } from "./server-build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STANDALONE = path.join(ROOT, ".next/standalone");

// One URL per internal page or file, so a route that slipped back in shows up by name.
const INTERNAL_URLS = [
  "/workspace/", "/workspace/open/", "/workspace/demo/", "/studio/", "/studio/site/", "/preview/", "/preview/cursors/", "/preview/curtain/",
  "/emails/", "/emails/welcome/", "/crew-call/", "/proposals/home/", "/artifacts/", "/artifacts/ship-list/", "/artifacts/ship-list/index.html",
  "/studio-source/manifest.json", "/thumbs/home.jpg", "/workspace/covers/handoff.jpg",
];

const failures = [];
const fail = (msg) => failures.push(msg);

if (!fs.existsSync(path.join(STANDALONE, "server.js"))) {
  console.error("❌ check-server: no .next/standalone/server.js. Run pnpm build:server first.");
  process.exit(1);
}

// Not in the output at all: no compiled page, no copied file.
for (const dir of INTERNAL) {
  const [kind, name] = [dir.split("/")[0], dir.slice(dir.indexOf("/") + 1)];
  const outputs = kind === "app" ? [".next/server/app", ".next/standalone/.next/server/app"] : [".next/standalone/public"];
  for (const where of outputs) if (fs.existsSync(path.join(ROOT, where, name))) fail(`${dir} is in the build output (${where}/${name})`);
}

const port = await new Promise((resolve) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const server = spawn(process.execPath, ["server.js"], {
  cwd: STANDALONE,
  env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
server.stdout.on("data", (b) => { log += b; });
server.stderr.on("data", (b) => { log += b; });
const base = `http://127.0.0.1:${port}`;

try {
  const started = Date.now();
  for (;;) {
    try { await fetch(`${base}/`, { redirect: "manual" }); break; } catch { /* not up yet */ }
    if (Date.now() - started > 30_000) throw new Error(`the server did not start:\n${log}`);
    await new Promise((r) => setTimeout(r, 250));
  }

  const nonces = new Set();
  for (const route of LIVE_ROUTES) {
    const res = await fetch(base + route, { redirect: "manual" });
    if (res.status !== 200) { fail(`${route} answered ${res.status}, expected 200`); continue; }
    checkHeaders(route, res.headers);
    const nonce = /'nonce-([^']+)'/.exec(res.headers.get("content-security-policy") ?? "")?.[1];
    if (!nonce) { fail(`${route}: the CSP has no nonce`); continue; }
    if (nonces.has(nonce)) fail(`${route}: a CSP nonce was reused`);
    nonces.add(nonce);
    const html = await res.text();
    const scripts = html.match(/<script\b[^>]*>/g) ?? [];
    if (!scripts.length) fail(`${route}: no scripts in the page (is it rendered?)`);
    for (const tag of scripts) if (!tag.includes(`nonce="${nonce}"`)) fail(`${route}: a script without this response's nonce: ${tag.slice(0, 80)}`);
  }

  for (const url of INTERNAL_URLS) {
    const res = await fetch(base + url, { redirect: "manual" });
    if (res.status !== 404) fail(`${url} answered ${res.status}, expected 404`);
  }

  // Static files get the hardening headers too (the CSP is only needed on documents).
  const asset = /\/_next\/static\/[^"']+\.js/.exec(await (await fetch(`${base}/`)).text())?.[0];
  if (!asset) fail("no /_next/static script found on /");
  else {
    const res = await fetch(base + asset);
    if (res.status !== 200) fail(`${asset} answered ${res.status}`);
    else checkHeaders(asset, res.headers, { csp: false });
  }
} catch (err) {
  fail(String(err instanceof Error ? err.message : err));
} finally {
  server.kill();
}

function checkHeaders(where, h, { csp = true } = {}) {
  const want = {
    "x-content-type-options": /^nosniff$/,
    "referrer-policy": /^strict-origin-when-cross-origin$/,
    "x-frame-options": /^DENY$/,
    "strict-transport-security": /^max-age=\d{8,}; includeSubDomains$/,
    "permissions-policy": /camera=\(\)/,
    "cross-origin-opener-policy": /^same-origin$/,
  };
  if (csp) want["content-security-policy"] = /frame-ancestors 'none'/;
  for (const [name, re] of Object.entries(want)) if (!re.test(h.get(name) ?? "")) fail(`${where}: header ${name} is ${JSON.stringify(h.get(name))}`);
  if (csp && /script-src[^;]*'unsafe-inline'/.test(h.get("content-security-policy") ?? "")) fail(`${where}: script-src allows 'unsafe-inline'`);
  if (h.get("x-powered-by")) fail(`${where}: sends x-powered-by`);
}

if (failures.length) {
  console.error(`❌ check-server: ${failures.length} problem(s):\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
console.log(`✅ check-server: ${LIVE_ROUTES.length} live routes 200 with headers and per-request nonces; ${INTERNAL_URLS.length} internal URLs 404 and absent from the build`);
