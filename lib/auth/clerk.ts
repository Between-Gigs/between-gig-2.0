/*
 * Clerk is the sign-in provider. It switches on when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set at build time;
 * without a key (local QA, demos offline) the app keeps the sample email-code login in lib/data/sample.ts.
 * The publishable key is public by design. The secret key never belongs in this app: it's a static export
 * with no server, so server-side checks move to the Worker API (see docs/handoff/clerk.md).
 */
export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
export const clerkEnabled = clerkPublishableKey.startsWith("pk_");

/**
 * Between Gigs theme for Clerk's components: every value is a design-system CSS variable, so Clerk follows
 * light and dark with the rest of the page. Shapes and type match the system's Button, Input and Card.
 */
export const clerkAppearance = {
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "var(--action-strong)",
    colorPrimaryForeground: "var(--on-action-strong)",
    colorForeground: "var(--ink)",
    colorMutedForeground: "var(--ink-muted)",
    colorMuted: "var(--surface-sunken)",
    colorBackground: "var(--surface)",
    colorInput: "var(--surface)",
    colorInputForeground: "var(--ink)",
    colorBorder: "var(--line-strong)",
    colorRing: "var(--focus)",
    colorDanger: "var(--danger)",
    colorSuccess: "var(--success)",
    colorWarning: "var(--warning)",
    colorNeutral: "var(--ink)",
    colorShadow: "var(--on-action)",
    colorModalBackdrop: "var(--scrim)",
    fontFamily: "var(--font-sans)",
    fontFamilyButtons: "var(--font-sans)",
    fontFamilyMono: "var(--font-mono)",
    borderRadius: "12px",
  },
  elements: {
    // Sit flush inside our brand frame: no second card, shadow or Clerk footer box.
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-0 rounded-none",
    card: "bg-transparent shadow-none p-0 gap-6",
    headerTitle: "font-display text-display-sm text-ink",
    headerSubtitle: "text-body-md text-ink-muted",
    formFieldLabel: "text-label-md text-ink",
    formFieldInput: "h-10 rounded-md border-line-strong text-body-md",
    otpCodeFieldInput: "font-mono text-heading-lg",
    formButtonPrimary: "h-12 rounded-md text-label-md normal-case shadow-none",
    footer: "bg-transparent",
    footerActionLink: "text-link underline underline-offset-2",
    identityPreviewEditButton: "text-link",
  },
} as const;
