/** Approved labels for existing option values. These helpers never serialize or rewrite profile answers. */
export const serviceCategories = [
  { key: "wardrobe_personal_styling", value: "Wardrobe & Personal Styling", label: "Wardrobe & Personal Styling" },
  { key: "furniture_creative_builds", value: "Furniture & Creative Builds", label: "Furniture & Creative Builds" },
  { key: "beauty_personal_styling", value: "Beauty & Personal Styling", label: "Beauty, Hair & Makeup" },
  { key: "interior_styling", value: "Interior Styling", label: "Interior Styling" },
  { key: "event_styling", value: "Event Styling", label: "Parties & Event Planning" },
  { key: "photography_portraits", value: "Photography & Portraits", label: "Photography & Videography" },
  { key: "lighting_design", value: "Lighting Design", label: "Lighting Design" },
];
const legacyVariant = (value: string) => ["Hair Styling", "hair_styling"].includes(value) ? "hair" : ["Makeup Services", "makeup_services"].includes(value) ? "makeup" : undefined;
const categoryFor = (value: string) => serviceCategories.find(category => [category.value, category.label, category.key].includes(value) || (category.key === "beauty_personal_styling" && legacyVariant(value) !== undefined));
export const serviceLabel = (value: string) => categoryFor(value)?.label ?? value;
/** Category equivalence is for presentation/filtering only, never profile writes. */
export const serviceFamily = (value: string) => categoryFor(value)?.value ?? value;
/** New group filters include historical variants; a bookmarked Hair/Makeup filter keeps its narrower meaning. */
export const serviceMatches = (stored: string, requested: string) => legacyVariant(requested)
  ? legacyVariant(stored) === legacyVariant(requested)
  : serviceFamily(stored) === serviceFamily(requested);
export const servicePickerValues = (selected: string[], choices: string[]) => [...new Set([
  ...choices.filter(value => selected.includes(value) || !selected.some(saved => serviceMatches(saved, value))), ...selected,
])];
const legacyName = (value: string) => legacyVariant(value) === "hair" ? "Hair Styling" : legacyVariant(value) === "makeup" ? "Makeup Services" : undefined;
export const servicePickerLabel = (value: string) => {
  const saved = legacyName(value);
  return saved ? `${serviceLabel(value)} · saved: ${saved}` : serviceLabel(value);
};
/** Historical narrow filters keep their own names, rather than appearing to select the wider new group. */
export const serviceFilterLabel = (value: string) => legacyName(value) ?? serviceLabel(value);
export const serviceFilterValues = (choices: string[], current = "all") => [...new Set([
  ...choices, "Wardrobe & Laundry Care", ...(current !== "all" ? [current] : []),
])];
