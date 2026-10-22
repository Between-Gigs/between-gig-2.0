/** "Oct 20" (adds the year only when it isn't this year). For tables and timelines: short, never wraps. */
export const shortDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
};

/** True when a keyboard shortcut should be ignored: typing in a field, or a dialog is open. */
export const typingOrDialog = (e: KeyboardEvent) =>
  e.metaKey || e.ctrlKey || e.altKey
  || !!(e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable], [role=dialog], [role=listbox]")
  || !!document.querySelector("[role=dialog], dialog[open]");
