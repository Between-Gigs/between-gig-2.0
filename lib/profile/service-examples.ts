/** Approved November 17 guidance for existing service values only. Never used as choices or saved answers. */
export interface ServiceExamples { value: string; examples: { title: string; description: string }[]; tagline: string }
export const serviceExamples: ServiceExamples[] = [
  {
    value: "Wardrobe & Personal Styling",
    examples: [
      { title: "Closet Makeover & Wardrobe Refresh", description: "Transform your closet, rediscover pieces you already own, and create fresh outfits that work for your lifestyle." },
      { title: "Personal Shopping & Styling", description: "Get expert help selecting clothing and accessories that flatter your body, reflect your personality, and fit your budget." },
      { title: "Special Occasion Styling", description: "Look your best for a wedding, gala, important meeting, or special event with a professionally curated outfit, complete with accessories." },
    ], tagline: "From styling stars on screen to helping you look and feel your best.",
  },
  {
    value: "Furniture & Creative Builds",
    examples: [
      { title: "Custom Furniture & Shelving", description: "Bring your ideas to life with one-of-a-kind tables, bookshelves, storage solutions, and furniture designed for your space." },
      { title: "Creative Home & Outdoor Projects", description: "Transform your space with custom-built entertainment centers, garden structures, decorative features, and unique home installations." },
      { title: "Event Props & Specialty Builds", description: "Create eye-catching backdrops, themed decorations, display pieces, and custom structures for parties, celebrations, and special events." },
    ], tagline: "They build incredible worlds on screen. Imagine what they can build for you.",
  },
  {
    value: "Beauty & Personal Styling",
    examples: [
      { title: "Professional Makeup Application", description: "Look your best for weddings, special events, photoshoots, or a night out with makeup applied by an industry professional." },
      { title: "Hair Styling & Special Occasion Looks", description: "From elegant updos to glamorous Hollywood waves, get camera-ready hair for any occasion." },
      { title: "Personal Beauty Lessons", description: "Learn professional makeup techniques, discover products that work for you, and master everyday or special-event looks." },
    ], tagline: "A touch of Hollywood, made personal.",
  },
  {
    value: "Interior Styling",
    examples: [
      { title: "Room & Whole-Home Transformations", description: "Transform a single room or your entire home with expert styling, furniture, lighting, artwork, and décor that reflect your personal style." },
      { title: "Holiday & Seasonal Decorating", description: "Bring your home to life with professionally styled holiday decorations, seasonal displays, and festive touches for special occasions." },
      { title: "Home Staging", description: "Make your home stand out to potential buyers with professional staging that highlights its best features and creates an inviting atmosphere." },
    ], tagline: "They create the spaces you love on screen. Now let them transform yours.",
  },
  {
    value: "Event Styling",
    examples: [
      { title: "Children's Birthday Parties & Themed Celebrations", description: "Bring your child's imagination to life with creative themes, decorations, activities, and unforgettable party experiences." },
      { title: "Adult Parties & Special Celebrations", description: "Plan and style milestone birthdays, anniversaries, baby showers, and other memorable gatherings, from concept to execution." },
      { title: "Event Décor & Creative Experiences", description: "Transform any venue with custom backdrops, props, lighting, and imaginative designs inspired by Hollywood productions." },
    ], tagline: "From movie and television sets to unforgettable celebrations.",
  },
  {
    value: "Photography & Portraits",
    examples: [
      { title: "Portraits & Professional Photography", description: "Capture beautiful family portraits, professional headshots, pet photos, and personal branding images with an experienced photographer." },
      { title: "Event Photography & Videography", description: "Preserve weddings, birthdays, anniversaries, and special celebrations through professional photos and beautifully produced videos." },
      { title: "Personal & Business Videos", description: "Bring your ideas to life with promotional videos, social media content, interviews, family documentaries, and other creative video projects." },
    ], tagline: "Your moments, captured by the pros.",
  },
  {
    value: "Lighting Design",
    examples: [
      { title: "Home Lighting & Ambiance", description: "Transform a room or your entire home with creative lighting that enhances your décor, highlights architectural features, and creates the perfect atmosphere." },
      { title: "Outdoor & Landscape Lighting", description: "Bring patios, gardens, pathways, and outdoor entertaining spaces to life with beautifully designed lighting." },
      { title: "Event & Party Lighting", description: "Create unforgettable atmospheres for weddings, parties, and special celebrations with dramatic lighting, colorful effects, and creative illumination." },
    ], tagline: "See your space in a whole new light.",
  },
];

/** Historic Beauty/Hair/Makeup answers stay distinct; only their explanatory guidance is shared. */
export const serviceExamplesFor = (value: string) => serviceExamples.find(category => category.value === value || (category.value === "Beauty & Personal Styling" && ["Hair Styling", "Makeup Services"].includes(value)));
