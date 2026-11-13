/** Live owners cross into the separate sample Hub build; Pages/Hub keep their local base path. */
export function ownerEmailPreview(kind: "live" | "sample") {
  return {
    href: kind === "live" ? "/hub/emails/" : "/emails/",
    label: "Email previews",
    hint: "Sample only · no sending",
    fullPage: kind === "live",
  };
}
