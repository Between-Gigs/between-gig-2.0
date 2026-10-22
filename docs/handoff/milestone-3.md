# Milestone 3 handoff (for Anu)

**Status: complete.** Every page and email in the live funnel is rebuilt on the design system, with the approved copy unchanged. `pnpm check` passes. That covers screenshots of every route in light and dark at 1440 and 390, axe on every route, and the end-to-end flow, which now continues through the funnel.

The live funnel, rebuilt:
`/professionals → "Get on the call sheet" (email + ZIP, then optional details) → Welcome email → /storyboard → talent or buyer form → Coming-soon email`

> **Update (21 Oct 2026): the Journal is hidden for now.** Its routes moved to `app/_journal` (a private folder, so it isn't built) and every link to it is removed. Rename the folder back to `app/journal` and restore the links to bring it back.

## Routes

| Route | What | Source of the copy (imagine-os/between-gigs) |
| --- | --- | --- |
| `/professionals` | Hero, benefits, 10 crafts (with "Explore service ideas" and "I offer this service"), 4 sample profiles, "Your next chapter", FAQ, founders, final call to action | `app/professionals/current.tsx`, `components/current-founders.tsx` (approved by Patti Lenkov, 27 Sep 2026) |
| ↳ dialog | "Get on the call sheet" in three steps: (1) email + ZIP, with the category of the card that opened it; (2) optional service category and "What would you offer?"; (3) thanks | same file |
| `/storyboard` | Rebuilt to match the approved page (22 Oct 2026): one centered column with Peter's handwritten "Your next chapter starts here." (the approved graphic), then the sketchbook with the original **page turn**. Drag a page or tap either half, and it curls over the spine as a curved leaf with shading. The arrows and arrow keys work too, the book tilts gently toward the pointer and zooms (90–150%), and covers fade instead of curling. Then the caption, the hint, the two buttons, "The credits keep rolling", and the catalog of 18 commissions (opening one turns the book to it). Covers are the approved green ones (`storyboard-covers-v2-59`). The turn is a TypeScript port of the original engine (`components/storyboard/engine.ts`), with the same geometry and spring settings. | `public/design-locks/approved-2026-09-27/storyboard.html` |
| ↳ forms | "Offer your skills" (talent) and "Find talent for a project" (buyer). Same fields, labels, buttons and success message | same file (`PLANS`) |
| `/privacy` (+ request form), `/terms`, `/provider-standards`, `/licensing-insurance` | Policy pages with a contents rail; effective date unchanged | `app/privacy`, `app/terms`, … |
| `/journal`, `/journal/[slug]`, `/journal/authors/[slug]` | Featured story plus a grid with a filter by kind. The reader has a contents rail with scrollspy, a reading-progress bar, sources and more stories. The interactive blocks are rebuilt: the budget planner, the production kit and the FilmLA chart (with a numbers table) | `lib/journal/seeds.ts`, `new-articles.ts`, `components/journal/reader.tsx`, `industry-chart.tsx` |
| `/emails/welcome`, `/emails/coming-soon` | The two funnel emails in the new email shell | `lib/welcome-template.ts`, `lib/coming-soon-template.ts` |

Public pages get the site nav (For professionals · Storyboard · Journal, with a menu on phones) and the full footer from the live Storyboard (Support · Explore · Legal).

## Data seams

`DataSource.funnel` (`lib/data/source.ts`) maps one-to-one onto the live API routes:

| Method | Live route | Table |
| --- | --- | --- |
| `joinWaitlist({ email, zip, category, placement })` | `POST /api/professionals3` | D1 `leads` + `form_responses`; queue `welcome` (`welcome_email_outbox`, `message_type = 'welcome'`) |
| `addDetails(signupId, { category, details })` | `POST /api/professionals3/details` (the live route uses the signup token it returned) | `leads.category`, `form_responses` |
| `submitSketch(kind, answers)` | `POST /api/sketches` | D1 `sketches`; queue `coming-soon` |
| `privacyRequest(email, message)` | `POST /api/privacy-requests` | D1 `privacy_requests` |

- **Analytics:** `placement` carries the old click placement (hero, nav, service, `profile-maya`, footer). The live `/api/professionals3/analytics` beacon (it respects GPC and DNT) isn't called from the preview; add it where the dialog opens.
- **Bot trap:** the live forms include a hidden `website` honeypot field. Add it back when wiring.
- **The Journal** reads `content/journal/articles.json`. It is a one-time export of the six published seed articles, with image paths moved to `public/art/`. Live articles come from D1 `workspace_records` (`kind = 'journal'`, `payload.published`). Swap `lib/journal.ts` for a fetch and keep the `Article` type.

## Emails

| Template | Subject | Notes |
| --- | --- | --- |
| Welcome | Your next chapter starts here. | Same copy. The headline is Peter's handwritten "Your next chapter starts here." graphic (`public/email/your-next-chapter.png`), on a white panel that stays white in dark-mode mail clients; its alt text carries the words when images are off. The Storyboard opening image is kept, linked, with alt text. I added one line, "Thank you for getting on the call sheet. We'll send your invitation when professional onboarding opens." **This line is a proposal; remove it if Patti and Peter want the email word-for-word.** |
| Coming soon | Thank you. The next chapter is coming. | Same copy and signature (Patti & Peter), with the "assemble the crew" artwork. |

Images used by the emails are in `public/email/` (deploy them to `https://between-gigs.com/email/`).

## Assets

The approved artwork was copied from the old repo and recompressed for the web. The art itself is unchanged.

- `public/art/storyboard/`: 20 pages, 1200px
- `public/art/journal/`: the 4 Journal illustrations, PNG → JPEG
- `public/art/founders/`: Peter and Patti
- `public/art/samples/`: the 4 sample profiles from `/professionals`

## What changed vs. the live pages (polish, not rewrite)

- Design-system type, color, components and motion throughout, in light and dark.
- Service cards use line icons in place of the unicode symbols (⚒ ✦ ✂ …).
- The Storyboard keeps the original page curl and layout. Only its colors come from design tokens: the leaf's shading is near-black instead of warm brown, and Peter's graphic flips to light ink in dark mode.
- Policy pages gained a contents rail and cross-links between policies.

## Open questions

2. **Welcome email.** Keep the added invitation line, or match the live email exactly?
3. **Privacy policy hosting line.** It names "OpenAI Sites and Cloudflare" as hosting. Update it when hosting moves.
4. **Journal source.** Should 2.0 keep reading from the OS Journal studio (D1), or move articles to files in this repo?
