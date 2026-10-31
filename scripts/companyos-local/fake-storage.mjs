// A stand-in for Supabase Storage's REST API, in memory, for running Company OS locally (its file routes need
// storage, and a photo is required before a profile can be submitted). Only the calls Company OS's
// SupabaseStorage makes (apps/api/src/services/storage.ts). Local development only; never deployed.
//   node scripts/companyos-local/fake-storage.mjs [port]   (default 4100)
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const port = Number(process.argv[2] ?? 4100);
const objects = new Map(); // "bucket/key" -> { bytes, type }
const links = new Map(); // token -> { id, write }

const read = (req) => new Promise((resolve) => { const chunks = []; req.on("data", (c) => chunks.push(c)); req.on("end", () => resolve(Buffer.concat(chunks))); });
const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const id = (parts) => parts.map(decodeURIComponent).join("/");
const link = (kind, objectId, write) => { const t = randomBytes(12).toString("hex"); links.set(t, { id: objectId, write }); return `/object/${kind}/${objectId.split("/").map(encodeURIComponent).join("/")}?token=${t}`; };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const parts = url.pathname.replace(/^\/storage\/v1\//, "").split("/").filter(Boolean);
  const body = await read(req);
  const [a, b] = parts;
  try {
    if (req.method === "POST" && a === "object" && b === "upload" && parts[2] === "sign") return json(res, 200, { url: link("upload/sign", id(parts.slice(3)), true) });
    if (req.method === "PUT" && a === "object" && b === "upload") {
      const l = links.get(url.searchParams.get("token") ?? "");
      if (!l?.write || objects.has(l.id)) return json(res, 400, { error: "invalid" });
      objects.set(l.id, { bytes: body, type: (req.headers["content-type"] ?? "application/octet-stream").split(";")[0] });
      return json(res, 200, { Key: l.id });
    }
    if (a === "object" && b === "authenticated") {
      const o = objects.get(id(parts.slice(2)));
      if (!o) { res.writeHead(400, { "content-type": "application/json" }); return res.end(req.method === "HEAD" ? undefined : JSON.stringify({ error: "not_found", message: "Object not found" })); }
      const range = /bytes=(\d+)-(\d+)/.exec(req.headers.range ?? "");
      const bytes = range ? o.bytes.subarray(Number(range[1]), Number(range[2]) + 1) : o.bytes;
      res.writeHead(range ? 206 : 200, { "content-type": o.type, "content-length": String(req.method === "HEAD" ? o.bytes.length : bytes.length) });
      return res.end(req.method === "HEAD" ? undefined : bytes);
    }
    if (req.method === "POST" && a === "object" && b === "sign") {
      const input = JSON.parse(body.toString() || "{}");
      if (parts.length === 3) return json(res, 200, (input.paths ?? []).map((p) => objects.has(`${decodeURIComponent(parts[2])}/${p}`) ? { path: p, signedURL: link("sign", `${decodeURIComponent(parts[2])}/${p}`, false), error: null } : { path: p, signedURL: null, error: "not_found" }));
      const objectId = id(parts.slice(2));
      return objects.has(objectId) ? json(res, 200, { signedURL: link("sign", objectId, false) }) : json(res, 400, { error: "not_found", message: "Object not found" });
    }
    if (req.method === "GET" && a === "object" && b === "sign") {
      const l = links.get(url.searchParams.get("token") ?? "");
      const o = l && objects.get(l.id);
      if (!o) return json(res, 400, { error: "not_found" });
      res.writeHead(200, { "content-type": o.type, "content-length": String(o.bytes.length) });
      return res.end(o.bytes);
    }
    if (req.method === "POST" && a === "object" && b === "copy") {
      const { bucketId, sourceKey, destinationBucket, destinationKey } = JSON.parse(body.toString());
      const o = objects.get(`${bucketId}/${sourceKey}`);
      if (!o) return json(res, 400, { error: "not_found" });
      objects.set(`${destinationBucket}/${destinationKey}`, o);
      return json(res, 200, { Key: destinationKey });
    }
    if (req.method === "DELETE" && a === "object") {
      for (const p of JSON.parse(body.toString() || "{}").prefixes ?? []) objects.delete(`${decodeURIComponent(b)}/${p}`);
      return json(res, 200, []);
    }
    json(res, 404, { error: "not_found" });
  } catch (e) {
    json(res, 500, { error: String(e) });
  }
}).listen(port, () => console.log(`fake storage on http://localhost:${port}`));
