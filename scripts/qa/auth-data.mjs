// Node >=22.15. No Clerk requests or accounts: test the sample adapter's verified-identity boundary.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/") || (specifier.startsWith(".") && context.parentURL?.endsWith(".ts"))) {
      const stem = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : fileURLToPath(new URL(specifier, context.parentURL));
      const file = [stem, `${stem}.ts`, path.join(stem, "index.ts")].find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts") && url.startsWith(pathToFileURL(root).href)) {
      return { format: "module", shortCircuit: true, source: ts.transpileModule(fs.readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText };
    }
    return next(url, context);
  },
});
const { sampleSource: data } = await import("../../lib/data/sample.ts");
const { DEMO_TOKENS, SAMPLE_OWNER } = await import("../../lib/data/seed.ts");
await data.demo.reset();
assert.equal((await data.auth.register({ email: "bad", name: "Test", acceptTerms: true })).error, "email");
assert.equal((await data.auth.register({ email: "new@example.com", name: " ", acceptTerms: true })).error, "name");
assert.equal((await data.auth.register({ email: "new@example.com", name: "New", acceptTerms: false })).error, "terms");
const fresh = await data.auth.register({ email: " NEW@EXAMPLE.COM ", name: "New Person", acceptTerms: true });
assert.equal(fresh.ok, true);
assert.equal(fresh.person.email, "new@example.com");
assert.equal((await data.auth.session()).role, "gigster");
assert.equal((await data.auth.register({ email: "new@example.com", name: "Overwrite", acceptTerms: true })).error, "existing-account");
assert.equal((await data.people.get(fresh.person.id)).person.name, "New Person");
await data.auth.signOut();
assert.equal((await data.auth.requestCode("new@example.com")).ok, true);
assert.equal((await data.auth.verifyCode("new@example.com", "000000")).ok, false);
const code = await data.demo.peekCode("new@example.com");
assert.equal((await data.auth.verifyCode("new@example.com", code)).session.personId, fresh.person.id);
assert.equal((await data.auth.verifyCode("new@example.com", code)).error, "no-code");
await data.demo.reset();
const invite = await data.auth.register({ token: DEMO_TOKENS.valid, name: "Riley Park", acceptTerms: true });
assert.equal(invite.ok, true);
assert.equal((await data.invites.lookup(DEMO_TOKENS.valid)).state, "used");
await data.demo.reset();
const edited = await data.auth.register({ token: DEMO_TOKENS.valid, email: "other@example.com", name: "Other", acceptTerms: true });
assert.equal(edited.ok, true);
assert.equal((await data.invites.lookup(DEMO_TOKENS.valid)).state, "valid");
for (const token of [undefined, DEMO_TOKENS.valid, DEMO_TOKENS.expired, DEMO_TOKENS.used, DEMO_TOKENS.unknown]) {
  await data.demo.reset();
  const result = await data.auth.syncExternal({ email: "verified@example.com", name: "Verified User", inviteToken: token });
  assert.equal(result.ok, true);
  assert.equal(result.session.role, "gigster");
  assert.equal(result.created, true);
  assert.equal((await data.invites.lookup(DEMO_TOKENS.valid)).state, "valid");
  const again = await data.auth.syncExternal({ email: "VERIFIED@example.com", name: "Overwrite", inviteToken: "stale" });
  assert.equal(again.created, false);
  assert.equal(again.session.personId, result.session.personId);
  assert.equal(again.session.name, "Verified User");
}
await data.demo.reset();
const matched = await data.auth.syncExternal({ email: "riley.park@example.com", name: "Riley", inviteToken: DEMO_TOKENS.valid });
assert.equal(matched.session.role, "gigster");
assert.equal((await data.invites.lookup(DEMO_TOKENS.valid)).state, "used");
const existing = await data.people.get("maya");
const login = await data.auth.syncExternal({ email: "maya.chen@example.com", name: "Overwrite", inviteToken: "stale" });
assert.equal(login.created, false);
assert.deepEqual((await data.people.get("maya")).person, existing.person);
// Even the sample owner's email grants no owner role through verified signup.
const ordinary = await data.auth.syncExternal({ email: SAMPLE_OWNER.email, name: "Ordinary" });
assert.equal(ordinary.session.role, "gigster");
const owner = await data.auth.syncExternal({ email: "trusted@example.com", role: "owner" });
assert.equal(owner.session.role, "owner"); // represents trusted Clerk publicMetadata, never signup metadata
console.log("Auth adapter passed: open signup, validation, optional invites, existing login, code checks, role mapping.");
