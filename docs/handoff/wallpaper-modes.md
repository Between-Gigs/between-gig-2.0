# Wallpaper mode refresh

Scope: Craft Invitation and Crew Call film set, portrait and desktop, light and dark. Los Angeles Call Sheet and Email Template Frame are retired from the download gallery only; their source files remain available for history/rollback.

The auth shell and shared invitation/confirmation email preview rendering now use Craft Invitation rather than Email Template Frame. Exact copies live under `public/email` because Railway's main server build intentionally removes `public/art/wallpapers`. The Hub build serves gallery downloads separately. Emails retain their explicit light presentation and readable cream content card; adding dark downloads does not force unreliable email-client theme switching.

## Admin uploads: not implemented

The gallery is public, including GitHub Pages and the separate Railway Hub sample. Its sample session is not proof of an administrator's live role. The only existing persistent image upload contract is a person's profile-photo endpoint, which is not suitable for shared wallpapers. Do not reuse it or advertise browser-local previews as shared uploads.

A follow-up needs an authenticated Company OS wallpaper collection with server-side admin authorization, image signature/type/size/dimension validation, safe storage names, and four explicit variant slots (light/dark × portrait/desktop). Publication must stay separate from upload. GitHub Pages should link to authenticated management on the live host, never embed credentials or accept trusted writes itself. Test signed-out and non-admin rejection, invalid files, failed uploads/retries and replacement without losing the previous published version before releasing upload controls.

## Contrast

Wallpaper artwork is decorative, not a guaranteed text surface across every pixel. Keep text within the quiet center. Use design-system text colors for the selected mode and a solid mode-matched content surface behind copy near detailed artwork. Do not claim arbitrary text on every image region meets WCAG.

## Live email delivery boundary

Company OS sends separately rendered templates under deploy/recipes/between-gigs/emails. This frontend patch updates email previews, not those backend copies. Re-render and review the corresponding Company OS templates before claiming newly sent mail uses Craft Invitation. Already sent emails are not rewritten. No backend deployment is included here.

## Split from dark-mode work

This draft PR contains only the retired-gallery cleanup and exact-original Craft Invitation substitutions. No generated dark candidates or experiments are included. Dark wallpaper variants are still pending exact-border fidelity and browser visual QA. No merge or deployment is requested by this draft.
