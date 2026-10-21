# Milestone 4 handoff (for Anu)

**Status: complete.** This is the owners' experience: simple and calm, for Patti and Peter, not the OS shell. `pnpm check` passes. That covers screenshots and axe on every route, light and dark, 1440 and 390, plus the end-to-end flow. The flow now continues: the owner dashboard → the queue → approve a profile → its public page is live → suggest edits → the Gigster sees the note → bulk-invite 3 people from the waitlist → the approved and changes-requested emails are in the outbox.

## Routes (owner role)

| Route | What |
| --- | --- |
| `/owners` | Dashboard: a greeting with how many profiles wait for review, Gigsters by status (Submitted highlighted when there are any), "Ready for review" (oldest first), waitlist progress (Not invited / Invited / Opened / Registered) with "Invite from the waitlist", and recent activity |
| `/owners/review` | The review queue: every submitted profile, oldest first, with any missing answers called out |
| `/owners/people/[id]` | The person page. A submitted profile gets the **Review** rail: one automatic check (are all required answers in?), a four-item checklist (a guide, not a gate), **Approve profile** (with confirmation) and **Suggest edits** (one short note per section, at least one). After deciding, a banner links to the next profile in the queue. |
| `/owners/people` | People search (from Milestone 2): search, filter by status, service, area and availability, sort, list or grid |
| `/owners/waitlist` | The ~500 call-sheet sign-ups: search, filter by invite status (the count tiles double as filters) and by interest, sort, 25 per page. Select rows, or "select all not invited", then **Invite N people** (with confirmation) sends each person their own invite. |

Owners sign in at `/login` with the email code (sample: `owners@between-gigs.example`) and land on `/owners`. The nav shows Dashboard · Review · People · Waitlist · Emails, and moves into the account menu below 1024px.

## Data seams

`DataSource.owners` (`lib/data/source.ts`); sample in `lib/data/sample.ts`. **Every call must check the owner role server-side.**

| Method | Backend (proposal) |
| --- | --- |
| `dashboard()` | Counts by `people.status`, waitlist counts (below), `reviewQueue()`, the latest 12 `activity` rows |
| `reviewQueue()` | `people WHERE status='submitted' ORDER BY submitted_at` |
| `approve(personId)` | Only from `submitted`: `status='approved'`, `approved_at`, clear `review_notes`, insert `activity`, queue `approved` (`profileUrl = ${SITE_URL}/p/${slug}`) |
| `requestChanges(personId, notes)` | Only from `submitted`, at least one note: insert `review_notes` (section, note, by), `status='changes_requested'`, insert `activity`, queue `changes-requested`. Notes travel to the email as `section\|note` lines (email props are strings). |
| `waitlist(query)` | `leads` left join `people` on email (+ `invites.opened_at`) → `not_invited` / `invited` / `opened` / `registered` |
| `invite(signupIds)` | For each lead not yet invited: insert `people` (`status='invited'`) and `invites` (store a token hash, 30-day expiry), queue `invite`, insert `activity`. Run it as a batch job when sending to hundreds, and rate-limit the Resend sends. |
| `activity(limit)` | A new `activity` table: `id, kind, person_id, who, by, at`. Write one row in each action above, and in `invites.lookup` (first open), `register`, `submit` and `joinWaitlist`. |

`invites.lookup` now records `openedAt` the first time a valid link is opened. That's what the "Opened" status means. Opening the email itself can't be tracked without pixels, which we don't add.

## Emails

| Template | Subject | When |
| --- | --- | --- |
| Profile approved | You're on the call sheet, `{first}`. Your profile is live. | `approve` |
| Changes requested | A few small changes to your profile, `{first}` | `requestChanges`. Each note is shown as a card under its section name, with an "Update my profile" link to the builder's review step. |

**The copy of both is a proposal for Patti and Peter.** Previews are at `/emails/approved` and `/emails/changes-requested`.

## Sample data

- **Waitlist:** 500 fictional sign-ups at example.com, deterministic, so a reset gives the same list. The first 24 are the seed people.
- **Activity:** seeded from the seed people's dates.
- **Storage key:** the sample now uses `bg2-sample-v2`, so anyone with Milestone 2 or 3 demo data in their browser starts fresh.
- **Photos:** the monogram seed people have no photo. Their profiles therefore show "Missing: Profile photo" in the queue and the review rail. That's the automatic check working, not a bug: the real builder doesn't let anyone submit without a photo.

## Open questions

1. **Checklist.** Are these four items the right ones? Should ticking them be required before Approve? Today it is only a guide.
2. **Un-approving.** There is no "unpublish" or "suspend" yet. Do the owners need one?
3. **Approved Gigsters who edit.** Resubmitting takes their public page down until it's reviewed again (Milestone 2 open question 3). Should the old version stay live while the new one waits?
4. **Invite batches.** Invite everyone at once, or in waves (by ZIP or interest)? The filters support waves today.
5. **Reminders.** Should invites that haven't been opened get a reminder after N days? And who sends it?
6. **Owner accounts.** Which emails are owners: Patti and Peter only, or staff too? Do owners need any roles beyond "owner"?
