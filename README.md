# Between Gigs 2.0

The client-facing Between Gigs product, redesigned on the [Between Gigs Design System](https://github.com/Between-Gigs/between-gigs-design-system).

- **Plan:** [MILESTONES.md](MILESTONES.md)
- **Why:** [docs/voice-note-2026-10-21.md](docs/voice-note-2026-10-21.md) — the client's priorities
- **Starting point:** [docs/current-state.md](docs/current-state.md) — what the existing app (`imagine-os/between-gigs`) has today
- **Handoffs:** [Milestone 2](docs/handoff/milestone-2.md) · [Milestone 3](docs/handoff/milestone-3.md) · [Milestone 4](docs/handoff/milestone-4.md) · [data layer](docs/handoff/data-layer.md) · [design system requests](docs/design-system-requests.md)

Status: Milestones 1 (design system), 2 (emails, login, profile builder, profiles, owner search) 3 (the public funnel: /professionals, Storyboard, emails, policies, Journal) and 4 (owner dashboard, review, waitlist invites) done.

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm check      # typecheck, lint, raw-value lint, build, QA (screens, axe, end-to-end flow)
```

Next.js 16 (App Router, static export), React 19, TypeScript, Tailwind CSS v4, pnpm. Data runs on a fictional, browser-only sample (`lib/data/`); use the **Demo** button to switch roles or reset it.

## Preview on GitHub Pages

`.github/workflows/pages.yml` builds with `NEXT_PUBLIC_BASE_PATH=/between-gig-2.0` and deploys `out/` on every push to `main`. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Design system

Vendored in `packages/design-system/` (version and commit in `VERSION`), imported as `@ds/*`. Don't edit it; re-sync from a clone with `scripts/sync-design-system.sh /path/to/between-gigs-design-system`. Gaps go in [docs/design-system-requests.md](docs/design-system-requests.md).
