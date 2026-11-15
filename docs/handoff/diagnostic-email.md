# Diagnostic email draft

Requested outcome: Emails in the real owner dashboard can send one diagnostic only to jmassion@gmail.com, from hello@between-gigs.com, with existing Between Gigs wallpaper, logo, shared mailing address and footer. The sample Hub never sends. Invitation, welcome, retired discovery and fictional outbox are preserved.

Live route: `/owners/emails/`; existing sample `/emails/`. Live template cards still open the isolated `/hub/emails/...` previews. New authenticated server routes `/api/emails/diagnosticStatus/` and `/api/emails/sendDiagnostic/` accept only `{args:[]}`. Server verifies super-admin and pins the authorized recipient/sender before calling Company OS. Browser cannot choose envelope, content or template. Company OS owns the atomic one-send reservation and durable outbox.

Backend counterpart: Company OS branch `feat/diagnostic-email`. Its review/activation gate is separate from PR60/PR63 and this work incorporates neither draft. API release and recipe template installation must precede frontend release. No credential, DNS, automation, deployment or security settings were changed. Activation remains unset/disabled. Justin subsequently replaced the named Anu approval gate with independent technical review and security/data/email/real-flow testing; this does not imply Anu approved. Enforced repository/environment protections still apply. The one real end-to-end send is still pending, and must happen through the signed-in site after reviewed activation in exactly one environment.

Template: `emails/diagnostic.ts`, separate from the marketing registry. Reuses the existing Craft wallpaper as a visible image strip and branded card because the current backend sanitizer rejects dynamic background attributes/CSS URLs. No sanitizer relaxation. Uses shared footer address/contact/privacy/manual unsubscribe contents. No newly generated artwork.

Export only this template (preserves unrelated backend copies):

```
node scripts/render-companyos-emails.mjs ../os-diagnostic --diagnostic-only
node scripts/render-companyos-emails.mjs ../os-diagnostic --diagnostic-only --check
```

Validation: frontend unit suite; type/lint/token checks; static build; desktop/phone browser checks at 1440/390px with loaded images and no email overflow. Backend unit suite and real local PostgreSQL/fake-provider integration verify authorization, strict empty payload, disabled configuration, matching sender, concurrent reservation, provider acceptance and replay after outbox deletion. Signed delivery webhooks/retries are covered by the existing delivery integration suite. Provider acceptance and delivery are separate timestamps; actual inbox/Spam placement requires Justin's confirmation.

Review 1: fixed unrelated regenerated templates, live template routing, server bundle classification and OwnerGate. Review 2: fixed Hub/Pages anchor base paths with regression tests; reviewer verified the fix and found no remaining code blockers. Both independent review rounds are complete; the later user direction authorizes proceeding through the normal checked release path without waiting for named Anu approval.

No real email sent; no real request/provider ID or send timestamp exists. Do not report fake-provider receipts as live evidence.

Playbook inbox: Company OS IN-270.

Release preparation: frontend 1.1.0 requires Company OS >=1.13.0. Production must follow successful BG test deployment of the backend release.

Release CI corrections: keep the public sample Emails no-send wording distinct from the live owner diagnostic wording. The standalone Hub browser check now verifies a disabled sample send control and anonymous diagnostic rejection after submitting the synthetic local passphrase gate. The Secure gate cookie is forwarded only in the loopback HTTP test; runtime security is unchanged. Fresh independent integrated rounds found no new code blockers. Server/Hub builds, browser QA and package/security checks passed locally after this correction.

Latest-main reconciliation preserves the merged Storyboard direct-profile change from PR47. Diagnostic implementation remains independent of Patti annotation drafts.

Outlook follow-up: the diagnostic's existing wallpaper image previously retained a craftHero !mso exclusion after its background was removed. Remove only those hero exclusion markers so the ordinary image is available to classic Outlook. Red/green tests simulate conditional exclusion; Chromium390/640px normal/simulated markup shows loaded wallpaper and no overflow. Two independent rounds passed; actual Outlook application rendering remains unverified. No change to sender, recipient, auth, reservation, shared templates or sanitizer.

## Separately approved revised test (local, unpushed follow-up)

Justin later requested exactly one revised test. This branch adds the UI for a
second bounded backend authorization and retains both original/revised receipts.
The server pins original request3632e9c4-b3ac-476b-a3f1-471bdb8304c4 and stored
HTML SHA2567c25145b910f881b85da101a0b2cb6cc24e4d6e34254a40998fa3b2eb67582ad,
as well as the existing exact recipient/sender. Browser POST remains empty.
Existing/sample mode never sends. No old reservation is reset and changing a
hash cannot allocate another slot. Backend retains a single additional fixed
lifetime reservation. Outbox retention still reports history_unavailable and
never restores authority; do not promise indefinite provider-detail storage.

Proposed frontend release1.2.0 requires Company OS>=1.14.0. Backend runtime must
ship first, through its normal test/prod release gates. Coordinate integration
with the recovery integrator; branch starts at132cd15766785e05feaf892959dfa36541c7d9ce
and contains no unrelated recovery work. The backend handoff
`docs/history/diagnostic-revised-once.md` has the precise configuration and release
sequence. Coordinator alone may activate and perform the eventual single site
click after verifying both runtimes and exact template. This implementation does
not push, deploy, activate or send. No direct provider send is an acceptance test.

Playbook inbox: Company OS IN-273.
