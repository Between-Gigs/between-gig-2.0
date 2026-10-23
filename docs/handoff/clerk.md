# Sign-in with Clerk

Sign-in and joining run on Clerk, themed to Between Gigs. Clerk app: `app_3K6djWZKXZ3KfSdhAkKl11f6TcV`
(instance `glad-monkey-6908`, development keys).

## How it switches on

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set at build time → Clerk. Unset → the sample email-code login
  (`lib/data/sample.ts`), which local QA (`pnpm check`) and the Preview guide use.
- GitHub Pages builds with the key (`.github/workflows/pages.yml`; a repo variable of the same name overrides it).
  The publishable key is public by design.
- `CLERK_SECRET_KEY` is **not** used by this app and must never be added to it: it's a static export with no server.
  It belongs in the Worker API's secrets (`wrangler secret put CLERK_SECRET_KEY`).
- The SDK is `@clerk/react`, not `@clerk/nextjs`: the Next.js SDK needs Server Actions, which a static export
  can't host. Moving to the Worker / a server build later, `@clerk/nextjs` with `clerkMiddleware()` is a drop-in.

## The pieces

| File | What it does |
| --- | --- |
| `lib/auth/clerk.ts` | The switch, and the appearance: every Clerk color is a design-system CSS variable (`var(--action-strong)`, `var(--surface)`, `var(--ink)`, …), so Clerk follows light and dark with the page. Figtree, 12px radius, Clerk's own card chrome removed so it sits in our brand frame. Styles live in the `clerk` CSS layer (`app/globals.css`). |
| `components/auth/ClerkLayer.tsx` | `ClerkProvider` (wired to Next's router and the Pages base path) and the bridge: when Clerk has a signed-in user, it calls `data.auth.syncExternal()` to open the Between Gigs session; when Clerk signs out, it closes it. A verified email creates a new Gigster record when absent; call-sheet membership is not required. Only trusted `publicMetadata.role` can identify an owner. |
| `components/auth/LoginView.tsx` | `/login`: the brand panel with Clerk's `<SignIn>` (hash routing). Once the session exists it routes by role (owners → `/owners/`, Gigsters → `/profile/`) or to a safe `?next=`. |
| `components/auth/JoinView.tsx` | `/join` (optional `?invite=…`): editable email, name and terms, then Clerk's `<SignUp>` collects the required password and verifies the email, with the chosen email prefilled and `{ inviteToken, name, acceptedTerms }` in `unsafeMetadata`. The bridge registers the person; then the questionnaire. |
| `components/auth/ClerkSlot.tsx` | Skeleton while Clerk's script loads; a plain error after 10 s if it can't load. |
| `lib/auth/context.tsx` | `useAuthActions().signOut()`: ends Clerk's session too. |

## Clerk dashboard settings (preserve existing security controls)

Signup is open. The owner set the password minimum to **8 characters** (a minimum, not a maximum).
Do not add a Clerk allowlist, waitlist restriction, or a `user.created` rejection based on invitation status.
Do not disable passwords, email verification, bot protection, compromised-password checks, rate limits, or MFA.
Clerk's hosted widget enforces the instance's password policy; the custom details form does not handle passwords.

- Owners: trusted **Public metadata** `{ "role": "owner" }` only; signup metadata never grants roles.
- Paths: `/between-gig-2.0/login/` and `/between-gig-2.0/join/`. Keep allowed-origin protections.
- Production keys and DNS are a separate rollout. This change only targets this repository's Pages demo.

## Until the Worker API exists

The data is still the browser's sample store. Clerk verifies identity and the bridge maps it by email, creating
an ordinary Gigster record for a new email. Existing people retain their identity, status, drafts and profiles.
Valid optional invites prefill an editable email and are consumed only for their matching address. Used invites
lead to sign-in; expired and unknown invites offer open signup. Stale signup metadata cannot block a verified user.

The `/demo` email preview and its explicit browser-only skip remain available; neither sends a real invite email.
The sample role switcher is demonstration tooling, not production authorization. A future Worker must verify Clerk
tokens and roles on every protected operation; localStorage is not a server authorization boundary.

The production `between-gigs.com` waitlist is separate and unchanged.

## Login-first consent and demo startup

Native SignIn does not create accounts implicitly; its explicit signup link goes through `/join`.
A signed-in identity without a registered app profile must complete the existing name/terms form at `/join`.
This completes setup for the same Clerk identity, with a fixed signed-in email and a way to switch accounts.
Registered app profiles keep their existing login behavior. The data contract returns `terms` before creating
or advancing a person without consent; the Worker implementation must record that consent durably.

Demo startup uses the loaded Clerk hook, confirms sign-out with the supported non-navigating callback, and
requires `clerk.user === null` before enabling signup. SDK-load or sign-out failures show a retry path. The
browser-only sample fallback is offered after SDK initialization; it never creates a real Clerk identity.
