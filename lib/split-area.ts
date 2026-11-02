/*
 * Code-splitting marker (scripts/check-split.mjs). Each dashboard file calls markArea("bg-split:dashboard") once at
 * the top: the string literal stays in whatever chunk the file lands in, minified or not, so the check can tell from
 * a public page's chunks alone that dashboard code reached it, however it was imported.
 */
const areas = new Set<string>();

export function markArea(area: "bg-split:dashboard") {
  areas.add(area);
}
