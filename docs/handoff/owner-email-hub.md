# Owner email hub verification (18 November 2026)

Scope: same-sized cards with diagnostic last; owner detail views retain the live owner route, theme/device controls, explicit test/real-send sections and backend-sourced usage information. Invitation art and catalogue are untouched. Source base: frontend main 2ff2a26f5ca395d9351cadcef63f0f014786becb; backend main inspected read-only dfca42e7e4fdb61b66c057c654ff12cf81488b66.

No AGENTS.md or .agents/skills exists in the frontend repository at this base. The separate imagine-os/between-gigs checkout is an older, different product and its instructions were not applied to this repository. Backend AGENTS.md/CLAUDE.md were read; no backend edits or recipe application are included.

## Lifecycle and usage findings

A local renderer proves a source preview exists. Company OS message_template.active proves content availability, not editorial approval/publication. Its current module schema has no editorial approval lifecycle for these templates. The owner hub therefore reports approval/publication as not verified; it separately queries tenant-scoped message_template and automation using the signed-in super-admin session. Unreadable automation configuration is unknown, not inactive. Enabled triggers are labelled configuration, never proof of dispatch/runtime deployment.

At the inspected backend recipe:

- “Your profile is live” = approved renderer. Old approved automation on profile.reviewed/to=approved is inactive. New published automation uses the same approved template on profile.reviewed/to=published and is active in recipe. Approval alone does not send with the publication gate enabled. Actual tenant/runtime configuration still needs authenticated verification.
- “Almost ready” = changes-requested renderer. Recipe changes_requested automation is active on profile.reviewed/to=changes_requested.
- “Here's your sign-in code” = sign-in-code renderer. Not installed by the Company OS recipe; Clerk owns actual sign-in delivery. No evidence establishes this renderer is configured in Clerk.
- “We've got your profile” = profile-submitted renderer. Recipe profile_submitted listens to profile.submitted and profile_returned listens to profile.status_auto_returned; both active in source configuration. This contradicts treating it as definitely inactive, but does not establish editorial approval or actual runtime delivery.

The profile-submitted email imports REVIEW_TIME from emails/config.ts and still contains that turnaround promise. It shares the craft visual shell with the invitation. SubmittedPage is a separate component. Historical post-submit requests do not by themselves authorize changing this email's copy. No email copy changes are included, except correcting the approved template's discovery metadata to distinguish publication from approval. No claim is made about prior Justin/Patti email requests.

## Sending boundaries

Tests use the existing Company OS /comms/template-tests API, with the stored backend copy (not this frontend source). It adds TEST subject/body markings, uses backend-owned fictional sample data and inert personal/unsubscribe links, applies its existing opt-in and rate limits and owns actor-bound durable idempotency. A single plain address is validated again at the site boundary; lists, injection/display names and browser HTML/envelope/mode overrides are refused. Retry state is saved per owner/template before network and restored across same-tab navigation/reload. A new test requires explicit reset. Unsupported backend capability or template fails closed. No live requests were made during automated send tests: Company OS is mocked.

Real invitation sending retains the existing owner-only application workflow, suppression/opt-out/member checks and up-to-ten recipient parsing. UI explicitly labels this a REAL invitation, requires confirmation and prevents repeated clicks while pending. Every real invitation attempt is reserved in owner-scoped browser storage before the request, with cross-tab Web Locks, and remains blocked across mode changes/navigation/reload until an explicit history-aware reset. Server-wide durable deduplication of real invitations across devices is not added by this change. Do not retry an uncertain invitation without checking backend history. Other transactional emails have no safe generic manual real-send workflow: controls explain the required application event, and real sends remain disabled. Sign-in codes cannot be fabricated by this gallery.

Diagnostic retains its stricter pinned recipient jmassion@gmail.com and durable bounded reservation. Typing another recipient does not loosen authorization. It gets a normal last card and its own detailed preview with light/dark and device controls, confirmation before the existing intentional send action, and receipt reporting. No diagnostic authorization/configuration was changed.

## Release limits

No actual email send, delivery verification, template approval, template publication or recipe application was performed. Source template and stored live template may differ, including intentionally editor-owned content. Tests must never silently overwrite those records. Railway test/prod are authoritative; GitHub Pages is retired and must not be re-enabled. The existing Pages workflow file is left unchanged.

Safe generic non-test sends for every transactional template would need a reviewed backend contract for actual recipient context, approved stored version, per-template authorization, suppression and durable replay. This patch does not bypass those missing guarantees.

## Verification evidence

Initial safety suite failed because the new module was absent; implementation passed. Full frontend unit suite: 956 passed, 8 skipped at the first integration checkpoint. TypeScript, ESLint and raw-value lint passed. Static export checked 56 routes. Server build passed with temporary build staging under /workspace (cross-filesystem dependency copy to /tmp fails in this environment); server/preview/bundle checks are recorded separately below after final validation.

Browser screenshots: deliverables/owner-email-hub/ (local ignored artifacts). Four combinations (390/1440 pixels × OS light/dark), all five discovered templates and diagnostic: repeated scheme switching, phone/desktop fit, inactive live-preview links, navigation, sample-send disabled, no horizontal overflow, zero send requests. Opposite-OS diagnostic palettes were consistent: light rgb(239,233,223), dark rgb(24,24,24). scripts/qa/email-send-controls.mjs additionally bundles the actual components with fake identity/data/token and intercepts all requests: invalid/multiple recipient rejection, cancel confirmations, repeated clicks, persistent test replay keys and uncertain real invitation guard through mode change and reload passed. These are local/mock checks, not hosted owner authorization or inbox rendering proof.

Independent review round one caught theme, retry-state, unsafe-retry wording and preview-link issues; fixes are included. Fresh round two caught real-invitation guard reset, owner-identity state reset and automation-priority issues; fixes are included and re-reviewed before final receipt.

## 1.5.5 follow-up: actual backend header and replay contract

1.5.4 used an invalid colon in its upstream Idempotency-Key prefix. It failed closed, but the mocked gateway/provider tests missed the backend parser grammar. The targeted fix uses `owner-email_<UUID>` and executes the actual pinned Company OS parser declarations from a private checkout, with source fingerprint checks. No private backend source is vendored into this public repo. The private-source contract suite skips without its explicit checkout environment variable; public CI runs gateway/expiry/browser regressions, and a separate private-checkout contract run is required at release.

Company OS replay expires after 24 hours. New saved attempts keep their first-attempt timestamp, and both UI and gateway stop retries after 23 hours. A mounted-page timer, reload restoration, legacy records without timestamps, future clocks and the exact expiry boundary are covered. A blocked intent requires checking backend history and explicitly starting a new test; no timestamp/key is silently renewed. The timestamp is an accidental-retry guard, not a trusted security credential. No lifetime deduplication guarantee is made. Tests, authorization and backend replay are distinct from real delivery.

Release 1.5.5 is a patch after the 1.5.4 release/tag preparation; production dispatch remains with the parent release coordinator. No broader transactional recipient behavior, backend code, delivery activation or template publication changes are included.

The new contract suite first failed (two failures) before implementation. Against the actual private checkout, all 11 targeted tests pass without skips; the browser fixture passes fresh/reload retry, unchanged original timestamp, exact 23h/24h expiry, future/legacy intent blocking, mounted expiry and cancelled reset. Two independent reviewers verified the fixes, including a fresh-clock timer issue caught and repaired during review. No real email send or backend mutation was used.
