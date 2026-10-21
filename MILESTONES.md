# Between Gigs 2.0 · Milestones

Between Gigs 2.0 redesigns the client-facing product on the **Between Gigs Design System** (`Between-Gigs/between-gigs-design-system`, v1.6.2). It does not touch the internal OS shell (wood / jade / marble, editors, funnel builder); that stays in `imagine-os/between-gigs` for the team.

Source of the priorities: Justin's voice note of 21 Oct 2026 (`docs/voice-note-2026-10-21.md`). Current-state audit of the existing app: `docs/current-state.md`.

**What the client needs, in their words:** beautiful emails; an invite to the ~500 waitlist sign-ups; register, log in, the questionnaire, see their profile; owners search everyone and open profiles; owners see each person's status and approve or suggest edits. Keep the admin "nice and clean and simple". Rich annotation and commenting are out of scope for now.

**Delivery model:** each milestone ships as a working Next.js front end built only from the design system, with a typed data layer (sample data now) whose interfaces match what Anu wires to the real backend (Cloudflare D1 + Supabase auth + Resend). Every milestone ends with a handoff note for Anu.

---

## Milestone 1 · Core design system ✅

Done. Tokens (light/dark), 51 React components, motion (page transitions, scroll reveals, theme reveal), materials, icons (Lucide + create-icon skill), templates (Coming soon, Search results, Gigster profile, Gigster onboarding), QA (contrast, axe, keyboard, detail inspection). Repo: `Between-Gigs/between-gigs-design-system`.

## Milestone 2 · Email, login, profile builder, profile page, Gigster search

The client's critical path for Gigsters, plus owner search.

- **Invite email** to the waitlist: "Professional onboarding is open". Personal link to register. HTML + plain text, light and dark mail clients, matches the brand. Also: **magic-code / sign-in email** and **"profile submitted" confirmation email**.
- **Register** from the invite link (prefilled email), **log in** (email code first; password optional), sign out, expired / used link states.
- **Profile builder** (the questionnaire): About you → Skills & services → Where & when → Your story → Review & submit, with save-and-resume, validation, live preview, and status (Draft → Submitted).
- **My profile**: the Gigster's own profile page, with status banner (Draft / Submitted for review / Changes requested / Approved) and an Edit entry back into the builder.
- **Public profile page**: what clients will see once approved.
- **Gigster search** (owner-facing): search and filter everyone, open a profile.
- **Email previews** at `/emails/*`; templates as `{ subject, html, text }` functions so they drop into the existing Resend pipeline.

Done when: a person can go invite email → register → complete and submit the questionnaire → see their profile, and an owner can search and open it, in light and dark, desktop and phone, with the QA suite passing.

## Milestone 3 · Every page and email in the initial funnel, redesigned

The live funnel today: Crew Stories / iMessage → `/professionals` → "Get on the call sheet" (email + ZIP, then optional service details) → **Welcome email** → `/storyboard` → talent or buyer form → **Coming-soon email**.

- `/professionals` landing page (hero, benefits, 10 crafts, sample profiles, "Your next chapter", founders, FAQ, final CTA) and its 3-step sign-up dialog.
- Welcome email and Coming-soon email.
- Storyboard talent and buyer forms (restyled wrappers; the story artwork stays as approved).
- Policy pages: Privacy, Terms, Licensing & insurance, Provider standards.
- Journal list, article and author pages.
- Same copy as approved (Patti Lenkov approved `/professionals` copy on 27 Sep 2026); polish, don't rewrite.

## Milestone 4 · Executive / admin experience

Simple, calm, for the owners (Patti & Peter), not the OS shell.

- Owner sign-in and a dashboard: counts by status (Invited, Registered, Draft, Submitted, Changes requested, Approved), recent activity.
- People list: search, filter by status / service / area, sort, bulk invite.
- Review a submission: the profile as clients would see it, a checklist, **Approve** or **Suggest edits** (one short note per section, no threaded commenting).
- Emails: **Approved** and **Changes requested** to the Gigster.
- Waitlist view (the ~500 sign-ups): invite status (Not invited / Invited / Opened / Registered).

## Milestone 5 · The "call sheet" home page

- **5a.** Today's homepage ("Extraordinary talent. Everyday solutions." / "Coming soon." / "Los Angeles Call Sheet" / "Get on the call sheet ↗") rebuilt in the new style.
- **5b.** A second version with recommendations for what the home page should be once the platform is open, **logged out** (clients finding help; Gigsters joining) and **logged in** (Gigster: profile status, next steps, requests; owner: review queue), as designed proposals with rationale.

---

### Working rules for this repo

- Build only from the design system (tokens + components). No hex values or arbitrary Tailwind values in app code.
- Copy comes from the existing app and the client; mark anything new as a proposal.
- Light and dark, desktop and phone, keyboard and screen reader, reduced motion.
- Do not push to `between-gigs-design-system` from work in this repo. If the system needs something, propose it in `docs/design-system-requests.md`.
