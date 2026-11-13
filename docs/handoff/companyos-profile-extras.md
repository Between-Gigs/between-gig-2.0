# Company OS: the Green Room emails and the profile editor's fields (13 Nov 2026)

Two things 2.0 needs from Company OS for the 13 Nov launch to behave the same live as in the sample. Both are in one
Company OS commit, ready to apply: `companyos-green-room.patch` (on Company OS `main` at 9f0ec47; Company OS is
private, so the patch is shared with its owner rather than kept in this public repository). Company OS's rules let
only its owner push and merge. Anyone can rebuild the email part from here with the script below.

## 1. The live emails

Company OS sends copies of 2.0's templates (`deploy/recipes/between-gigs/emails/`). Those copies still had the old
invite and confirmation, the old invite subject, an invented footer address and "Patti & Peter" on changes requested.
The patch re-renders them from 2.0's `emails/*.ts`:

```bash
pnpm emails:companyos ../company-os          # write the copies into a Company OS checkout
pnpm emails:companyos ../company-os --check  # exit 1 if they're out of date
```

invite, profile-submitted, approved and changes-requested are rendered in full; welcome, coming-soon and sign-in-code
keep their hand-adapted copies with the new footer line. The patch also updates the recipe's invite subject, the
template test's image list (`craft-top.jpg`, `craft-border.jpg`, served by 2.0 under `public/email/`) and the journey
test's invite subject.

## 2. The profile editor's answers

Four tenant fields on `profile`, so the title, the Gigster's one line per service and the personality question and
answer reach the team and the public page:

| 2.0 field | Company OS field | Type |
| --- | --- | --- |
| `title` | `professional_title` | text |
| `serviceLines` | `service_lines` | json (service label → line) |
| `personalityQuestion` | `personality_question` | text (`bucket-list`, `quiet-skill`, `never-guess`, `unexpected-ask`) |
| `personality` | `personality_answer` | text |

Company OS refuses a field its recipe doesn't have, so 2.0 sends them only with the server variable
`COMPANY_OS_PROFILE_EXTRAS=1` (`lib/server/gigs.ts`, `lib/data/companyos/fields.ts`). Without it nothing changes: the
answers stay in the Gigster's browser as before. 2.0 reads them whenever Company OS returns them.

## Order

1. Apply the patch in Company OS; run `pnpm test:customers` (the journey test saves and reads back the four fields).
2. Merge and deploy Company OS, and re-apply Between Gigs' recipe (`scripts/apply-recipe.mjs`) on test, then on
   production. The journey test also confirms the public reader sees the new fields; if it doesn't, the tenant
   fields need public read in the recipe's policies.
3. Set `COMPANY_OS_PROFILE_EXTRAS=1` on 2.0's test server, redeploy, and check one save and the public page on test.
4. Same on production.

Not covered here: the template copies were checked with Company OS's template rules (no fixed host, images and links
from `{{links.base}}`, text twin links) by a script, not by its own test run, and the journey test hasn't run (it needs
the local Postgres).
