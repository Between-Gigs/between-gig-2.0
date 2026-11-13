# Design system v1: Green Room

The Figma file **Between Gigs Flow** has these DS pages: Cover, Foundations, Components and Templates. Its code lives in `styles/look-editorial.css` and `components/ds/`. The theme is named **Green Room** in the Theme menu (Cream & forest: cream, deep forest green, gold and the Newsreader serif). It is called `editorial` in code and is the default look. Brand pages (Coming soon, For professionals, Storyboard) keep their approved designs.

The layers follow atomic design: atoms → molecules → organisms → templates → pages. Each layer only uses the layers below it.

## See it on the site

- **Design system page:** open `/preview/design-system/` from the preview hub, or from the Theme menu. It shows every theme with a large swatch, "Use this theme", and "Try on" links that switch the theme and open Create account, Find a professional, a public profile or the invite email. Below that are the tokens, atoms, molecules, organisms and templates, live in the chosen theme.
- **Styled and Unstyled:** the Theme menu, under Mode, switches between them, and so does the design system page. Unstyled is a wireframe of any page: system type, greys, square corners, no shadows or art, and photos in grey. It sets `data-unstyled` on `<html>`; the styles are in `styles/unstyled.css`, and the choice is saved under `bg2-unstyled`.
- **Shareable links:** add `?unstyled=1` or `?unstyled=0` to any page, and `?look=<id>` for a theme. For example, `/p/maya/?look=swiss&unstyled=0`.

## Foundations: tokens

Foundations live on the Figma **DS · Foundations** page and in `styles/look-editorial.css`.

| Figma | Code |
|---|---|
| Color · Light / Dark variables (`bg/page`, `surface/*`, `text/*`, `action/*`, `line/*`, status) | `--bg`, `--surface*`, `--ink*`, `--action*`, `--line*`, `--success/warning/danger(-soft)` |
| accent/gold, accent/clay | `bg-accent-gold`, `bg-accent-gold-soft`, `bg-accent-clay` |
| Radius sm 4 · md 8 · lg 12 · xl 16 | `rounded-xs` … `rounded-2xl` |
| Shadow Card / Raised / Dialog | `shadow-sm` / `shadow-md` / `shadow-lg` |
| Display/XL, Display/L, H1, H2, H3, H4 (Newsreader) | `text-display-xl`, `display-lg`, `display-md`, `display-sm`, `heading-lg`, `heading-md` with `font-display` |
| Body L/M/S/XS, Label, Eyebrow, Price | `text-body-lg/md/sm`, `text-caption`, `text-label-md/sm`, `text-eyebrow`, `text-stat` |

**Rule:** use token classes only. `pnpm lint:values` rejects raw colours and arbitrary `[...]` values.

## Atoms

Atoms live on Figma **Components → Atoms** and in `components/ds/atoms`.

| Figma | Code |
|---|---|
| Icons (24, Lucide) | `lucide-react` |
| Logo/Wide, Logo/Mark | `Logo` |
| Button | `Button` |
| Checkbox, Radio, Toggle | `Checkbox`, `RadioGroup`, `Switch` |
| Link | `TextLink` (`kind`: inline / arrow / external) |
| Badge | `Status` (`tone`: neutral / success / warning / danger / brand / gold) |
| Avatar | `Avatar` |
| Divider | `Divider` |
| Text styles | `Heading`, `Eyebrow`, `Text`, `Price`, `Quote` |

## Molecules

Molecules live on Figma **Components → Molecules** and in `components/ds/molecules`.

| Figma | Code |
|---|---|
| Text field, Textarea, Select | `Field` with `Input`, `Textarea` or `Select` |
| Alert | `Alert` |
| Progress | `Completeness` |
| Step nav item | `StepNavItem` |
| Add tile | `AddTile` |
| Section heading | `SectionHeading` |
| Service row | `ServiceRow` |
| Rate block | `RateBlock` |

## Organisms

Organisms live on Figma **Components → Organisms** and in `components/ds/organisms`.

| Figma | Code |
|---|---|
| Header, Footer | `components/site/SiteHeader`, `SiteFooter` |
| Auth card | `AuthCard` (and the card in `AuthTemplate`) |
| Profile result card | `ProfileResultCard` |
| Service tile | `ServiceTile` |
| (photo behind auth and confirmation) | `PhotoStage` |

## Templates and pages

Templates live on Figma **DS · Templates** and in `components/ds/templates`.

| Template | Code | Page that fills it |
|---|---|---|
| Create account / Log in | `AuthStageTemplate` (launch, Flow p2); `AuthTemplate` is the previous layout, kept as the Hub drafts `/preview/drafts/join-v1/` and `login-v1/` | `/join/`, `/login/` (via `components/auth/AuthShell`; `components/auth/authDesign` picks v1 or v2) |
| Public profile | `ProfileTemplate` | `/p/<slug>/`, `/profile/` |
| Find a professional | `SearchTemplate` | `/p/` |
| Profile submitted | `ConfirmationTemplate` | available for a full-page confirmation; `/profile/` keeps its "Submitted for review" card and the full profile preview |
| Profile builder | `components/builder/ProfileBuilder` with StepNavItem, Completeness, AddTile (photo) | `/profile/edit/` |
| Invite email | `emails/invite.ts` | Stage 2 invite |

## Changing something

1. Change the variable or component in Figma.
2. Make the same change in the token file or component here. The names match one-for-one.
3. Screenshot the affected pages in light and dark, at 1440 and 390 wide.
