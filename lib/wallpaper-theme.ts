/** Explicit aliases of the Craft Invitation artwork. Other scenes retain their own night grades. */
const selectedDark: Record<string, string> = {
  "art/stage/still-life-desktop.jpg": "/art/stage/still-life-desktop-dark.png",
  "art/stage/still-life-portrait.jpg": "/art/stage/still-life-portrait-dark.png",
  "email/craft-invitation-desktop.jpg": "/art/stage/still-life-desktop-dark.png",
  "email/craft-invitation-portrait.jpg": "/art/stage/still-life-portrait-dark.png",
};

export const selectedDarkWallpaper = (src: string): string | undefined => selectedDark[src.replace(/^\//, "")];

/** Explicit selected dark variants for the Crew Call hero only, not its service photography. */
export const crewCallDark = {
  desktop: "/art/crew-call/hero-desktop-dark.png",
  portrait: "/art/crew-call/hero-portrait-dark.png",
} as const;
