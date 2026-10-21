# Current state of the existing app (imagine-os/between-gigs @ 99c0b43, "release 3.73")

Audit, read-only, 21 Oct 2026. Summary of what exists today, for planning the 2.0 redesign.

## Stack
- Next 16.3 App Router, React 19.2, run through **vinext** (Vite 8 + RSC) and built to a **Cloudflare Worker**. pnpm 11, Node ≥ 22.13, TypeScript 5.9.
- Tailwind v4.2 + shadcn/radix, but most pages use hand-written CSS files.
- **Data**: Cloudflare **D1** (Drizzle; `db/schema.ts`) for forms and the waitlist; **Supabase** only for team auth (`hub_memberships`, role `super_admin`) and the `send-welcome` Edge Function.
- **Email**: Resend via Supabase Edge Function; templates are hand-written HTML/text string functions (`lib/welcome-template.ts`, `lib/coming-soon-template.ts`), from "Between Gigs <hello@between-gigs.com>". Outbox table `welcome_email_outbox` with retries (pg_cron every 5 min).
- Hosted on OpenAI Sites with a GitHub mirror; heavy release process (design locks, ledger, receipts).

## Live funnel
`Crew Stories FB group / Patti & Peter iMessages → /professionals → "Get on the call sheet" → Welcome email → /storyboard → talent or buyer form → Coming-soon email`

- `/` — coming-soon "call sheet": "Extraordinary Talent. Everyday Solutions." / "Coming **soon.**" / "Los Angeles Call Sheet" / "Get on the call sheet ↗" → `/professionals`.
- `/professionals` — hero "Your skills don't stop when the cameras do." → benefits → services (10 crafts) → 4 sample profiles (Maya, Luis, Renee, Devon) → "Your next chapter" → founders → FAQ → final CTA.
- Sign-up dialog: (1) email + ZIP (`POST /api/professionals3`, D1 `leads` + `form_responses`, welcome email queued) → (2) "You're on the list." optional service category + "What would you offer?" (`/api/professionals3/details`) → (3) "Thank you for joining!"
- Service categories (`lib/professional3-options.ts`): builds, styling, makeup, hair, wardrobe, interiors, photo, events, coaching, venues, archives, other.
- `/storyboard` — locked HTML; talent form (name, email, role, services, location, availability; rate, details optional) and buyer form (name, email, project, location, timing, team size; budget, details optional) → `/api/sketches`.
- Policy pages `/privacy`, `/terms`, `/licensing-insurance`, `/provider-standards`; Journal `/journal`, `/journal/[slug]`, `/journal/authors/[slug]`.

## Emails today
- **Welcome** — "Your next chapter starts here." (links to the Storyboard). Sent for the `/professionals` sign-up.
- **Coming-soon** — "Thank you. The next chapter is coming." signed Patti & Peter. Sent for Storyboard forms.
- Founding 20 campaign emails exist as drafts only.

## Not built yet (the client's asks)
- No invite email, no Gigster registration, no questionnaire / profile builder, no profile page, no draft/submitted/approved/changes-requested statuses, no owner tools to search, approve or suggest edits on professionals.
- Login exists for the team only (`/login`: Google, password, email code via Supabase).
- `/builder/responses` lists raw form responses (search, filter, CSV) — the closest thing to an admin list; no actions on people.

## Brand tokens in the old app
`config/design-system.json` "mint-forest": dark default (bg `#012B18`, primary `#03FF96`), Trebuchet MS headings, Arial UI. 2.0 replaces this with the Between Gigs Design System (Sora / Figtree / Newsreader / JetBrains Mono, forest + mint).

## People
Justin (builder/owner), Patti Lenkov & Peter (founders), Anu (developer, receives the handoff).
