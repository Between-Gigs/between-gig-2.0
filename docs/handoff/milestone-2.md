# Milestone 2 handoff (for Anu)

**Status: complete.** `pnpm check` passes (typecheck, ESLint, raw-value lint, static build, and QA: screenshots of 27 routes in light and dark at 1440 and 390 with no horizontal scroll, axe on every route with no violations, and the end-to-end flow).

A person can go **invite email → register → sign in with a code → complete and submit the questionnaire → see their profile**, and an **owner can search and open it**, in light and dark, desktop and phone. Everything runs on a client-side sample data layer behind one interface, ready to point at the real backend.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # typecheck + lint + raw-value lint + build + QA (≈6 min)
pnpm qa:flow      # just the end-to-end flow (after pnpm build)
```

QA uses the preinstalled Chromium at `/opt/pw-browsers/chromium` (set `CHROMIUM_PATH` elsewhere). Output (screenshots, `axe.json`, flow shots) goes to `qa/output/`, which is gitignored.

Preview: GitHub Pages at `/between-gig-2.0` via `.github/workflows/pages.yml`. **One-time setting:** repo Settings → Pages → Source: **GitHub Actions**.

Use the Preview guide (`/preview/`) to switch roles. (The floating **Demo** button that did this was removed at the client's request.)

## Stack

Next.js 16.3 App Router, React 19.2, TypeScript strict, Tailwind v4.2, pnpm, lucide-react: the same versions as `imagine-os/between-gigs`, so the code can merge. `output: "export"` (static) for Pages, so there are no route handlers or server actions here; when this moves into the Worker app, the `DataSource` implementation becomes fetches to its API.

## Routes

| Route | What | Who |
| --- | --- | --- |
| `/` | Guide to the preview (the real home page is Milestone 5) | Anyone |
| `/emails`, `/emails/[name]` | Email previews: light / dark, desktop / phone, subject + preheader, plain text, copy HTML; and the sample outbox | Team |
| `/join?invite=…` | Register from the invite: email prefilled and locked, name, terms. Used / expired / unknown / missing-token states | Invited |
| `/login` | Email → 6-digit code; resend after 30 s; wrong, expired, too-many-tries states; `?next=`, `?email=`, `?signedOut=1` | Anyone |
| `/profile/edit` | The questionnaire (five steps); `?step=review` jumps to review | Gigster |
| `/profile` | My profile with status banner (Not started / Draft / Submitted for review / Changes requested with notes / Approved) | Gigster |
| `/p/[slug]` | Public profile, approved only; others see "not public yet" | Anyone |
| `/owners/people` | People search: text, status (also via the count tiles), service, area, availability; sort; list / grid; re-flow animation | Owner |
| `/owners/people/[id]` | One person: status, dates, waitlist data, completeness, notes, their profile or draft | Owner |

Sign out is in the account menu (top right).

**Static export detail:** `/p/[slug]` and `/owners/people/[id]` prerender the seed ids. Ids created later (someone who joins in the demo) have no file, so Pages serves `404.html`; `app/not-found.tsx` reads the URL and renders the right view. In the Worker app these are ordinary dynamic routes; delete that fallback.

## Code map

| Path | What |
| --- | --- |
| `lib/data/` | **The seam.** `types.ts` (model), `source.ts` (`DataSource` interface), `sample.ts` (localStorage implementation), `seed.ts` (24 fictional people), `taxonomy.ts` (option lists), `index.ts` (picks the implementation). See [data-layer.md](data-layer.md). |
| `lib/profile/validate.ts` | Per-step validation, completeness. Use the same file server-side. |
| `emails/` | `invite.ts`, `sign-in-code.ts`, `profile-submitted.ts` → `{ subject, preheader, html, text }`. `layout.ts` (shell and parts), `tokens.ts` (generated literal colors), `index.ts` (`renderEmail`, registry, sample props). No React; runs in a Worker or Edge Function. |
| `components/` | `site/` (header, footer, page frame, 404), `auth/`, `builder/`, `profile/` (ProfileView is shared by public, own and owner views), `owners/`, `emails/` (previews), `people/` (status badge, portrait), `demo/`, `ui/`. |
| `lib/motion.ts` | Route view transitions: the portrait morphs from the search card into the person page. |
| `lib/guard.ts`, `lib/session.ts` | Client-side session and role gate. **The API must enforce roles; this only decides what to render.** |
| `packages/design-system/` | Vendored design system v1.6.2 (`VERSION` has the commit). Imported as `@ds/components`, `@ds/motion`. Never edit; re-sync with `scripts/sync-design-system.sh <clone>`. The gigs templates are in `reference/` (not built). |
| `scripts/` | `check-raw-values.mjs` (lint), `build-email-tokens.mjs`, `build-email-assets.mjs`, `sync-design-system.sh`, `qa/` (server, routes, screens, axe, flow). |

Rules held throughout: only tokens and system components in `app/`, `components/`, `lib/` (`pnpm lint:values`). Emails are the exception and take their colors from `tokens.json`.

## Emails

| Template | Subject | When |
| --- | --- | --- |
| Invite | Professional onboarding is open | Batch to the ~500 waitlist sign-ups. Personal `/join?invite=` link, 30-day expiry in the copy. |
| Sign-in code | `{code} is your Between Gigs sign-in code` | On `requestCode`. 10-minute expiry. |
| Profile submitted | We've got your profile, `{first}` | On `submit`. |

Table layout, 600px, inline styles, bulletproof button (Outlook desktop), preheader, PNG logo with alt text, plain-text twin, and a dark-mode stylesheet for Apple Mail / iOS / Outlook.com (`[data-ogsc]`); Gmail shows the light version. The copy reuses approved phrases ("Your next chapter starts here", "Production comes first", "Your skills don't stop when the cameras do") and is signed Patti & Peter. **The wording of all three is a proposal** for Patti and Peter to approve. Footer address and links match today's welcome email.

## What's mocked

- All data (localStorage), all email sending (local outbox), sign-in codes (shown on screen in sample mode, with an "Expire it" button to test that state).
- Photo upload (stored as a small data URL).
- "Request {name}" on public profiles opens a preview modal and sends nothing (booking is not in scope).
- Every person, photo, credit and IMDb link is fictional and labelled so ("Fictional sample" in the header, "Fictional profile" on sample profiles, "Credits not verified" on every profile). No reviews are shown, real or invented.

## Seams left for Milestone 4 (owner dashboard)

- `review_notes` and `PersonStatus` already carry **Changes requested** end to end: notes show on the Gigster's banner, on the matching builder step and on review; resubmitting clears them.
- `/owners/people/[id]` shows a "Waiting for review" banner where **Approve** and **Suggest edits** will go. Add `people.approve(id)` and `people.requestChanges(id, notes)` to `DataSource`, plus the Approved / Changes requested emails.
- The status count tiles on `/owners/people` are the start of the dashboard counts.

## Open questions

1. **Passwords.** The plan says "email code first; password optional". This milestone ships codes only. Do the owners want passwords at all for Gigsters?
2. **Account enumeration.** `/login` says "We couldn't find an account for that email", which reveals whether an email is registered. Friendlier for 500 invitees; the alternative is always saying "If there's an account, we sent a code". Your call with Justin.
3. **Editing after approval.** Today an approved Gigster can edit; changes stay a draft until they submit again, and resubmitting sends them back to review, which takes their public page down until it's approved again. The template mentions "an availability-only edit keeps your review status". Should availability edits skip review?
4. **Taxonomy.** On-set skills, off-set services and LA areas come from the onboarding template (marked draft). The waitlist used different categories (`leads.category`). Which list is final?
5. **Invite expiry and resends.** 30 days is in the copy; confirm, and decide who can resend (owners in Milestone 4?).
6. **IMDb required.** The template requires an IMDb link and at least one credit. Some crew may not have an IMDb page.
7. **Owner sign-in.** Owners use the same code login here. Should they be the existing `hub_memberships` super admins, or a new `owner` role?
8. **Photo storage.** R2 or Supabase Storage, and any moderation step before a photo goes public.

## Design system requests

See [../design-system-requests.md](../design-system-requests.md): status words (Invited, Registered, Submitted), Button as a link, large portrait, chip picker, photo picker, router-aware breadcrumbs, email token export and PNG logos, route transitions, React 19 peer range.
