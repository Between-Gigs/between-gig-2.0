/*
 * Between Gigs design system v1 ("Cream & forest"), organised the atomic way, mirroring Figma:
 *   atoms      → DS · Components · Atoms       (type, links, status, divider, base controls)
 *   molecules  → DS · Components · Molecules   (alert, completeness, step item, add tile, service row, rate block, section heading)
 *   organisms  → DS · Components · Organisms   (auth card, photo stage, result card, service tile; header/footer in components/site)
 *   templates  → DS · Patterns                 (page layouts the routes fill in)
 * Tokens: styles/look-editorial.css ↔ Figma variables (Color Light/Dark, Spacing, Radius). See docs/design-system-v1.md.
 */
export * from "./atoms";
export * from "./molecules";
export * from "./organisms";
