/** Preview routes live in the isolated sample build when entered from the live dashboard. */
export function ownerPreviewLink(kind: "live" | "sample", path: string) {
  return { href: kind === "live" ? `/hub${path}` : path, fullPage: kind === "live" };
}

/** Live owners cross into the separate sample Hub build; Pages/Hub keep their local base path. */
export function ownerEmailPreview(kind: "live" | "sample") {
  return {
    ...ownerPreviewLink(kind, "/emails/"),
    label: "Email previews",
    hint: "Sample only · no sending",
  };
}
