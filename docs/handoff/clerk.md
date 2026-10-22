# Sign-in with Clerk

Sign-in and joining run on Clerk, themed to Between Gigs. Clerk app: `app_3K6djWZKXZ3KfSdhAkKl11f6TcV`
(instance `glad-monkey-6908`, development keys).

## How it switches on

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set at build time → Clerk. Unset → the sample email-code login
  (`lib/data/sample.ts`), which local QA (`pnpm check`) and the demo switcher use.
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
| `components/auth/ClerkLayer.tsx` | `ClerkProvider` (wired to Next's router and the Pages base path) and the bridge: when Clerk has a signed-in user, it calls `data.auth.syncExternal()` to open the Between Gigs session; when Clerk signs out, it closes it. An email that isn't on the call sheet is signed straight back out and sent to `/login/?notInvited=…`. |
| `components/auth/LoginView.tsx` | `/login`: the brand panel with Clerk's `<SignIn>` (hash routing). Once the session exists it routes by role (owners → `/owners/`, Gigsters → `/profile/`) or to a safe `?next=`. |
| `components/auth/JoinView.tsx` | `/join?invite=…`: our invite check, name and terms, then Clerk's `<SignUp>` with the invite email prefilled and `{ inviteToken, name, acceptedTerms }` in `unsafeMetadata`. The bridge registers the person; then the questionnaire. |
| `components/auth/ClerkSlot.tsx` | Skeleton while Clerk's script loads; a plain error after 10 s if it can't load. |
| `lib/auth/context.tsx` | `useAuthActions().signOut()`: ends Clerk's session too. |

## Clerk dashboard settings (to do in the dashboard)

1. **User & authentication → Email**: turn on **Email verification code**; turn off password if we stay passwordless.
2. **Restrictions**: joining is invite-only. Either turn on **Allowlist** and add invited emails (Anu can automate it
   from the invite step via the Backend API), or keep sign-ups open and let the app reject non-invited emails (it does
   today, but the Clerk account still gets created).
3. **Owners**: on each owner's user, set **Public metadata** to `{ "role": "owner" }`. Only the dashboard or a server
   can set it, so it's safe to trust.
4. **Paths**: sign-in URL `/between-gig-2.0/login/`, sign-up URL `/between-gig-2.0/join/` (and the production
   domain's equivalents later). Add the Pages domain to allowed origins if Clerk asks.
5. Production: create the production instance, swap in its `pk_live_…` key and set up its DNS records.

## Until the Worker API exists

The data is still the browser's sample store. A real Clerk sign-in maps onto it by email, so to try the whole
invite flow with a real inbox on the Pages preview: join the waitlist at `/professionals/` with your email, sign in
as the sample owner from the demo switcher, invite yourself from the waitlist, then open the invite link from the sample outbox (`/emails/`; no real invite email is sent yet) and sign up. Clerk sends the real code to your inbox.

Not verified from the build container: Clerk's servers are blocked there, so the Clerk forms were checked only up
to loading (and the can't-load fallback). Test the sign-in on the Pages preview.
