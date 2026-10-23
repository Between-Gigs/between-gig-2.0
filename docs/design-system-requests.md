# Design system requests

Things Between Gigs 2.0 needed that the design system (v1.6.2, fc658c8) doesn't have yet. Each is built locally in this app for now; once the system ships it, swap the local version out. Nothing here was pushed to the design system repo.

| # | Need | Built locally as | Proposal for the system |
| --- | --- | --- | --- |
| 1 | Status words for the Gigster funnel: **Invited**, **Registered**, **Submitted** (StatusBadge has Draft, Changes requested, Approved, but not these). | `components/people/PersonStatusBadge.tsx`: Badge + icon. Tones: Invited / Registered neutral, Draft warning, Submitted info, Changes requested warning, Approved success. | Add `invited`, `registered`, `submitted` to `StatusBadge` and BRAND.md's status table. Decide whether Submitted is info (as here, so it doesn't share amber with Draft) or warning ("Needs review"). |
| 2 | A link that looks like a Button (navigation, mailto). | `components/ui/ButtonLink.tsx`, reusing `buttonVariants` / `buttonSizes`. | `Button` with `href` (renders `<a>`) or `asChild`. |
| 3 | A portrait larger than Avatar's 48px, with an initials fallback, for search cards and profile heroes. | `components/people/PersonPhoto.tsx` (initials on `surface-selected`, `ink-brand`, Sora). | `Avatar` sizes `xl` / `fill`, or a `Portrait` component. |
| 4 | Toggle-chip multi-select (the onboarding template's `ChipPicker`). | `components/profile/ChipPicker.tsx`, copied from the template's `parts.tsx`, plus an invalid state. | Promote `ChipPicker` from the template to a component (or extend `Tag` with `selected` for groups) with `invalid`. |
| 5 | Photo upload control. | `components/profile/PhotoPicker.tsx`. | A `FileInput` / `ImagePicker` molecule with drop zone (dashed `line-dashed`). |
| 6 | Breadcrumbs that use the app's router. | Pass full hrefs with base path; the crumbs do a full page load. | `Breadcrumbs` accepts a `linkAs` / render prop for Next `Link`. |
| 7 | Literal color values for email. | `scripts/build-email-tokens.mjs` writes `emails/tokens.ts` from `tokens.json`. | Ship an `email` export from `build-tokens.py` (resolved light and dark hex per semantic token). |
| 8 | Logo as PNG for email clients. | `scripts/build-email-assets.mjs` renders `public/email/between-gigs-wide-on-{light,dark}.png` (2x). | Add PNG exports to `logos/`. |
| 9 | Route-level view transitions (morph across a Next.js route change). | `lib/motion.ts` (`useMorphNavigate`, `useSettleWhen`). | A router-agnostic `startRouteTransition(navigate, ready)` in `src/motion`. |
| 10 | React 19 peer range. | Works as is with React 19.2. | Widen `peerDependencies` to `^18.2 \|\| ^19`. |

## Europium dots on every brand panel (app utility for now)

The client wants the dotted phosphor grain from `backdrop-europium` on all forest-green brand surfaces, not only
the Coming soon page. The app adds `phosphor-dots` (`app/globals.css`): the same dot layers, sizes and strengths,
painted over the panel's own `surface-brand` instead of repainting it `forest-950`. Request: a system utility (or a
`backdrop-europium` variant that keeps the ground) so this lives in the design system, and an update to
MATERIALS.md's "one per page" note.

## Dark status surfaces (app override for now)

In dark mode `--warning-soft` (amber-900), `--info-soft` (blue-900) and `--danger-soft` (red-900) read as muddy
brown, navy and maroon on the forest surfaces; the client review flagged the warning banners in particular. The app
overrides them in `app/globals.css` as a hint of the status tone over `--surface-raised` (7% / 7% / 9% in oklab), letting the icon and title carry the tone. Request:
adopt these (or tuned equivalents) in the system's dark tokens.

## From the UI/UX round (owners and profiles)

- **Button disabled state** is `bg-surface-sunken text-ink-disabled` for every variant, which is near-black on near-black in dark mode. Needs a readable disabled treatment; the profile pages now explain disabled actions with a dashed placeholder instead.
- **Monospace numbers**: `Progress` values and `PageHeader` `meta` render in mono; user-facing numbers should be tabular-nums on the sans. The app built its own meter for profile strength.
- **Drawer / Modal bottom-sheet placement** for phone filters (the app uses the left/right drawer for now).
- **Table multi-select**: selected row keys and an indeterminate header checkbox. The waitlist uses a hand-built table to highlight several selected rows.
- **Cumulative funnel**: a Funnel / StageStats variant for cumulative stages (owners dashboard `components/owners/Funnel.tsx`).
- **Tag wrapping**: a Tag variant that wraps long chip text (review reason chips).
- **"Value updated" flash** utility for live previews (the builder uses a colour transition on `data-flash`).
- **Carousel** (scroll-snap list with scroll affordance and previous/next buttons) and **Marquee** (credits-roll strip, pauses on hover/focus, static with reduced motion): app versions in `components/funnel/Carousel.tsx` and `Marquee.tsx`.
- **Bottom-anchored `glow-horizon`**: a variant that keeps the arc a fixed distance above the panel's bottom edge on small screens, so text never sits on it (app version: `Horizon` in `components/funnel/parts.tsx`).
- **Image thumbnails**: a convention for smaller derived images (the Storyboard catalog uses `public/art/storyboard/thumbs/`, 800px).

## Type scale for reading (docs/ui-rules.md)

Body text should be 16px with ~1.5 line height (both reference books agree), secondary text no smaller than 14px.
The app overrides `--text-body-lg` (18/28), `--text-body-md` (16/24), `--text-body-sm` (14/21) and the caption line
height (12/18) in `app/globals.css`. Request: adopt this scale in the system.

## Lettering (hand-drawn phrases)

The client likes Peter's handwritten "Your next chapter starts here." (Storyboard hero, welcome email). It is
**lettering**, not a font: one phrase drawn once and kept as an image, so it can't set new words. The app keeps a
registry in `lib/lettering.ts` (text for alt, web PNG, email PNG, source) and renders it with
`components/ui/Lettering.tsx`, which inverts the black ink in dark mode (`.lettering` in `app/globals.css`).
Request: a "Lettering" section in the system beside Typography, with the asset, its alt text, light/dark and email
treatments, and when to use it (one short phrase, a hero headline at most once per page). If more phrases are
wanted, the options are more drawn phrases from Peter, or a script typeface chosen to sit close to his hand (a
real font, which can set any words but won't be his handwriting).

## From the profile round (23 Oct)

- **ThemeToggle** (`size="sm"`, `showLabel={false}`) gets both `pr-3` and `pr-0.5`, so the switch sits off-centre with a gap on its right. The app passes `className="pr-0.5!"` until the component drops `pr-3` when there's no label.
- **backdrop-europium** is dark-only and paints its dots as one flat sheet. The home page now draws its dots on a canvas as a gravity well around the pointer (`lib/gravity-field.ts`) over the app's `depth-field` ground, in Day and Night. A system-level version would replace it.
