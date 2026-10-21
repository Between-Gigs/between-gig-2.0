/*
 * Seed data for the sample implementation. Every person here is FICTIONAL: names, emails (example.com),
 * credits, rates and photos. Maya, Jordan, Alex, Priya, Sam and Morgan and their images come from the
 * design system's showcase prototype; everyone else uses a monogram. No real Gigster data lives here.
 */
import type { Invite, Person, PersonStatus, Profile, ProfileDraft, ProfileFields, ProfileSection } from "./types";

const at = (d: string) => `2026-${d}:00.000Z`;
const IMDB_SAMPLE = "https://www.imdb.com/name/nm0000000/";

export const SAMPLE_OWNER = { email: "owners@between-gigs.example", name: "Owner (sample)" } as const;

export const blankFields = (name = ""): ProfileFields => ({
  photo: "", name, years: "", position: "", imdb: "", credits: [""],
  skills: [], services: [], other: "",
  market: "la", otherCity: "", zip: "", areas: [], travel: "", month: "November 2026", monthStatus: "available", dates: "", rate: "", basis: "hourly",
  about: "", languages: "", insurance: "private", tools: "", transport: "", mode: "on-site",
});

interface SeedPerson {
  id: string;
  name: string;
  status: PersonStatus;
  zip: string;
  category: string;
  fields?: Partial<ProfileFields>;
  extras?: Profile["extras"];
  step?: number;
  notes?: [ProfileSection, string][];
  days: number;
}

const img = (id: string, captions: string[]) => captions.map((caption, i) => ({ src: `img/people/${id}-${i + 1}.jpg`, caption }));

const photoPeople: SeedPerson[] = [
  {
    id: "maya", name: "Maya Chen", status: "approved", zip: "90026", category: "wardrobe", days: 1,
    fields: {
      photo: "img/people/maya.jpg", years: "9", position: "Costume & wardrobe", skills: ["Wardrobe & costume"],
      services: ["Wardrobe & Personal Styling", "Wardrobe & Laundry Care"], areas: ["Eastside", "Downtown"], zip: "90026",
      dates: "Weekday mornings; exact project dates to confirm", rate: "45",
      about: "I bring a costume-minded eye to the clothes you already love. From thoughtful alterations to a more useful wardrobe, I focus on comfortable fit, practical details and pieces that work for everyday life. We can start with a single garment or work through a closet together.",
      languages: "English, Spanish", tools: "Sewing kit and garment-care tools; project-specific equipment to discuss", transport: "Personal vehicle",
      credits: ["Fictional production · Wardrobe assistant (sample credit)"],
    },
    extras: {
      tagline: "Thoughtful alterations, wardrobe edits and custom pieces for everyday life.",
      helps: ["Alterations", "Closet styling", "Wardrobe edits", "Custom pieces", "Fit consultations", "Clothing organization"],
      portfolio: img("maya", ["Thoughtful alterations", "Everyday wardrobe styling", "A clearer closet", "Organized essentials"]),
    },
  },
  {
    id: "jordan", name: "Jordan Ellis", status: "approved", zip: "90026", category: "builds", days: 2,
    fields: {
      photo: "img/people/jordan.jpg", years: "12", position: "Props", skills: ["Props", "Art department"],
      services: ["Furniture & Creative Builds"], areas: ["Eastside", "Downtown"], zip: "90026",
      dates: "Most weekdays; weekend builds by arrangement", rate: "55",
      about: "I like making useful things and finding practical fixes. My approach combines a prop-builder's resourcefulness with attention to the everyday details of your space. Bring a furniture problem, an idea for a custom piece or a project that needs a creative pair of hands.",
      languages: "English", tools: "Build tools and material needs agreed before a project", transport: "Van; material transport to discuss",
      credits: ["Fictional series · Prop maker (sample credit)"],
    },
    extras: {
      tagline: "Practical builds, furniture fixes and one-of-a-kind details made with care.",
      helps: ["Furniture repair", "Custom projects", "Prop fabrication", "Small builds", "Furniture assembly", "Project planning"],
      portfolio: img("jordan", ["Woodworking details", "Custom prop ideas", "Practical repairs", "One-of-a-kind builds"]),
    },
  },
  {
    id: "alex", name: "Alex Rivera", status: "approved", zip: "90027", category: "events", days: 3,
    fields: {
      photo: "img/people/alex.jpg", years: "7", position: "Set decoration", skills: ["Set decoration"],
      services: ["Event Styling", "Interior Styling"], areas: ["Eastside", "Hollywood"], zip: "90027", monthStatus: "limited",
      dates: "Second half of the month", rate: "60",
      about: "I help shape inviting spaces and memorable gatherings, from the first idea to the final detail. Whether it's a home refresh or a special event, my approach is thoughtful, practical and focused on how you want the space to feel.",
      languages: "English", tools: "Styling supplies and decor sourcing discussed together", transport: "Personal vehicle",
      credits: ["Fictional feature · Set dresser (sample credit)"],
    },
    extras: {
      tagline: "Inviting spaces and memorable gatherings, from the first idea to the final detail.",
      helps: ["Event styling", "Home refresh", "Table styling", "Decor planning", "Room styling", "Finishing touches"],
      portfolio: img("alex", ["Inviting interiors", "Gathering spaces", "Event atmosphere", "A refreshed room", "Natural details", "Art and decor"]),
    },
  },
  {
    id: "priya", name: "Priya Shah", status: "approved", zip: "91502", category: "photo", days: 4,
    fields: {
      photo: "img/people/priya.jpg", years: "11", position: "Lighting & grip", skills: ["Lighting & grip"],
      services: ["Lighting Design"], areas: ["The Valley", "Hollywood"], zip: "91502",
      dates: "Evenings and weekends", rate: "60",
      about: "Thoughtful light can change the feeling of a room or a gathering. I help explore warm, considered lighting for portraits, events and everyday spaces, with a focus on the mood you want and the practical setup you need.",
      languages: "English, Hindi", tools: "Lighting equipment and power requirements scoped for each project", transport: "Personal vehicle",
      credits: ["Fictional series · Gaffer (sample credit)"],
    },
    extras: {
      tagline: "Warm, considered lighting for gatherings, portraits and everyday spaces.",
      helps: ["Event lighting", "Home lighting", "Portrait lighting", "Ambient lighting", "Lighting plans", "Setup planning"],
      portfolio: img("priya", ["Lighting a scene", "Event atmosphere", "Everyday warmth", "Gathering after dark", "Portrait setup ideas", "Considered spaces"]),
    },
  },
  {
    id: "sam", name: "Sam Brooks", status: "approved", zip: "91101", category: "photo", days: 5,
    fields: {
      photo: "img/people/sam.jpg", years: "6", position: "Camera", skills: ["Camera"],
      services: ["Photography & Portraits"], areas: ["Pasadena area", "Eastside"], zip: "91101", monthStatus: "limited",
      dates: "Weekends this month", rate: "75",
      about: "I'm interested in relaxed portraits, thoughtful product images and the moments that make an event feel like yours. A clear plan and a comfortable atmosphere help us focus on making images with a creative eye.",
      languages: "English", tools: "Camera and image-delivery requirements confirmed for the project", transport: "Personal vehicle",
      credits: ["Fictional documentary · Camera operator (sample credit)"],
    },
    extras: {
      tagline: "Relaxed portraits, product photos and event moments with a creative eye.",
      helps: ["Portraits", "Product photography", "Event photography", "Creative portraits", "Image selection", "Shoot planning"],
      portfolio: img("sam", ["Portrait session ideas", "Selecting the story", "Event moments", "Light and setting"]),
    },
  },
  {
    id: "morgan", name: "Morgan Lee", status: "approved", zip: "91203", category: "interiors", days: 6,
    fields: {
      photo: "img/people/morgan.jpg", years: "14", position: "Art department", skills: ["Art department", "Set decoration"],
      services: ["Interior Styling", "Furniture & Creative Builds"], areas: ["The Valley", "Hollywood"], zip: "91203",
      dates: "Flexible between productions", rate: "65",
      about: "I bring an inventive approach to backdrops and practical space planning. We can explore how a space needs to work, what it should feel like and the details that bring the idea together, from a small creative setup to a distinctive backdrop.",
      languages: "English, Korean", tools: "Drawing, build and installation needs planned to suit the space", transport: "Personal vehicle; larger loads to discuss",
      credits: ["Fictional feature · Art director (sample credit)"],
    },
    extras: {
      tagline: "Inventive backdrops and practical space planning for creative projects.",
      helps: ["Custom backdrops", "Space planning", "Set concepts", "Display design", "Creative installations", "Layout planning"],
      portfolio: img("morgan", ["A distinctive backdrop", "Fabricated details", "Working with space", "Creative displays", "An installation idea", "Planning the scene"]),
    },
  },
];

const story = (craft: string, offer: string) =>
  `After years in ${craft}, I bring the same care and problem-solving to everyday projects. I can help with ${offer}, planned around your space and your timing. We agree scope, timing and the final rate before anything starts.`;

const monogramPeople: SeedPerson[] = [
  { id: "dana-whitfield", name: "Dana Whitfield", status: "approved", zip: "90028", category: "hair", days: 7,
    fields: { years: "10", position: "Hair & makeup", skills: ["Hair & makeup"], services: ["Hair Styling"], areas: ["Hollywood", "Westside"], zip: "90028", rate: "70", dates: "Weekday afternoons", about: story("hair departments on set", "styling for events, photo shoots and special appearances"), languages: "English", credits: ["Fictional series · Key hair (sample credit)"] } },
  { id: "luca-moreno", name: "Luca Moreno", status: "approved", zip: "90401", category: "makeup", days: 8,
    fields: { years: "8", position: "Hair & makeup", skills: ["Hair & makeup"], services: ["Makeup Services", "Beauty & Personal Styling"], areas: ["Westside", "South Bay"], zip: "90401", rate: "65", dates: "Mornings and weekends", monthStatus: "limited", about: story("makeup trailers", "event makeup, headshots and personal lessons"), languages: "English, Italian", credits: ["Fictional feature · Makeup artist (sample credit)"] } },
  { id: "imani-carter", name: "Imani Carter", status: "submitted", zip: "90012", category: "interiors", days: 0,
    fields: { years: "9", position: "Set decoration", skills: ["Set decoration", "Art department"], services: ["Interior Styling"], areas: ["Downtown", "Eastside"], zip: "90012", rate: "70", dates: "Weekdays", about: story("set decoration", "room styling, sourcing and seasonal refreshes"), languages: "English", credits: ["Fictional series · Set decorator (sample credit)"] } },
  { id: "theo-nakamura", name: "Theo Nakamura", status: "submitted", zip: "90034", category: "photo", days: 1,
    fields: { years: "5", position: "Camera", skills: ["Camera"], services: ["Photography & Portraits"], areas: ["Westside"], zip: "90034", rate: "80", dates: "Weekends", about: story("camera crews", "portraits, headshots and small events"), languages: "English, Japanese", credits: ["Fictional short · Camera assistant (sample credit)"] } },
  { id: "rosa-delgado", name: "Rosa Delgado", status: "submitted", zip: "91601", category: "wardrobe", days: 1,
    fields: { years: "15", position: "Wardrobe & costume", skills: ["Wardrobe & costume"], services: ["Wardrobe & Laundry Care", "Wardrobe & Personal Styling"], areas: ["The Valley"], zip: "91601", rate: "50", dates: "Tuesday to Thursday", about: story("costume departments", "garment care, alterations and wardrobe edits"), languages: "English, Spanish", credits: ["Fictional series · Costumer (sample credit)"] } },
  { id: "ben-okafor", name: "Ben Okafor", status: "submitted", zip: "90016", category: "events", days: 2,
    fields: { years: "7", position: "Production office", skills: ["Production office", "Locations"], services: ["Event Styling"], areas: ["Westside", "Downtown"], zip: "90016", rate: "60", dates: "Event days by arrangement", about: story("production offices", "event planning, timelines and on-the-day coordination"), languages: "English, Yoruba", credits: ["Fictional feature · Production coordinator (sample credit)"] } },
  { id: "hana-kim", name: "Hana Kim", status: "changes_requested", zip: "90036", category: "styling", days: 2,
    fields: { years: "6", position: "Hair & makeup", skills: ["Hair & makeup"], services: ["Beauty & Personal Styling"], areas: ["Hollywood"], zip: "90036", rate: "", dates: "Weekends", about: story("hair and makeup", "personal styling for events"), languages: "English, Korean", credits: ["Fictional series · Makeup assistant (sample credit)"] },
    notes: [["about", "Please add a profile photo that shows your face clearly."], ["story", "Tell clients a little more about what a session with you looks like."]] },
  { id: "marcus-reed", name: "Marcus Reed", status: "changes_requested", zip: "90065", category: "builds", days: 3,
    fields: { years: "18", position: "Props", skills: ["Props"], services: ["Furniture & Creative Builds"], areas: ["Eastside"], zip: "90065", rate: "85", basis: "hourly", dates: "Most weeks", about: story("prop shops", "custom furniture, repairs and creative builds"), languages: "English", credits: ["Fictional feature · Prop master (sample credit)"] },
    notes: [["where", "Add the dates you're free this month so clients know when to ask."]] },
  { id: "elena-petrova", name: "Elena Petrova", status: "draft", zip: "90039", category: "interiors", days: 1, step: 2,
    fields: { years: "4", position: "Art department", skills: ["Art department"], services: ["Interior Styling"], zip: "90039", credits: ["Fictional short · Art assistant (sample credit)"] } },
  { id: "owen-gallagher", name: "Owen Gallagher", status: "draft", zip: "91505", category: "builds", days: 2, step: 1,
    fields: { years: "20", position: "Set construction", credits: ["Fictional series · Carpenter (sample credit)"] } },
  { id: "nia-thompson", name: "Nia Thompson", status: "draft", zip: "90008", category: "events", days: 4, step: 3,
    fields: { years: "3", position: "Locations", skills: ["Locations"], services: ["Event Styling"], areas: ["South Bay", "Westside"], zip: "90008", dates: "Weekends", credits: ["Fictional feature · Locations assistant (sample credit)"] } },
  { id: "felix-andersen", name: "Felix Andersen", status: "draft", zip: "90042", category: "photo", days: 5, step: 0,
    fields: { position: "Camera" } },
  { id: "grace-liu", name: "Grace Liu", status: "registered", zip: "91030", category: "makeup", days: 0 },
  { id: "diego-ramos", name: "Diego Ramos", status: "registered", zip: "90031", category: "builds", days: 1 },
  { id: "ava-sinclair", name: "Ava Sinclair", status: "registered", zip: "90046", category: "wardrobe", days: 3 },
  { id: "riley-park", name: "Riley Park", status: "invited", zip: "90029", category: "interiors", days: 0 },
  { id: "quinn-harper", name: "Quinn Harper", status: "invited", zip: "90068", category: "photo", days: 0 },
  { id: "sky-morales", name: "Sky Morales", status: "invited", zip: "90302", category: "events", days: 9 },
];

export const seedPeople = [...photoPeople, ...monogramPeople];

const emailFor = (name: string) => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
const dayIso = (daysAgo: number, hour = 15) => at(`10-${String(21 - daysAgo).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`);

/** The demo invite tokens, so the switcher and QA can open each invite state. */
export const DEMO_TOKENS = { valid: "riley-7q2m", used: "grace-3k8d", expired: "sky-9x4p", unknown: "not-a-real-invite" } as const;

export interface SeedState {
  people: Person[];
  invites: Invite[];
  drafts: ProfileDraft[];
  profiles: Profile[];
}

export function buildSeed(): SeedState {
  const people: Person[] = [];
  const invites: Invite[] = [];
  const drafts: ProfileDraft[] = [];
  const profiles: Profile[] = [];

  for (const s of seedPeople) {
    const invited = s.status === "invited";
    const updated = dayIso(s.days);
    const person: Person = {
      id: s.id,
      email: emailFor(s.name),
      // Invited people haven't told us their name yet; the waitlist only collected email and ZIP.
      name: invited ? "" : s.name,
      slug: invited ? "" : s.id,
      status: s.status,
      waitlistZip: s.zip,
      waitlistCategory: s.category,
      invitedAt: dayIso(Math.max(s.days, 0) + 1, 10),
      registeredAt: invited ? undefined : dayIso(s.days, 12),
      submittedAt: ["submitted", "changes_requested", "approved"].includes(s.status) ? dayIso(s.days, 14) : undefined,
      approvedAt: s.status === "approved" ? updated : undefined,
      updatedAt: updated,
      sample: true,
      reviewNotes: s.notes?.map(([section, note]) => ({ section, note, by: SAMPLE_OWNER.name, at: updated })),
    };
    people.push(person);

    const token = s.id === "riley-park" ? DEMO_TOKENS.valid : s.id === "grace-liu" ? DEMO_TOKENS.used : s.id === "sky-morales" ? DEMO_TOKENS.expired : `${s.id}-invite`;
    const createdAt = person.invitedAt;
    const expired = s.id === "sky-morales";
    invites.push({
      token, personId: s.id, email: person.email, createdAt,
      // Invites last 30 days. The expired sample was sent long ago.
      expiresAt: expired ? at("10-01T10:00") : at("11-20T10:00"),
      usedAt: invited ? undefined : person.registeredAt,
    });

    if (s.fields) {
      const fields: ProfileFields = { ...blankFields(s.name), imdb: s.status === "draft" && s.step === 0 ? "" : IMDB_SAMPLE, ...s.fields };
      drafts.push({ personId: s.id, fields, step: s.step ?? 4, savedAt: updated });
      if (person.submittedAt) profiles.push({ personId: s.id, fields, submittedAt: person.submittedAt, extras: s.extras });
    }
  }
  return { people, invites, drafts, profiles };
}

/* ---- Milestone 4: the waitlist and activity ---- */

const FIRST = ["Avery", "Blake", "Camila", "Dev", "Elliot", "Farah", "Gabe", "Harper", "Isa", "Jules", "Kai", "Lena", "Mateo", "Noor", "Oscar", "Paz", "Quincy", "Rae", "Soren", "Tess", "Uma", "Vic", "Wren", "Xavi", "Yara", "Zane", "Ines", "Rafael", "Bea", "Cyrus", "Dahlia", "Emre", "Fern", "Gus", "Hollis", "Ida", "Jasper", "Kit", "Lux", "Milo"];
const LAST = ["Abbott", "Banks", "Castillo", "Dorsey", "Ellison", "Fujita", "Garza", "Holm", "Ibarra", "Jensen", "Kaur", "Lindqvist", "Mendez", "Novak", "Ortega", "Pryor", "Quinn", "Rojas", "Sato", "Thorne", "Underwood", "Vance", "Whitaker", "Xu", "Yates", "Zamora", "Okoye", "Haddad", "Bianchi", "Moreau"];
const ZIPS = ["90026", "90027", "90028", "90029", "90036", "90039", "90042", "90046", "90065", "90068", "91501", "91505", "91601", "91604", "90401", "90034", "90016", "90012", "91101", "91203", "90291", "90066", "90019", "90004"];
const CATS = ["", "", "builds", "makeup", "hair", "wardrobe", "interiors", "photo", "events", "coaching", "venues", "archives", "other"];

/** Tiny deterministic PRNG, so every reset gives the same fictional waitlist. */
function prng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * About 500 fictional waitlist sign-ups (the client's real list is ~500), including the 24 seed people.
 * Emails are @example.com; joined between 20 Sep and 18 Oct 2026, like the live call sheet.
 */
export function buildWaitlist(people: Person[], total = 500) {
  const rand = prng(20261021);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const joined = () => new Date(Date.UTC(2026, 8, 20) + Math.floor(rand() * 28 * 86400000)).toISOString();
  const rows = people.map((p, i) => ({ id: `wl-${String(i).padStart(3, "0")}`, email: p.email, zip: p.waitlistZip, category: p.waitlistCategory, details: "", placement: "hero", createdAt: new Date(new Date(p.invitedAt).getTime() - (5 + Math.floor(rand() * 20)) * 86400000).toISOString() }));
  const used = new Set(rows.map((r) => r.email));
  for (let i = rows.length; rows.length < total; i++) {
    const f = pick(FIRST), l = pick(LAST);
    let email = `${f}.${l}`.toLowerCase() + "@example.com";
    for (let n = 2; used.has(email); n++) email = `${f}.${l}${n}`.toLowerCase() + "@example.com";
    used.add(email);
    rows.push({ id: `wl-${String(i).padStart(3, "0")}`, email, zip: pick(ZIPS), category: pick(CATS), details: "", placement: pick(["hero", "nav", "service", "footer", "profile-maya"]), createdAt: joined() });
  }
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Activity derived from the seed people's dates, newest first. */
export function buildActivity(people: Person[]) {
  const events: { id: string; kind: "invited" | "registered" | "submitted" | "approved" | "changes_requested"; personId: string; who: string; by?: string; at: string }[] = [];
  for (const p of people) {
    const who = p.name || p.email;
    events.push({ id: `a-${p.id}-inv`, kind: "invited", personId: p.id, who, by: SAMPLE_OWNER.name, at: p.invitedAt });
    if (p.registeredAt) events.push({ id: `a-${p.id}-reg`, kind: "registered", personId: p.id, who, at: p.registeredAt });
    if (p.submittedAt) events.push({ id: `a-${p.id}-sub`, kind: "submitted", personId: p.id, who, at: p.submittedAt });
    if (p.approvedAt) events.push({ id: `a-${p.id}-app`, kind: "approved", personId: p.id, who, by: SAMPLE_OWNER.name, at: p.approvedAt });
    if (p.status === "changes_requested") events.push({ id: `a-${p.id}-chg`, kind: "changes_requested", personId: p.id, who, by: SAMPLE_OWNER.name, at: p.updatedAt });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}
