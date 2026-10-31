# Backend handoff (for Anu)

> **Superseded (2026-10-31).** The backend is Company OS, not the Cloudflare Worker this page plans: 2.0's own server
> routes (`lib/server/*`, `app/api/**`) call it, and the web server has no `CLERK_SECRET_KEY` (Company OS verifies the
> Clerk session token). What is live: [companyos-local.md](companyos-local.md), [companyos-deploy.md](companyos-deploy.md)
> and Company OS `docs/customers/between-gigs/gap-analysis.md` §13. Kept as the record of the first plan.

The front end is built and runs as a static site on sample data. Every read and write goes through one interface,
`DataSource` ([`lib/data/source.ts`](../../lib/data/source.ts)), so the backend work is a Worker API plus one
replacement implementation: write `lib/data/api.ts` with `fetch` calls and export it from `lib/data/index.ts`
(leave out the optional `demo` block). Method-by-method details: [data-layer.md](data-layer.md), owners:
[milestone-4.md](milestone-4.md), funnel: [milestone-3.md](milestone-3.md), sign-in: [clerk.md](clerk.md).

## Links

- Preview guide (sign in as any role): https://between-gigs.github.io/between-gig-2.0/preview/
- Live preview: https://between-gigs.github.io/between-gig-2.0/
- Owner dashboard: https://between-gigs.github.io/between-gig-2.0/owners/
- Every email + sample outbox: https://between-gigs.github.io/between-gig-2.0/emails/
- Reference behaviour: [`lib/data/sample.ts`](../../lib/data/sample.ts) · types: [`lib/data/types.ts`](../../lib/data/types.ts)
- Shared with the Worker: [`lib/profile/validate.ts`](../../lib/profile/validate.ts), [`emails/`](../../emails) (`renderEmail()`)
- Current live app (D1 schema, funnel routes, outbox drain): https://github.com/imagine-os/between-gigs (`db/schema.ts`, `lib/welcome-email.ts`)

## Architecture

```mermaid
flowchart LR
  subgraph Browser["Browser · static site (GitHub Pages now, Cloudflare later)"]
    UI["Pages and components"]
    DS["DataSource interface<br/>lib/data/source.ts"]
    SAMPLE["sample.ts<br/>localStorage (today)"]
    API_CLIENT["api.ts<br/>fetch client (to build)"]
    CLERKJS["Clerk components<br/>@clerk/react"]
    UI --> DS
    DS -.today.-> SAMPLE
    DS ==live==> API_CLIENT
    UI --> CLERKJS
  end
  subgraph Worker["Cloudflare Worker API (to build)"]
    AUTH["Verify Clerk token<br/>role check"]
    ROUTES["/api/... routes"]
    VAL["validateAll()<br/>shared from lib/profile"]
    MAIL["renderEmail()<br/>shared from emails/"]
    AUTH --> ROUTES
    ROUTES --> VAL
    ROUTES --> MAIL
  end
  API_CLIENT -- "Bearer token" --> AUTH
  CLERKJS <--> CLERK[("Clerk<br/>email code, users")]
  AUTH -. verifyToken .-> CLERK
  ROUTES --> D1[("D1<br/>leads, people, invites,<br/>profiles, activity…")]
  ROUTES --> R2[("R2<br/>profile photos")]
  ROUTES --> OUTBOX[("welcome_email_outbox")]
  OUTBOX --> SENDER["drainWelcomeEmails()<br/>existing, lib/welcome-email.ts"] --> RESEND[("Email bridge<br/>Resend")]

  classDef built fill:#e3f7ec,stroke:#12a565,color:#0d1f16;
  classDef todo fill:#fff2dc,stroke:#c77a00,color:#0d1f16;
  classDef ext fill:#eef1f6,stroke:#7a869a,color:#0d1f16;
  class UI,DS,SAMPLE,CLERKJS built;
  class API_CLIENT,AUTH,ROUTES,VAL,MAIL,R2 todo;
  class CLERK,D1,OUTBOX,SENDER,RESEND ext;
```

## A Gigster's journey

```mermaid
sequenceDiagram
  autonumber
  actor G as Gigster
  participant W as Web app
  participant C as Clerk
  participant A as Worker API
  participant D as D1
  participant M as Outbox / Resend
  actor O as Owner

  G->>W: Get on the call sheet (email, ZIP)
  W->>A: POST /api/professionals3
  A->>D: insert leads, form_responses
  A->>M: queue welcome
  O->>W: Waitlist, Invite N people
  W->>A: POST /api/owners/invite
  A->>D: insert people (invited), invites (token hash)
  A->>M: queue invite (/join?invite=token)
  G->>W: Opens invite link
  W->>A: GET /api/invites/:token
  A->>D: record opened_at
  G->>C: Sign up with email code
  W->>A: POST /api/session/sync
  A->>D: people → registered, invites.used_at
  loop While building (autosave ~0.7 s after typing)
    W->>A: PUT /api/profile/draft
    A->>D: upsert profile_drafts (registered → draft)
  end
  G->>W: Submit
  W->>A: POST /api/profile/submit
  A->>D: validate, copy to profiles, status submitted
  A->>M: queue profile-submitted
  O->>W: Review queue, Approve
  W->>A: POST /api/owners/people/:id/approve
  A->>D: status approved, activity row
  A->>M: queue approved (profileUrl)
  G->>W: /p/:slug is public
```

## Profile status (`people.status`)

Only these transitions are allowed; reject anything else with 409. The public page reads `profiles`, and only while
the status is `approved`.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> invited: owner invites a lead
  invited --> registered: Clerk sign-up + session/sync
  registered --> draft: first saveDraft
  draft --> submitted: submit (server-side validation)
  submitted --> approved: owner approves
  submitted --> changes_requested: owner suggests edits
  changes_requested --> submitted: Gigster resubmits
  approved --> submitted: Gigster edits and resubmits
  approved --> submitted: undo (short window)
  changes_requested --> submitted: undo (short window)
```

## Data model

Existing: `leads`, `form_responses`, `sketches`, `privacy_requests`, `welcome_email_outbox`. New (proposal):
`people`, `invites`, `profile_drafts`, `profiles`, `review_notes`, `activity`. `fields` is `ProfileFields` as JSON.

```mermaid
erDiagram
  leads ||--o| people : "invited as"
  people ||--o{ invites : "has"
  people ||--o| profile_drafts : "edits"
  people ||--o| profiles : "submits"
  people ||--o{ review_notes : "receives"
  people ||--o{ activity : "appears in"
  leads ||--o{ form_responses : "answers"

  leads {
    text id PK "existing"
    text email
    text zip_code
    text category
  }
  people {
    text id PK "new"
    text lead_id FK
    text email
    text name
    text slug UK
    text status "invited..approved"
    text auth_user_id "Clerk user id"
    int invited_at
    int registered_at
    int submitted_at
    int approved_at
    int updated_at
  }
  invites {
    text token_hash PK "never the token"
    text person_id FK
    text email
    int created_at
    int expires_at "30 days"
    int opened_at
    int used_at
  }
  profile_drafts {
    text person_id PK
    json fields
    int step
    int saved_at
  }
  profiles {
    text person_id PK
    json fields "frozen at submit"
    int submitted_at
  }
  review_notes {
    text id PK
    text person_id FK
    text section "about|skills|where|story"
    text note
    text by
    int created_at
  }
  activity {
    text id PK
    text kind
    text person_id FK
    text who
    text by
    int at
  }
  form_responses {
    text id PK "existing"
    text form_id
    json payload
  }
```

## Endpoints

One route per `DataSource` method; the full table with access rules is in [data-layer.md](data-layer.md) and
[milestone-4.md](milestone-4.md). Every owner route checks Clerk `publicMetadata.role === "owner"` server-side.
Never trust an email, role or person id from a request body. Not needed live: `auth.register`, `requestCode`,
`verifyCode` (Clerk does these), `emails.outbox / get` and `demo`. New beyond the interface: `POST /api/profile/photo`
(upload to R2; today the builder stores a 480px data URL).

## Emails

Queue a row in `welcome_email_outbox` (`message_type` = template, `template_payload` = JSON props). The live app's
drain (`drainWelcomeEmails`, `lib/welcome-email.ts`, via the email bridge) sends it; extend it to render every
template with `renderEmail(template, props, { assetBase: SITE_URL, siteUrl: SITE_URL })`.

| Template | Queued by | Props |
| --- | --- | --- |
| `welcome` | `funnel.joinWaitlist` | `storyboardUrl` |
| `coming-soon` | `funnel.submitSketch` | `kind` |
| `invite` | `owners.invite` | `inviteUrl` (`${SITE_URL}/join?invite=TOKEN`), `email` |
| `profile-submitted` | `profiles.submit` | `firstName`, `profileUrl`, `editUrl` |
| `approved` | `owners.approve` | `firstName`, `profileUrl`, `editUrl` |
| `changes-requested` | `owners.requestChanges` | `firstName`, `notes` (`section\|note` per line), `editUrl` |
| `sign-in-code` | not used with Clerk | `code`, `email`, `minutes` |

## Config

| Name | Where |
| --- | --- |
| `CLERK_SECRET_KEY` | Worker secret only, never the front end |
| `BG_EMAIL_BRIDGE_TOKEN` | Worker secret the live outbox drain already uses |
| `SITE_URL` | Worker var |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Front-end build (public by design) |
| `NEXT_PUBLIC_API_URL` | Front-end build: the Worker's base URL (new) |

## Build order

```mermaid
flowchart LR
  A["1 · Schema + migrations<br/>new D1 tables"] --> B["2 · Auth<br/>verifyToken, session, session/sync"]
  B --> C["3 · Invites<br/>lookup + owners.invite batch"]
  C --> D["4 · Profiles<br/>draft, submit, photo to R2"]
  D --> E["5 · Owners<br/>queue, approve, changes, undo, people, dashboard"]
  E --> F["6 · Emails<br/>queue all 7 through the outbox"]
  F --> G["7 · Swap<br/>lib/data/api.ts live"]
```

## Done when

- The live preview runs invite → join → build → submit → approve → `/p/slug` against the Worker, with real emails.
- Owner routes return 403 for a Gigster and 401 without a token; transitions outside the status diagram return 409.
- `pnpm check` still passes on the sample store (it's the UI's regression suite).
- No secret in the built `out/`.

## Open questions

1. Keep the front end on Pages with a separate Worker, or one Cloudflare project (then `@clerk/nextjs` middleware)?
2. New `profile_drafts` / `profiles` tables, or rows in `form_responses`?
3. Should an approved page stay live while a resubmission waits for review?
4. Invite all ≈500 at once, or in waves by ZIP or interest?
5. Reminders for unopened invites after N days?
6. Photo storage: R2 bucket, size limits, resize on upload or on read?
