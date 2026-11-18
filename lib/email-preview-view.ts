export type EmailPreviewView = "full" | "list" | "thumbnails";
export type EmailPreviewDevice = "desktop" | "phone";
export const previewView = (value: string): EmailPreviewView => value === "full" || value === "list" ? value : "thumbnails";
export const previewDevice = (value: string): EmailPreviewDevice => value === "phone" ? "phone" : "desktop";
/** Use a desktop viewport above the template's 620px mobile breakpoint, even in a narrow card. */
export const previewViewport = (device: EmailPreviewDevice) => device === "phone" ? 390 : 640;
export function previewGeometry(available: number, viewport: number, documentHeight: number, view: "full" | "thumbnails") {
  const scale = Math.min(1, Math.max(0, available) / viewport, view === "thumbnails" ? 240 / Math.max(1, documentHeight) : 1);
  return { scale, height: view === "thumbnails" ? 240 : documentHeight * scale, left: Math.max(0, (available - viewport * scale) / 2) };
}
