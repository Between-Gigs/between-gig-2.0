import { professionalExamples, type ExampleId } from "../professional-examples";
import type { ProfileFields } from "./types";
import type { SeedPerson } from "./seed";

type ExampleDetails = {
  zip: string;
  fields: Pick<ProfileFields, "years" | "position" | "skills" | "services" | "areas" | "travel" | "rate" | "basis" | "about" | "tools" | "transport" | "mode">;
  earliest: string;
  mobile: string;
  minimum: string;
  personality: string;
  hireableJobs: string;
  availability: "available" | "limited";
  jobs: string[];
};

const details: Record<ExampleId, ExampleDetails> = {
  simone: {
    zip: "90026", earliest: "2026-11-16", mobile: "+1 213-555-0101", minimum: "Two hours", availability: "limited",
    personality: "I collect paint swatches from every set I work on.",
    hireableJobs: "I can restyle your room, sketch a furniture layout and source pieces within your budget.",
    fields: {
      years: "11", position: "Art Director", skills: ["Art department", "Set decoration"], services: ["Interior Styling"],
      areas: ["Eastside", "Hollywood", "Pasadena area"], travel: "Up to 15 miles from Echo Park", rate: "95", basis: "hourly",
      about: "I turn a room you already live in into a space that feels like you. I can sketch a furniture plan, make a mood board and source pieces within your budget. Years of dressing sets taught me how lighting and one well-chosen object can change a whole room. Styling consultations range from $95 to $140 an hour.",
      tools: "Measured floor plans, sample boards and a sourcing list", transport: "Car for local sourcing visits", mode: "on-site",
    },
    jobs: ["Restyle one room around furniture you own", "Build a mood board and measured layout", "Source lighting and furnishings to a budget"],
  },
  luis: {
    zip: "91505", earliest: "2026-11-28", mobile: "+1 213-555-0102", minimum: "One design consultation", availability: "limited",
    personality: "I keep the good offcuts for miniature furniture.",
    hireableJobs: "I design custom freestanding furniture, build displays and repair favorite pieces.",
    fields: {
      years: "14", position: "Set Carpenter", skills: ["Props", "Art department"], services: ["Furniture & Creative Builds"],
      areas: ["The Valley", "Hollywood", "Eastside"], travel: "Up to 25 miles from Burbank", rate: "450", basis: "project",
      about: "I design and build freestanding furniture, from a sideboard that fits an awkward alcove to a shop display that travels in a van. My set-carpentry background is in fast, precise builds. A design consultation starts at $450 and includes a measured sketch and material options. Fabrication is quoted separately.",
      tools: "Measuring kit, drawings, joinery and finishing tools", transport: "Van for site visits and agreed deliveries", mode: "both",
    },
    jobs: ["Design a made-to-fit freestanding sideboard", "Build a portable retail display", "Repair and refinish a favorite piece of furniture"],
  },
  renee: {
    zip: "90028", earliest: "2026-11-17", mobile: "+1 213-555-0103", minimum: "Three hours", availability: "available",
    personality: "My emergency kit always includes cake candles.",
    hireableJobs: "I can coordinate your vendors, write the run of show and run your event day.",
    fields: {
      years: "9", position: "Production Coordinator", skills: ["Production office"], services: ["Events & Organization"],
      areas: ["Hollywood", "Downtown", "Eastside"], travel: "Up to 20 miles from Hollywood", rate: "75", basis: "hourly",
      about: "I bring a production coordinator’s calm to small events. I turn your plans into a run of show, confirm vendors and make sure someone knows where the spare chairs are. For my garden-event work sample, I coordinated setup, guest arrival and the handoff to dinner. Coordination is $75–$110 an hour.",
      tools: "Run-of-show templates, vendor checklists and a day-of kit", transport: "Car for venue walk-throughs", mode: "on-site",
    },
    jobs: ["Create a timeline for a garden dinner", "Confirm vendor schedules and deliveries", "Coordinate setup and guest arrival on event day"],
  },
  devon: {
    zip: "90034", earliest: "2026-11-18", mobile: "+1 213-555-0104", minimum: "One scouting package", availability: "available",
    personality: "My favorite finds usually begin with an interesting doorway.",
    hireableJobs: "I scout venues and photograph the best options against your brief and budget.",
    fields: {
      years: "12", position: "Location Scout", skills: ["Locations"], services: ["Venue & Location Scouting"],
      areas: ["Westside", "Downtown", "South Bay"], travel: "Up to 40 miles from West Los Angeles", rate: "350", basis: "project",
      about: "Tell me the atmosphere, budget and access you need. I’ll research a shortlist of venues, photograph the strongest options and flag parking, noise and practical constraints. I scout restaurants, corporate-event venues and travel locations as well as film locations. A scouting package starts at $350.",
      tools: "Camera, location notes, maps and a venue comparison sheet", transport: "Car for research and site visits", mode: "on-site",
    },
    jobs: ["Shortlist restaurant venues against a brief", "Photograph and compare corporate-event spaces", "Scout hotels and locations for a travel itinerary"],
  },
};

/** Read-only source fixtures. Each sample session builds its own draft and published records from them. */
export const featuredPeople: SeedPerson[] = professionalExamples.map((card) => {
  const d = details[card.id];
  return {
    id: card.id, name: card.name, status: "approved", zip: d.zip, category: card.category, days: 1,
    fields: {
      ...d.fields, name: card.name, zip: d.zip, photo: `art/samples/cards/${card.img}-portrait.jpg`,
      credits: [card.credits], imdb: "", languages: "English", insurance: "private",
      monthStatus: d.availability, dates: card.availability,
      bookingMobile: d.mobile, earliestStart: d.earliest, bookingMinimum: d.minimum, personality: d.personality, hireableJobs: d.hireableJobs,
      // The Gigster editor's answers: their one line for the service, and the question the personality line answers.
      serviceLines: Object.fromEntries(d.fields.services.map((s) => [s, d.hireableJobs])), personalityQuestion: "never-guess",
    },
    extras: {
      tagline: card.services,
      helps: d.jobs,
      portfolio: [
        { src: `art/samples/cards/${card.img}-work.jpg`, caption: card.portfolio },
        ...(card.id === "luis" ? [{ src: "art/samples/furniture.jpg", caption: "A sculpted walnut sideboard" }] : []),
      ],
    },
  };
});
