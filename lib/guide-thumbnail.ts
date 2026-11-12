import { lookKey } from "./look";

export const guideReadyEvent = "bg-guide-preview-ready";

/** Before the app boots, give passive sample frames temporary storage so Studio autosave, sample roles and
 * invite-open events stay inside the thumbnail. The parent shares only its appearance settings. */
export const prepareGuideThumbnail = process.env.BG_BUILD === "server" || process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "" : `
(function () {
  if (window.parent === window) return;
  try {
    if (!window.frameElement || !window.frameElement.hasAttribute("data-guide-thumbnail")) return;
    function memoryStorage() {
      var values = new Map();
      return {
        get length() { return values.size; },
        key: function (i) { return Array.from(values.keys())[i] ?? null; },
        getItem: function (k) { return values.get(String(k)) ?? null; },
        setItem: function (k, v) { values.set(String(k), String(v)); },
        removeItem: function (k) { values.delete(String(k)); },
        clear: function () { values.clear(); }
      };
    }
    var local = memoryStorage(), appearance = window.parent.document.documentElement.dataset;
    if (appearance.look) local.setItem(${JSON.stringify(lookKey)}, appearance.look);
    if (appearance.theme) local.setItem("bg-theme", appearance.theme);
    Object.defineProperty(window, "localStorage", {value: local});
    Object.defineProperty(window, "sessionStorage", {value: memoryStorage()});
    // Autofocus inside a child document can scroll its parent guide to a different card.
    document.documentElement.inert = true;
    document.documentElement.dataset.guideThumbnail = "";
  } catch (_) {}
})();`;

/** The passive thumbnail uses a fictional identity even on the Clerk-enabled Pages build. */
export function isGuideThumbnail() {
  return typeof document !== "undefined" && document.documentElement.hasAttribute("data-guide-thumbnail");
}
