# Owner email hub verification (18 November 2026)

Scope: same-sized cards with diagnostic last; owner detail views retain the live owner route, theme/device controls, explicit test/real-send sections and backend-sourced usage information. Invitation art and catalogue are untouched. Source base: frontend main 2ff2a26f5ca395d9351cadcef63f0f014786becb; backend main inspected read-only (see commit in verification receipt).

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

Real invitation sending retains the existing owner-only application workflow, suppression/opt-out/member checks and up-to-ten recipient parsing. UI explicitly labels this a REAL invitation, requires confirmation and prevents repeated clicks while pending. Uncertain failure blocks immediate repeat in that mounted view; server-wide durable deduplication of real invitations is not added by this change. Do not retry an uncertain invitation without checking backend history. Other transactional emails have no safe generic manual real-send workflow: controls explain the required application event, and real sends remain disabled. Sign-in codes cannot be fabricated by this gallery.

Diagnostic retains its stricter pinned recipient jmassion@gmail.com and durable bounded reservation. Typing another recipient does not loosen authorization. It gets a normal last card and its own detailed preview with light/dark and device controls, confirmation before the existing intentional send action, and receipt reporting. No diagnostic authorization/configuration was changed.

## Release limits

No actual email send, delivery verification, template approval, template publication or recipe application is authorized as a test here. Source template and stored live template may differ, including intentionally editor-owned content. Tests must never silently overwrite those records. Railway test/prod are authoritative; GitHub Pages is retired and must not be re-enabled. The existing Pages workflow file is left unchanged.

Safe generic non-test sends for every transactional template would need a reviewed backend contract for actual recipient context, approved stored version, per-template authorization, suppression and durable replay. This patch does not bypass those missing guarantees.
