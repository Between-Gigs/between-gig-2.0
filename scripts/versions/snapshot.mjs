// Turns an older version's static export into a snapshot served at <base>/v/<n>/: every HTML page gets
// scripts/versions/banner.js (storage isolation + the version switcher) as the first thing in <head>, a noindex
// tag, and the snapshot is moved into <out>/v/<n>/.
// Usage: node scripts/versions/snapshot.mjs <built export dir> <n> <base path> <site out dir>
import fs from "node:fs";
import path from "node:path";

const [src, n, base, out] = process.argv.slice(2);
if (!src || !n || !out) { console.error("usage: snapshot.mjs <export> <n> <base> <out>"); process.exit(2); }
const banner = fs.readFileSync(new URL("./banner.js", import.meta.url), "utf8");
const tag = `<meta name="robots" content="noindex"><script data-version="${n}" data-base="${base}">${banner.replace(/<\/script/gi, "<\\/script")}</script>`;

let pages = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) {
      const html = fs.readFileSync(p, "utf8");
      const at = html.search(/<head[^>]*>/i);
      if (at < 0) continue;
      const end = html.indexOf(">", at) + 1;
      fs.writeFileSync(p, html.slice(0, end) + tag + html.slice(end));
      pages++;
    }
  }
};
walk(src);
const dest = path.join(out, "v", String(n));
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`snapshot v${n}: ${pages} pages → ${dest}`);
