# Playbook inbox (this repository)

What the delivery playbook got wrong, missed or made slow, noticed while working here. One line per observation, the same day; link the line from the pull request's `Playbook inbox:` line. Lines move into Company OS `docs/playbook/INBOX.md` at each retrospective.

| Date | Where | What happened | Suggested change |
|---|---|---|---|
| 2026-11-18 | CI by area v2 (Between Gigs) | With source classified by its importers, an owners-only change still runs every check: the root layout wraps every page in `AdminRoutes` → `OwnerFrame`, so `OwnerShell` and all it imports reach `app/layout.tsx`. Also, the QA scripts visit other areas' pages (owner checks open `/preview`, `/profile/canvas`), so v1's route ownership under-selected (#107 ran 12 scripts, 24 were needed); v2's entries now cover every visited page (tested). Replay of the last 15 merges: 0 narrow as merged (each also changed a workflow or the lockfile); the code part of the last 15 code-touching merges narrows in 4 (area script runs 404 → 376). The first release after this runs every area (no `checks: areas-v2` tag yet). | Load the owner frame from `app/owners/layout.tsx` (or lazily) so owners code stops reaching the root layout (Company OS IN-343). Keep workflow and lockfile changes in their own PRs. |
