/** Preview routes live in the isolated sample build when entered from the live dashboard. */
export function ownerPreviewLink(kind: "live" | "sample", path: string) {
  return { href: kind === "live" ? `/hub${path}` : path, fullPage: kind === "live" };
}

/** Live owners cross into the separate sample Hub build; Pages/Hub keep their local base path. */
export function ownerEmailPreview(kind: "live" | "sample") {
  if (kind === "live") return { href: "/owners/emails/", label: "Emails", hint: "Diagnostic and previews", fullPage: false };
  return {
    ...ownerPreviewLink(kind, "/emails/"),
    label: "Email previews",
    hint: "Sample only · no sending",
  };
}

/** Plain anchors must include the static export base path. */
export function emailTemplateHref(kind: "live" | "sample", name: string, basePath = "") {
  return kind === "live" ? `/owners/emails/?template=${encodeURIComponent(name)}` : `${basePath}/emails/${name}/`;
}
