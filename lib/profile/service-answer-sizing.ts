type TextareaBox = Pick<HTMLTextAreaElement, "clientHeight" | "offsetHeight" | "offsetWidth" | "scrollHeight"> &
  { style: Pick<CSSStyleDeclaration, "height"> };

export function usesLegacyServiceAnswerSizing(css: { supports?: (property: string, value: string) => boolean } | undefined): boolean {
  return !css?.supports?.("field-sizing", "content");
}

/** The design system uses border-box. Retain its CSS minimum while measuring wrapped content. */
export function fitLegacyServiceAnswer(field: TextareaBox): void {
  if (field.offsetWidth === 0) return;
  field.style.height = "auto"; // Drop the former height so a shorter value can shrink.
  const borders = field.offsetHeight - field.clientHeight;
  field.style.height = `${field.scrollHeight + borders}px`;
}
