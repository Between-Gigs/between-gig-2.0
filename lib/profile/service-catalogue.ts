/** Patti's approved 17 November 2026 catalogue. Values are stable legacy answers; labels are presentation.
 * Examples are guidance, never saved over a Gigster's personal answer. */
export interface ServiceCategory { key: string; value: string; label: string; examples: { title: string; description: string }[]; tagline: string }
export const serviceCatalogue: ServiceCategory[] = [
  {
    key: "wardrobe_personal_styling", value: "Wardrobe & Personal Styling", label: "Wardrobe & Personal Styling",
    examples: [
      { title: "Closet Makeover & Wardrobe Refresh", description: "Transform your closet, rediscover pieces you already own, and create fresh outfits that work for your lifestyle." },
      { title: "Personal Shopping & Styling", description: "Get expert help selecting clothing and accessories that flatter your body, reflect your personality, and fit your budget." },
      { title: "Special Occasion Styling", description: "Look your best for a wedding, gala, important meeting, or special event with a professionally curated outfit, complete with accessories." },
    ], tagline: "From styling stars on screen to helping you look and feel your best.",
  },
  {
    key: "furniture_creative_builds", value: "Furniture & Creative Builds", label: "Furniture & Creative Builds",
    examples: [
      { title: "Custom Furniture & Shelving", description: "Bring your ideas to life with one-of-a-kind tables, bookshelves, storage solutions, and furniture designed for your space." },
      { title: "Creative Home & Outdoor Projects", description: "Transform your space with custom-built entertainment centers, garden structures, decorative features, and unique home installations." },
      { title: "Event Props & Specialty Builds", description: "Create eye-catching backdrops, themed decorations, display pieces, and custom structures for parties, celebrations, and special events." },
    ], tagline: "They build incredible worlds on screen. Imagine what they can build for you.",
  },
  {
    key: "beauty_personal_styling", value: "Beauty & Personal Styling", label: "Beauty, Hair & Makeup",
    examples: [
      { title: "Professional Makeup Application", description: "Look your best for weddings, special events, photoshoots, or a night out with makeup applied by an industry professional." },
      { title: "Hair Styling & Special Occasion Looks", description: "From elegant updos to glamorous Hollywood waves, get camera-ready hair for any occasion." },
      { title: "Personal Beauty Lessons", description: "Learn professional makeup techniques, discover products that work for you, and master everyday or special-event looks." },
    ], tagline: "A touch of Hollywood, made personal.",
  },
  {
    key: "interior_styling", value: "Interior Styling", label: "Interior Styling",
    examples: [
      { title: "Room & Whole-Home Transformations", description: "Transform a single room or your entire home with expert styling, furniture, lighting, artwork, and décor that reflect your personal style." },
      { title: "Holiday & Seasonal Decorating", description: "Bring your home to life with professionally styled holiday decorations, seasonal displays, and festive touches for special occasions." },
      { title: "Home Staging", description: "Make your home stand out to potential buyers with professional staging that highlights its best features and creates an inviting atmosphere." },
    ], tagline: "They create the spaces you love on screen. Now let them transform yours.",
  },
  {
    key: "event_styling", value: "Event Styling", label: "Parties & Event Planning",
    examples: [
      { title: "Children's Birthday Parties & Themed Celebrations", description: "Bring your child's imagination to life with creative themes, decorations, activities, and unforgettable party experiences." },
      { title: "Adult Parties & Special Celebrations", description: "Plan and style milestone birthdays, anniversaries, baby showers, and other memorable gatherings, from concept to execution." },
      { title: "Event Décor & Creative Experiences", description: "Transform any venue with custom backdrops, props, lighting, and imaginative designs inspired by Hollywood productions." },
    ], tagline: "From movie and television sets to unforgettable celebrations.",
  },
  {
    key: "photography_portraits", value: "Photography & Portraits", label: "Photography & Videography",
    examples: [
      { title: "Portraits & Professional Photography", description: "Capture beautiful family portraits, professional headshots, pet photos, and personal branding images with an experienced photographer." },
      { title: "Event Photography & Videography", description: "Preserve weddings, birthdays, anniversaries, and special celebrations through professional photos and beautifully produced videos." },
      { title: "Personal & Business Videos", description: "Bring your ideas to life with promotional videos, social media content, interviews, family documentaries, and other creative video projects." },
    ], tagline: "Your moments, captured by the pros.",
  },
  {
    key: "lighting_design", value: "Lighting Design", label: "Lighting Design",
    examples: [
      { title: "Home Lighting & Ambiance", description: "Transform a room or your entire home with creative lighting that enhances your décor, highlights architectural features, and creates the perfect atmosphere." },
      { title: "Outdoor & Landscape Lighting", description: "Bring patios, gardens, pathways, and outdoor entertaining spaces to life with beautifully designed lighting." },
      { title: "Event & Party Lighting", description: "Create unforgettable atmospheres for weddings, parties, and special celebrations with dramatic lighting, colorful effects, and creative illumination." },
    ], tagline: "See your space in a whole new light.",
  },
  {
    key: "video_editing_digital_content", value: "Video Editing & Digital Content", label: "Video Editing & Digital Content",
    examples: [
      { title: "Personal Video Editing", description: "Turn family videos, vacation footage, wedding clips, and treasured memories into beautifully edited films you'll enjoy for years." },
      { title: "Social Media & Digital Content", description: "Create engaging reels, TikToks, YouTube videos, and other digital content using professional editing, graphics, music, and effects." },
      { title: "Business & Promotional Videos", description: "Transform existing footage into professional advertisements, product demonstrations, company presentations, and marketing videos." },
    ], tagline: "Your footage. Hollywood's finishing touch.",
  },
];

/** These answers stay distinct in saved data, even when grouped under one category. */
export const legacyServiceValues = ["Wardrobe & Laundry Care", "Makeup Services", "Hair Styling"];
export const serviceCategory = (value: string) => serviceCatalogue.find(c => c.value === value || c.label === value || c.key === value || (c.key === "beauty_personal_styling" && ["Makeup Services", "Hair Styling", "makeup_services", "hair_styling"].includes(value)));
export const serviceLabel = (value: string) => serviceCategory(value)?.label ?? value;
export const serviceValue = (value: string) => serviceCategory(value)?.value ?? value;
export const serviceMatches = (a: string, b: string) => serviceValue(a) === serviceValue(b);
/** Keep an unknown/retired current answer selectable; omit canonical duplicates from new choices. */
export function serviceOptions(selected: string[], current?: string, otherVisible = false, extra: string[] = []) {
  const choices = [...serviceCatalogue.map(c => c.value), ...extra];
  return [
    ...(current && !choices.includes(current) ? [{value:current, label:serviceLabel(current)}] : []),
    ...choices.filter(c => c === current || !selected.some(s => serviceMatches(s,c))).map(value => ({value, label:serviceLabel(value)})),
    ...(!otherVisible ? [{value:"__other", label:"Other — name your service"}] : []),
  ];
}

/** Multi-select editors also keep retired saved values visible without offering another copy of their category. */
export const servicePickerValues = (selected: string[], choices: string[]) => [...new Set([
  ...choices.filter(c => selected.includes(c) || !selected.some(s => serviceMatches(s, c))), ...selected,
])];

/** Distinguish separate historical Beauty answers in multi-select controls. */
export const servicePickerLabel = (value: string) => ["Hair Styling", "Makeup Services"].includes(value) ? `${serviceLabel(value)} · saved: ${value}` : serviceLabel(value);

/** Filtering is not a new-profile choice: retired Laundry and a bookmarked legacy filter stay available. */
export const serviceFilterValues = (choices: string[], current = "all") => [...new Set([
  ...choices, "Wardrobe & Laundry Care", ...(current !== "all" ? [current] : []),
])];
