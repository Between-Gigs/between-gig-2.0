# Between Gigs 2.0 · Milestones

Between Gigs 2.0 redesigns the client-facing product on the **Between Gigs Design System** (`Between-Gigs/between-gigs-design-system`, v1.6.2). It does not touch the internal OS shell (wood / jade / marble, editors, funnel builder); that stays in `imagine-os/between-gigs` for the team.

Source of the priorities: Justin's voice note of 21 Oct 2026 (`docs/voice-note-2026-10-21.md`). Current-state audit of the existing app: `docs/current-state.md`.

**What the client needs, in their words:** beautiful emails; an invite to the ~500 waitlist sign-ups; register, log in, the questionnaire, see their profile; owners search everyone and open profiles; owners see each person's status and approve or suggest edits. Keep the admin "nice and clean and simple". Rich annotation and commenting are out of scope for now.

**Delivery model:** each milestone ships as a working Next.js front end built only from the design system, with a typed data layer (sample data now) whose interfaces match what Anu wires to the real backend (Cloudflare D1 + Supabase auth + Resend). Every milestone ends with a handoff note for Anu.

---

## Milestone 1 · Core design system ✅

Done. Tokens (light/dark), 51 React components, motion (page transitions, scroll reveals, theme reveal), materials, icons (Lucide + create-icon skill), templates (Coming soon, Search results, Gigster profile, Gigster onboarding), QA (contrast, axe, keyboard, detail inspection). Repo: `Between-Gigs/between-gigs-design-system`.

## Milestone 2 · Email, login, profile builder, profile page, Gigster search ✅

Done 21 Oct 2026. Handoff: [docs/handoff/milestone-2.md](docs/handoff/milestone-2.md) · data seams: [docs/handoff/data-layer.md](docs/handoff/data-layer.md) · system gaps: [docs/design-system-requests.md](docs/design-system-requests.md).

- [x] Emails: invite, sign-in code, profile submitted, with previews at `/emails` (light / dark, desktop / phone, plain text) and a sample outbox
- [x] Register from invite (`/join`), used / expired / unknown invite states; email-code sign in (`/login`), resend, wrong / expired codes; sign out
- [x] Profile builder (`/profile/edit`): five steps, autosave and resume, per-step validation with summary, live preview, submit → confirmation + queued email
- [x] My profile (`/profile`) with status banner for every status; public profile (`/p/[slug]`, approved only)
- [x] Owner people search (`/owners/people`) and person view, with the seams for Milestone 4
- [x] Demo switcher, GitHub Pages workflow, QA (screens, axe, end-to-end flow) in `pnpm check`

The client's critical path for Gigsters, plus owner search.

- **Invite email** to the waitlist: "Professional onboarding is open". Personal link to register. HTML + plain text, light and dark mail clients, matches the brand. Also: **magic-code / sign-in email** and **"profile submitted" confirmation email**.
- **Register** from the invite link (prefilled email), **log in** (email code first; password optional), sign out, expired / used link states.
- **Profile builder** (the questionnaire): About you → Skills & services → Where & when → Your story → Review & submit, with save-and-resume, validation, live preview, and status (Draft → Submitted).
- **My profile**: the Gigster's own profile page, with status banner (Draft / Submitted for review / Changes requested / Approved) and an Edit entry back into the builder.
- **Public profile page**: what clients will see once approved.
- **Gigster search** (owner-facing): search and filter everyone, open a profile.
- **Email previews** at `/emails/*`; templates as `{ subject, html, text }` functions so they drop into the existing Resend pipeline.

Done when: a person can go invite email → register → complete and submit the questionnaire → see their profile, and an owner can search and open it, in light and dark, desktop and phone, with the QA suite passing.

## Milestone 3 · Every page and email in the initial funnel, redesigned ✅

Done 21 Oct 2026. Handoff: [docs/handoff/milestone-3.md](docs/handoff/milestone-3.md).

- [x] `/professionals` with the 3-step "Get on the call sheet" dialog
- [x] Welcome and Coming-soon emails (previews at `/emails`)
- [x] `/storyboard`: the approved artwork as a book, catalog of commissions, talent and buyer forms
- [x] Privacy (with request form), Terms, Provider standards, Licensing & insurance
- [x] Journal list, article (with budget planner, production kit, FilmLA chart) and author pages
- [x] QA routes and end-to-end funnel flow in `pnpm check`

The live funnel today: Crew Stories / iMessage → `/professionals` → "Get on the call sheet" (email + ZIP, then optional service details) → **Welcome email** → `/storyboard` → talent or buyer form → **Coming-soon email**.

- `/professionals` landing page (hero, benefits, 10 crafts, sample profiles, "Your next chapter", founders, FAQ, final CTA) and its 3-step sign-up dialog.
- Welcome email and Coming-soon email.
- Storyboard talent and buyer forms (restyled wrappers; the story artwork stays as approved).
- Policy pages: Privacy, Terms, Licensing & insurance, Provider standards.
- Journal list, article and author pages.
- Same copy as approved (Patti Lenkov approved `/professionals` copy on 27 Sep 2026); polish, don't rewrite.

## Milestone 4 · Executive / admin experience ✅

Done 21 Oct 2026. Handoff: [docs/handoff/milestone-4.md](docs/handoff/milestone-4.md).

- [x] Owner sign-in (email code) → `/owners` dashboard: counts by status, ready for review, waitlist progress, recent activity
- [x] People list (`/owners/people`): search, filter by status / service / area / availability, sort; bulk invite lives on the waitlist
- [x] Review (`/owners/review` queue → person page): profile as clients see it, checklist, Approve profile or Suggest edits (one note per section)
- [x] Approved and Changes requested emails
- [x] Waitlist (`/owners/waitlist`): ~500 sign-ups, Not invited / Invited / Opened / Registered, select and invite in bulk

Simple, calm, for the owners (Patti & Peter), not the OS shell.

- Owner sign-in and a dashboard: counts by status (Invited, Registered, Draft, Submitted, Changes requested, Approved), recent activity.
- People list: search, filter by status / service / area, sort, bulk invite.
- Review a submission: the profile as clients would see it, a checklist, **Approve** or **Suggest edits** (one short note per section, no threaded commenting).
- Emails: **Approved** and **Changes requested** to the Gigster.
- Waitlist view (the ~500 sign-ups): invite status (Not invited / Invited / Opened / Registered).

## Milestone 5 · The "call sheet" home page ✅

Done 21 Oct 2026. Handoff: [docs/handoff/milestone-5.md](docs/handoff/milestone-5.md).

- [x] 5a: `/` rebuilt from the ComingSoon template, same words, “Get on the call sheet ↗” → /professionals (the Milestone 2–4 guide moved to `/preview`)
- [x] 5b: `/proposals/home`: signed out, Gigster and owner home pages as designed proposals, with design notes

- **5a.** Today's homepage ("Extraordinary talent. Everyday solutions." / "Coming soon." / "Los Angeles Call Sheet" / "Get on the call sheet ↗") rebuilt in the new style.
- **5b.** A second version with recommendations for what the home page should be once the platform is open, **logged out** (clients finding help; Gigsters joining) and **logged in** (Gigster: profile status, next steps, requests; owner: review queue), as designed proposals with rationale.

---

### Working rules for this repo

- Build only from the design system (tokens + components). No hex values or arbitrary Tailwind values in app code.
- Copy comes from the existing app and the client; mark anything new as a proposal.
- Light and dark, desktop and phone, keyboard and screen reader, reduced motion.
- Do not push to `between-gigs-design-system` from work in this repo. If the system needs something, propose it in `docs/design-system-requests.md`.
