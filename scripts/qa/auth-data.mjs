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
  const result = await data.auth.syncExternal({ email: "verified@example.com", name: "Verified User", inviteToken: token, acceptedTerms: true });
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
const matched = await data.auth.syncExternal({ email: "riley.park@example.com", name: "Riley", inviteToken: DEMO_TOKENS.valid, acceptedTerms: true });
assert.equal(matched.session.role, "gigster");
assert.equal((await data.invites.lookup(DEMO_TOKENS.valid)).state, "used");
const existing = await data.people.get("maya");
const login = await data.auth.syncExternal({ email: "maya.chen@example.com", name: "Overwrite", inviteToken: "stale" });
assert.equal(login.created, false);
assert.deepEqual((await data.people.get("maya")).person, existing.person);
// Even the sample owner's email grants no owner role through verified signup.
const ordinary = await data.auth.syncExternal({ email: SAMPLE_OWNER.email, name: "Ordinary", acceptedTerms: true });
assert.equal(ordinary.session.role, "gigster");
const owner = await data.auth.syncExternal({ email: "trusted@example.com", role: "owner" });
assert.equal(owner.session.role, "owner"); // represents trusted Clerk publicMetadata, never signup metadata
console.log("Auth adapter passed: open signup, validation, optional invites, existing login, code checks, role mapping.");

// Open accounts, including waitlist members who were never invited, do not inflate invite conversion.
await data.demo.reset();
const beforeOpen = await data.owners.dashboard();
const openPerson = await data.auth.register({ email: "open-funnel@example.com", name: "Open Funnel", acceptTerms: true });
assert.equal(openPerson.ok, true);
assert.deepEqual((await data.owners.dashboard()).funnel, beforeOpen.funnel);
await data.funnel.joinWaitlist({ email: "open-funnel@example.com", zip: "90026", placement: "qa" });
const beforeSubmit = await data.owners.dashboard();
assert.equal(beforeSubmit.funnel.invited, beforeOpen.funnel.invited);
assert.equal(beforeSubmit.funnel.accounts, beforeOpen.funnel.accounts);
const template = await data.profiles.getProfile("maya");
await data.profiles.saveDraft(openPerson.person.id, { ...template.fields, name: "Open Funnel" }, 4);
await data.profiles.submit(openPerson.person.id);
const afterSubmit = await data.owners.dashboard();
assert.deepEqual(afterSubmit.funnel, beforeSubmit.funnel);
assert.equal(afterSubmit.counts.submitted, beforeSubmit.counts.submitted + 1);
assert.equal(afterSubmit.reviewQueue.some((row) => row.person.id === openPerson.person.id), true);
await data.demo.signInAs("owner");
await data.owners.approve(openPerson.person.id);
const afterApprove = await data.owners.dashboard();
assert.deepEqual(afterApprove.funnel, beforeSubmit.funnel);
assert.deepEqual(afterApprove.invitedCounts, beforeSubmit.invitedCounts);
assert.equal(afterApprove.invitedPersonIds.includes(openPerson.person.id), false);
assert.deepEqual(afterApprove.invitedPersonIds, beforeSubmit.invitedPersonIds);
assert.equal(afterApprove.counts.approved, beforeSubmit.counts.approved + 1);
const values = [afterApprove.funnel.invited, afterApprove.funnel.opened, afterApprove.funnel.accounts, afterApprove.funnel.submitted, afterApprove.funnel.approved];
assert.equal(values.every((value, index) => index === 0 || value <= values[index - 1]), true);
console.log("Open-account review/approval stays visible globally without distorting invitation-funnel stages.");

await data.demo.reset();
const beforeConsent = await data.people.list();
assert.equal((await data.auth.syncExternal({ email: "login-first@example.com", name: "Login First" })).error, "terms");
assert.equal((await data.people.list()).length, beforeConsent.length);
assert.equal((await data.auth.syncExternal({ email: "riley.park@example.com", name: "Riley" })).error, "terms");
assert.equal((await data.invites.lookup(DEMO_TOKENS.valid)).state, "valid");
const consented = await data.auth.syncExternal({ email: "login-first@example.com", name: "Login First", acceptedTerms: true });
assert.equal(consented.ok, true);
assert.equal(consented.session.role, "gigster");
const consentReturn = await data.auth.syncExternal({ email: "login-first@example.com" });
assert.equal(consentReturn.ok, true);
assert.equal(consentReturn.session.personId, consented.session.personId);
console.log("Login-first consent required before creating a person; returning profiles remain unchanged.");
