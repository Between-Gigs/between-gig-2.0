# Data layer: from sample to backend

Everything the UI reads or writes goes through one interface, `DataSource` (`lib/data/source.ts`). Today `lib/data/index.ts` exports the localStorage sample (`lib/data/sample.ts`). To go live, write a second implementation that calls the Worker API and export it from `lib/data/index.ts` instead. No component imports the sample directly (the Preview guide and QA use the optional `demo` block, which the live implementation leaves out).

Every method is async and returns plain JSON-able objects, so each maps to one API route. Types live in `lib/data/types.ts`.

## What is real and what is sample

| | Sample (now) | Production (Anu) |
| --- | --- | --- |
| Storage | One localStorage key `bg2-sample-v1`, seeded from `lib/data/seed.ts` | Cloudflare D1 |
| Auth | Session object in the same key; with a Clerk key, Clerk signs in and the session mirrors it | Clerk (email code), verified in the Worker |
| Email | Rendered and pushed to a local outbox, visible at `/emails` | Rendered by the same `emails/*.ts` functions and queued in the Resend outbox |
| Photos | Resized to 480px JPEG data URL | Upload to storage (R2 or Supabase Storage), keep the URL |
| Authorization | Client-side guard only (`lib/guard.ts`) | Checked in the API on every call |

## Proposed tables (D1)

The existing `leads` table holds the waitlist (email, ZIP `zip_code`, `category`). Milestone 2 needs, as a proposal:

| Table | Columns | Notes |
| --- | --- | --- |
| `people` | `id`, `lead_id` → `leads.id`, `email`, `name`, `slug` (unique), `status`, `invited_at`, `registered_at`, `submitted_at`, `approved_at`, `updated_at`, `auth_user_id` (Clerk user id) | One row per invited waitlist sign-up. `status` is one of `invited · registered · draft · submitted · changes_requested · approved`. |
| `invites` | `token_hash` (unique), `person_id`, `email`, `created_at`, `expires_at`, `used_at` | Store a hash of the token, never the token. 30-day expiry in the copy. |
| `profile_drafts` | `person_id` (pk), `fields` (JSON), `step`, `saved_at` | The autosaved working copy. |
| `profiles` | `person_id` (pk), `fields` (JSON), `submitted_at` | Frozen copy at submit. The public page reads only this, and only when `people.status = 'approved'`. |
| `review_notes` | `id`, `person_id`, `section` (`about · skills · where · story`), `note`, `by`, `created_at` | Written by owners in Milestone 4 ("Suggest edits"). One short note per section, no threads. |

`fields` is `ProfileFields` (`lib/data/types.ts`) as JSON. If you'd rather keep everything in `form_responses` (`form_id = 'gigster-profile'`, `payload` JSON), `profile_drafts` and `profiles` map onto it one-to-one; the interface doesn't change.

## Method by method

### people (owners, except `getPublic` and `similar`)

| Method | Route (proposal) | Backend |
| --- | --- | --- |
| `list(query)` | `GET /api/people?text&status&service&area&availability&sort` | `people` left join `profiles` / `profile_drafts`; owner role required. Filtering by service / area reads the JSON `fields` (`json_each`) or denormalised columns. `completeness` is computed with `lib/profile/validate.ts` (share it with the Worker). |
| `get(id)` | `GET /api/people/:id` | Owner, or the person themself. |
| `getPublic(slug)` | `GET /api/p/:slug` | Public. Returns `profile: null` unless `status = 'approved'`. Never return email. |
| `similar(id)` | `GET /api/p/:slug/similar` | Approved people, prefer ones with photos. |

### invites

| Method | Route | Backend |
| --- | --- | --- |
| `lookup(token)` | `GET /api/invites/:token` | Hash the token, look up `invites`. `state`: `valid`, `used` (`used_at` set), `expired` (`expires_at` past), `unknown`. Return only the email and state, not the person. |

### auth (Clerk)

Sign-in is Clerk (see [clerk.md](clerk.md)). In the browser, Clerk's own components do the email code; the
front end then calls `syncExternal` so the rest of the app sees a normal `Session`. The Worker verifies Clerk's
session token on every request (`@clerk/backend` `verifyToken`, with `CLERK_SECRET_KEY` as a Worker secret).

| Method | Route | Backend |
| --- | --- | --- |
| `session()` | `GET /api/session` | Verify the Clerk session token (`Authorization: Bearer`, from `getToken()`) → `people.auth_user_id` → `{ personId, email, role, name }`. Owners: Clerk `publicMetadata.role === "owner"`. |
| `syncExternal({ email, name, role, inviteToken, acceptedTerms })` | `POST /api/session/sync` | Called right after Clerk signs someone in. Never trust the body's email or role: read both from the verified token / Clerk user. Look up `people` by email; if `invited`, check the invite token, then set `name`, `slug`, `status = 'registered'`, `invites.used_at`, `auth_user_id`, and record the terms version. Unknown email → `unknown-email` (joining stays invite-only). |
| `register({ token, name, acceptTerms })` | – | Sample login only. With Clerk, `syncExternal` does this. |
| `requestCode(email)` / `verifyCode(email, code)` | – | Sample login only. Clerk sends and checks the code. Restrict sign-ups to invited emails with a Clerk allowlist or a `user.created` webhook check. |
| `signOut()` | – | `clerk.signOut()` in the browser (ClerkLayer also clears the app session). |
| `onChange(listener)` | – | Unchanged: fires when the app session changes. |

### profiles

| Method | Route | Backend |
| --- | --- | --- |
| `getDraft(personId)` | `GET /api/profile/draft` | `profile_drafts`, or a blank draft with the registered name. |
| `saveDraft(personId, fields, step)` | `PUT /api/profile/draft` | Upsert. First save moves `registered → draft`. Never changes `submitted / approved`. The builder calls this ~0.7 s after the last change. |
| `submit(personId)` | `POST /api/profile/submit` | Validate with `validateAll` server-side, copy draft → `profiles`, `status = 'submitted'`, clear `review_notes`, queue `profile-submitted`. |
| `getProfile(personId)` | `GET /api/profile` | `profiles`. |

### owners: additions from the UI/UX round

The full owner method list is in `lib/data/source.ts` and docs/handoff/milestone-4.md. Two additions:

| Method / field | Route | Backend |
| --- | --- | --- |
| `dashboard().funnel` | `GET /api/owners/dashboard` | Cumulative stage counts: `signups` (leads) → `invited` (leads with an invite) → `opened` (invite opened) → `accountCreated` (people registered or later) → `submitted` (ever submitted) → `approved`. Count everyone who ever reached a stage, so each is a subset of the one before; keep status history (or timestamps like `submitted_at`) so a profile sent back for edits still counts as submitted. |
| `undoReview(personId)` | `POST /api/owners/people/:id/undo-review` | Undo for the toast right after approve / request changes: set `status = 'submitted'`, clear the review notes, delete that decision's activity row, and cancel its outbox email if still queued (never recall one already sent). Only allow it for the latest decision, within a short window. |

### emails (Resend outbox)

| Method | Route | Backend |
| --- | --- | --- |
| `outbox()` / `get(id)` | – | Owner tooling only; not needed in production UI. |
| `queue(template, to, props)` | server-side only | Insert into the existing `welcome_email_outbox` with `message_type = template` and `template_payload = JSON.stringify(props)`. The sender renders with `renderEmail(template, props, { assetBase: SITE_URL, siteUrl: SITE_URL })` and sends `subject`, `html`, `text` through Resend from `Between Gigs <hello@between-gigs.com>`. |

The **invite** email isn't sent by the UI in this milestone: send it in a batch script over `leads` (one `people` + `invites` row per lead, then queue `invite` with `inviteUrl = ${SITE_URL}/join?invite=${token}`). Mark the batch so it can be resumed.

## Email assets

The emails load the logo from `${assetBase}/email/between-gigs-wide-on-{light,dark}.png`. Deploy `public/email/` to `https://between-gigs.com/email/`. Rebuild the PNGs with `node scripts/build-email-assets.mjs` after a logo change.
