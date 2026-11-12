/** Approved illustrative cards used on Professionals and in the sample profile gallery. */
export const professionalExamples = [
  { id: "simone", name: "Simone", title: "Art Director → Interior Styling", category: "interiors", img: "simone", credits: "Independent shorts and branded shoots", services: "Room styling, mood boards and sourcing", pricing: "Styling consultations: $95-$140 / hour", availability: "Weekday afternoons between shoots", portfolio: "A warm living-room styling concept" },
  { id: "luis", name: "Luis", title: "Set Carpenter → Custom Builds", category: "builds", img: "luis", credits: "Television sets and music videos", services: "Custom furniture and creative builds", pricing: "Design consultations from $450. Fabrication quoted by project.", availability: "Weekends; 2-3 weeks' lead time", portfolio: "A freestanding walnut console" },
  { id: "renee", name: "Renee", title: "Production Coordinator → Events", category: "events", img: "renee", credits: "Commercial shoots and indie-film logistics", services: "Event timelines and vendor coordination", pricing: "Coordination: $75-$110 / hour", availability: "Weekday planning and event-day coverage by arrangement", portfolio: "An intimate garden event" },
  { id: "devon", name: "Devon", title: "Location Scout → Commercial Locations & Venues", category: "venues", img: "devon", credits: "Independent films and commercial shoots", services: "Restaurant and retail location research, corporate-event venues, and hotel and restaurant scouting for travel companies", pricing: "Scouting packages from $350", availability: "Select weekdays between productions", portfolio: "A garden courtyard event setting" },
] as const;

export type ProfessionalExample = (typeof professionalExamples)[number];
export type ExampleId = ProfessionalExample["id"];
