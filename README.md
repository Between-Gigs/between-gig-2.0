# Between Gigs 2.0

The client-facing Between Gigs product, redesigned on the [Between Gigs Design System](https://github.com/Between-Gigs/between-gigs-design-system).

- **Plan:** [MILESTONES.md](MILESTONES.md)
- **Why:** [docs/voice-note-2026-10-21.md](docs/voice-note-2026-10-21.md) — the client's priorities
- **Starting point:** [docs/current-state.md](docs/current-state.md) — what the existing app (`imagine-os/between-gigs`) has today
- **Handoffs:** [**Backend (start here, Anu)**](docs/handoff/backend.md) · [Milestone 2](docs/handoff/milestone-2.md) · [Milestone 3](docs/handoff/milestone-3.md) · [Milestone 4](docs/handoff/milestone-4.md) · [Milestone 5](docs/handoff/milestone-5.md) · [Clerk sign-in](docs/handoff/clerk.md) · [Studio (CMS prototype)](docs/handoff/studio.md) · [data layer](docs/handoff/data-layer.md) · [design system requests](docs/design-system-requests.md)

Status: Milestones 1 to 5 done: the design system; emails, login, profile builder, profiles and owner search; the public funnel (/professionals, Storyboard, emails, policies; the Journal is built but hidden); the owner dashboard, review and waitlist invites; and the call-sheet home with home page proposals. Start at `/hub` for the working Hub (`/preview` remains a compatibility alias).

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm check      # typecheck, lint, raw-value lint, build, QA (screens, axe, end-to-end flow)
```

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, pnpm. The static Pages export uses a fictional browser-only sample; the Railway server uses Clerk and Company OS. The public Hub contains a separate sample sandbox. See [Hub, experiences and staff](docs/handoff/hub-staff.md) for the current routing and access contract.

## Preview on GitHub Pages

`.github/workflows/pages.yml` builds with `NEXT_PUBLIC_BASE_PATH=/between-gig-2.0` and deploys `out/` on every push to `main`. The existing Railway **Deploy web (test)** workflow also follows `main`, after its checks, so the two hosts take the same source changes. Production remains a separate manual release. One-time Pages setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Design system

Vendored in `packages/design-system/` (version and commit in `VERSION`), imported as `@ds/*`. Don't edit it; re-sync from a clone with `scripts/sync-design-system.sh /path/to/between-gigs-design-system`. Gaps go in [docs/design-system-requests.md](docs/design-system-requests.md).
