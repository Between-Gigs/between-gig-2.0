// Copies the app's source into public/studio-source/ for Studio's code editor, with a manifest of every file.
// Runs before `next build` (see package.json), so the static site carries the code it was built from.
// The output is generated: gitignored, never edited by hand.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/studio-source");
const DIRS = ["app", "components", "lib", "emails"];
const EXT = /\.(tsx?|css|mjs)$/;

fs.rmSync(OUT, { recursive: true, force: true });
const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel);
    else if (EXT.test(e.name)) {
      const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
      fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
      // Served as .txt so the static host returns it as plain text.
      fs.writeFileSync(path.join(OUT, `${rel}.txt`), text);
      files.push({ path: rel, lines: text.split("\n").length });
    }
  }
};
DIRS.forEach(walk);
files.sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ files }));
console.log(`studio-source: ${files.length} files`);
