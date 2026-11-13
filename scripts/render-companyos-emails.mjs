#!/usr/bin/env node
/*
 * Re-renders the email copies Company OS sends from (its deploy/recipes/between-gigs/emails/*.html|txt) out of 2.0's
 * emails/*.ts, with Company OS's {{…}} placeholders as the props and {{links.base}} as the site and image host, so each
 * environment's emails link to and load images from its own site (emails/index.ts).
 *
 *   pnpm emails:companyos ../company-os            write the copies into a Company OS checkout
 *   pnpm emails:companyos ../company-os --check    exit 1 if any copy differs (nothing written)
 *
 * Re-rendered in full: invite, profile-submitted, approved and changes-requested (its notes as one card: Company OS
 * sends one readable note). welcome, coming-soon and sign-in-code keep their hand-adapted copies; only their footer's
 * address line is brought up to date.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { register } from "node:module";

const [target, flag] = process.argv.slice(2);
if (!target) { console.error("usage: render-companyos-emails.mjs <company-os checkout> [--check]"); process.exit(2); }
const dir = resolve(target, "deploy/recipes/between-gigs/emails");
if (!existsSync(dir)) { console.error(`not a Company OS checkout: ${dir} is missing`); process.exit(2); }

const root = new URL("..", import.meta.url).pathname;
// Node 22 runs the templates' TypeScript itself (type stripping); this hook adds what the bundler normally does:
// "@/…" is the repository root, and an import without an extension is its .ts file.
register("data:text/javascript," + encodeURIComponent(`
  import { existsSync } from "node:fs";
  import { fileURLToPath, pathToFileURL } from "node:url";
  const root = ${JSON.stringify(root)};
  export async function resolve(spec, context, next) {
    if (spec.startsWith("@/")) spec = pathToFileURL(root + spec.slice(2)).href;
    if ((spec.startsWith(".") || spec.startsWith("file:")) && !/\.[cm]?[jt]sx?$/.test(spec)) {
      const url = new URL(spec, context.parentURL);
      if (existsSync(fileURLToPath(url) + ".ts")) return next(url.href + ".ts", context);
    }
    return next(spec, context);
  }`));
const { emailTemplates } = await import(join(root, "emails/index.ts"));
const { FOOTER_ADDRESS_LINE } = await import(join(root, "emails/config.ts"));

const BASE = "{{links.base}}";
const ctx = { assetBase: BASE, siteUrl: BASE };
/** Company OS's variables for each template's props. */
const props = {
  invite: { inviteUrl: "{{vars.invite_url}}", email: "{{person.email}}" },
  "profile-submitted": { firstName: "{{person.name}}", profileUrl: `${BASE}/profile/`, editUrl: `${BASE}/profile/canvas/` },
  approved: { firstName: "{{person.name}}", profileUrl: `${BASE}/p/{{record.public_handle}}/`, editUrl: `${BASE}/profile/canvas/` },
  // Company OS sends the review's notes as one readable text (one line per section), so they render as a single card.
  "changes-requested": { firstName: "{{person.name}}", notes: "Notes|{{extra.note}}", editUrl: `${BASE}/profile/canvas/` },
};
const footerOnly = ["welcome", "coming-soon", "sign-in-code"];

const out = {};
// Company OS's one note can hold several suggestions, so the count 2.0 works out from its list doesn't apply.
const uncounted = (t) => t.replace("have one suggestion before", "have a few suggestions before");
for (const [name, p] of Object.entries(props)) {
  const raw = emailTemplates[name].render(p, ctx);
  const r = name === "changes-requested" ? { ...raw, html: uncounted(raw.html), text: uncounted(raw.text) } : raw;
  out[`${name}.html`] = r.html;
  out[`${name}.txt`] = r.text;
}
// Any earlier "Between Gigs · <address>" footer line becomes the current one.
const footerLine = /Between Gigs · [^<\n]*(Los Angeles|California|CA)[^<\n]*/g;
for (const name of footerOnly) for (const ext of ["html", "txt"]) {
  const file = `${name}.${ext}`;
  out[file] = readFileSync(join(dir, file), "utf8").replace(footerLine, FOOTER_ADDRESS_LINE.replace(/&/g, "&amp;"));
}

// The subjects Company OS shows (its subjects.json; the recipe's comms templates carry the same text).
const subjectsFile = join(dir, "subjects.json");
const subjects = JSON.parse(readFileSync(subjectsFile, "utf8"));
for (const [name, p] of Object.entries(props)) subjects[name] = emailTemplates[name].render(p, ctx).subject;
out["subjects.json"] = `${JSON.stringify(subjects, null, 2)}\n`;

const changed = Object.entries(out).filter(([f, body]) => !existsSync(join(dir, f)) || readFileSync(join(dir, f), "utf8") !== body).map(([f]) => f);
if (flag === "--check") {
  if (changed.length) { console.error(`Company OS email copies out of date: ${changed.join(", ")}`); process.exit(1); }
  console.log("Company OS email copies match 2.0's templates.");
} else {
  for (const f of changed) writeFileSync(join(dir, f), out[f]);
  console.log(changed.length ? `Wrote ${changed.join(", ")} in ${dir}` : "Already up to date.");
}
