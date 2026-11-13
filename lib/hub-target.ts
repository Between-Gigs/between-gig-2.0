/** Canonical Hub destinations for legacy preview links; never an external redirect. */
export function hubTarget(raw: string | null): string {
  if (!raw || !/^\/(?:hub|preview)(?:\/|$)/.test(raw) || /(?:\\|\/\/|%2f|%5c|%00|[\u0000-\u001f])/i.test(raw)) return "/hub/";
  const pathname = raw.split("?")[0]!;
  if (pathname.split("/").some(part => { try { return [".", ".."].includes(decodeURIComponent(part)); } catch { return true; } })) return "/hub/";
  const tools = /^\/preview\/(?:cursors|curtain|design-system|gigster-journey|profile-editor|profiles|wallpapers)(?:\/|$)/;
  const path = tools.test(raw) ? raw.replace(/^\/preview/, "/hub/preview") : raw.replace(/^\/preview(?=\/|$)/, "/hub");
  return /^\/hub(?:\/preview)?\/?$/.test(path) ? "/hub/" : path;
}
