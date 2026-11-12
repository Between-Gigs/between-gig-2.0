import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script
import { smokeTestAddress } from "./smoke-test-address.mjs";

type Handler = (url: string, count: number) => [number, string] | null;
let server: Server | undefined;
const seen: Record<string, number> = {};

async function start(handler: Handler): Promise<string> {
  server = createServer((req, res) => {
    const url = req.url ?? "";
    seen[url] = (seen[url] ?? 0) + 1;
    const r = handler(url, seen[url]);
    if (!r) return; // never answers
    res.writeHead(r[0], { "content-type": "text/html" }).end(r[1]);
  });
  await new Promise<void>((ok) => server!.listen(0, "127.0.0.1", ok));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
const fast = { timeoutMs: 1500, intervalMs: 50, requestMs: 300 };
const run = (base: string, o = fast) => (smokeTestAddress as (b: string, o?: object) => Promise<void>)(base, o);
const good: Handler = (u) => (u === "/" ? [401, '<form action="/test-gate/">'] : u === "/healthz/" ? [200, "ok"] : [404, ""]);

afterEach(async () => {
  for (const k of Object.keys(seen)) delete seen[k];
  await new Promise((ok) => (server ? server.close(ok) : ok(null)));
  server = undefined;
});

describe("smokeTestAddress", () => {
  it("passes on the gate page (401 with the form) and a healthy /healthz/", async () => {
    await expect(run(await start(good))).resolves.toBeUndefined();
  });

  it("names a domain Railway does not route yet", async () => {
    const base = await start(() => [404, '{"status":"error","code":404,"message":"Application not found"}']);
    await expect(run(base)).rejects.toThrow(/Application not found.*domain not attached or not verified in Railway/);
  });

  it("fails when the gate is off (200)", async () => {
    const base = await start((u) => (u === "/" ? [200, "<html>site</html>"] : [200, "ok"]));
    await expect(run(base)).rejects.toThrow(/gate is off/);
  });

  it("fails on a redirect", async () => {
    const base = await start(() => [301, ""]);
    await expect(run(base)).rejects.toThrow(/301/);
  });

  it("fails with a timeout message when /healthz/ never answers 200", async () => {
    const base = await start((u) => (u === "/" ? [401, '<form action="/test-gate/">'] : null));
    await expect(run(base, { timeoutMs: 600, intervalMs: 50, requestMs: 100 })).rejects.toThrow(/healthz.*within/);
  });

  it("retries while the deploy comes up (502 twice, then right)", async () => {
    const base = await start((u, n) => (n <= 2 ? [502, "bad gateway"] : good(u, n)));
    await expect(run(base)).resolves.toBeUndefined();
  });
});
