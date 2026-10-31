# 2.0 on Company OS: the live data layer, locally

The backend is Company OS (decisions N-01 to N-13 in Company OS `docs/customers/between-gigs/decision-log.md`;
method-by-method mapping in its `gap-analysis.md` §13). The sample stays the default for the preview and `pnpm check`.

## The pieces

Server-only files are named `*.server.ts`: next.config's `pageExtensions` keeps them out of the static (Pages) build
and in the server build (Railway).

| File | What it does |
| --- | --- |
| `lib/data/api.ts` | The live DataSource: a POST per method to 2.0's own `/api/<group>/<method>`, with the Clerk session token. Picked by `NEXT_PUBLIC_DATA_SOURCE=api` (`lib/data/index.ts`). |
| `lib/server/routes.ts` | The routes' table: each method's credential (session, owner, public reader, submit-only), the honeypot and per-IP limit on public forms, refusals passed through. `app/api/**/route.server.ts` are one line each. |
| `lib/server/gigs.ts` | Each method in Company OS calls, and Company OS records as 2.0's types. |
| `lib/server/companyos.ts` | The Company OS client. Server only. |
| `lib/server/media.ts`, `app/media/[id]/route.server.ts` | Photos, streamed from Company OS's short-lived links. |
| `lib/data/contract/*` | The DataSource contract suite: `pnpm test` (sample), `pnpm test:live` (local Company OS). |

Server environment (never `NEXT_PUBLIC_`; the deploy sets them, docs/handoff/companyos-deploy.md): `COMPANY_OS_URL`,
`COMPANY_OS_TENANT` (`between-gigs-dev` on test, `between-gigs` in production), `COMPANY_OS_READ_TOKEN` (public_reader),
`COMPANY_OS_SUBMIT_TOKEN` (form_submitter, submit mode), `APP_URL`, `CLERK_SECRET_KEY` (see clerk.md).

## Running it against a local Company OS

1. In Company OS: a database of your own (`create database configurator_f1`, then `DATABASE_URL=… pnpm db:migrate`).
2. Here: `node scripts/companyos-local/fake-storage.mjs` (port 4100). Company OS's file routes need storage, and a
   photo is required to submit.
3. Company OS's API with `AUTH_PROVIDER=dev`, `CLERK_AUTHORIZED_PARTIES=http://localhost:3000`,
   `SUPABASE_URL=http://localhost:4100`, `SUPABASE_SERVICE_ROLE_KEY=fake-local`, `STORAGE_BUCKET_PRIVATE=private`,
   `STORAGE_BUCKET_PUBLISHED=published`, `MESSAGING_EMAIL_PROVIDER=fake`, `MESSAGING_EMAIL_ALLOWED_DOMAINS=between-gigs.example`.
4. `node scripts/companyos-local/setup.mjs`: the made-up tenant, the recipe, the test seed with its photos, the two
   service identities; writes `.env.companyos.local` (git-ignored).
5. `pnpm test:live`. Company OS's dev login stands in for Clerk.

## What behaves differently live (agreed)

No "opened" stage; undo is an 8-second hold in the review toast (`components/owners/hold.ts`); invite-only `/join`
on Clerk's invitation ticket; editing an approved profile takes it off the site until it's approved again
(availability exempt), with a warning first; the builder step stays in the browser; emails come from Company OS.

## New copy (proposals for Anouwar and Justin)

The live-edit warning (`components/profile/LiveEditWarning.tsx`), the invite-only `/join` panel and its details step
(`components/auth/InviteJoin.tsx`), the photo upload error (`PhotoPicker`), the failed held-decision toasts and the
approved-profile banner in the builder.
