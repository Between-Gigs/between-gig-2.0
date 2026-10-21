/*
 * The approved Storyboard (imagine-os/between-gigs public/design-locks/approved-2026-09-27/storyboard.html):
 * its pages, in book order, and its two forms. Artwork is unchanged, served from public/art/storyboard/.
 */

export type ScenePageType = "cover" | "solo" | "crew";
export type SceneCustomer = "cover" | "individual" | "business";

export interface ScenePage { file: string; title: string; place: string; type: ScenePageType; customer: SceneCustomer; story: string }

export const scenePages: ScenePage[] = [
  {
   "file": "front-cover.jpg",
   "title": "Between Gigs",
   "place": "Open the book",
   "type": "cover",
   "customer": "cover",
   "story": "Real production talent, ready for everyday life and business."
  },
  {
   "file": "solo-editor.jpg",
   "title": "Turn family archives into a film",
   "place": "Editor · one person",
   "type": "solo",
   "customer": "individual",
   "story": "A family brought decades of footage; an editor shaped it into one beautiful keepsake."
  },
  {
   "file": "solo-actor-coach.jpg",
   "title": "Walk into the room with confidence",
   "place": "Acting coach · one person",
   "type": "solo",
   "customer": "individual",
   "story": "An acting coach helps a corporate employee turn a routine presentation into a confident performance that holds the room’s attention."
  },
  {
   "file": "solo-carpenter.jpg",
   "title": "Build the nook you cannot buy",
   "place": "Scenic carpenter · one person",
   "type": "solo",
   "customer": "individual",
   "story": "A renter imagined a reading nook; a scenic carpenter made it fit like it had always belonged."
  },
  {
   "file": "solo-prop-stylist.jpg",
   "title": "Make a storefront tell its story",
   "place": "Prop stylist · one person",
   "type": "solo",
   "customer": "business",
   "story": "A shop owner had one quiet window; a prop stylist turned it into a reason to stop."
  },
  {
   "file": "solo-writer.jpg",
   "title": "Find the words for work that matters",
   "place": "Writer · one person",
   "type": "solo",
   "customer": "business",
   "story": "A nonprofit knew its mission; a screenwriter found the words that made people feel it."
  },
  {
   "file": "solo-pa.jpg",
   "title": "Keep a complicated move on track",
   "place": "Production assistant · one person",
   "type": "solo",
   "customer": "individual",
   "story": "A household faced moving-day chaos; a production assistant kept every person and box on cue."
  },
  {
   "file": "solo-costume.jpg",
   "title": "Give a treasured wardrobe another life",
   "place": "Costume designer · one person",
   "type": "solo",
   "customer": "individual",
   "story": "A collector had beloved pieces; a costume designer repaired, styled, and returned them to use."
  },
  {
   "file": "solo-sound.jpg",
   "title": "Make a small podcast sound generous",
   "place": "Sound technician · one person",
   "type": "solo",
   "customer": "business",
   "story": "A founder had a strong voice but a noisy room; a sound technician made the conversation shine."
  },
  {
   "file": "solo-animal.jpg",
   "title": "Help the family dog learn with care",
   "place": "Animal handler · one person",
   "type": "solo",
   "customer": "individual",
   "story": "A newly adopted dog needed patience; an animal handler helped the whole family find a rhythm."
  },
  {
   "file": "build-the-impossible.jpg",
   "title": "Turn an empty room into a world",
   "place": "Production design · scenic crew",
   "type": "crew",
   "customer": "business",
   "story": "A retailer needed a pop-up overnight; a production designer and scenic crew built the world."
  },
  {
   "file": "shape-the-story.jpg",
   "title": "Find the story hiding in your idea",
   "place": "Writing · acting · editing crew",
   "type": "crew",
   "customer": "business",
   "story": "A small team had a big idea; writers, performers, and an editor made it clear and memorable."
  },
  {
   "file": "assemble-the-crew.jpg",
   "title": "Bring a public gathering to life",
   "place": "Events · sound · staffing crew",
   "type": "crew",
   "customer": "business",
   "story": "A neighborhood planned a street day; event, sound, and staffing pros made it effortless."
  },
  {
   "file": "home-transformation.jpg",
   "title": "A child’s bedroom that’s out of this world",
   "place": "Set builders · production designers",
   "type": "crew",
   "customer": "individual",
   "story": "They built other worlds for the screen. Now they can build one for you."
  },
  {
   "file": "bakery-launch.jpg",
   "title": "Help a small business look irresistible",
   "place": "Food styling · photo crew",
   "type": "crew",
   "customer": "business",
   "story": "A bakery made wonderful things; food stylists and photographers helped everyone see it."
  },
  {
   "file": "school-fundraiser.jpg",
   "title": "Give a community story a stage",
   "place": "School · nonprofit crew",
   "type": "crew",
   "customer": "business",
   "story": "A school needed its fundraiser to connect; producers and performers gave the community a stage."
  },
  {
   "file": "family-logistics.jpg",
   "title": "Keep a complicated family day moving",
   "place": "Pets · moving · event crew",
   "type": "crew",
   "customer": "individual",
   "story": "A family had too much happening at once; a nimble crew handled pets, arrivals, and every detail."
  },
  {
   "file": "business-launch.jpg",
   "title": "Turn an office update into an event",
   "place": "Business launch crew",
   "type": "crew",
   "customer": "business",
   "story": "A company had news worth celebrating; a production crew turned an update into an occasion."
  },
  {
   "file": "backyard-wedding.jpg",
   "title": "Make a personal milestone cinematic",
   "place": "Celebration crew",
   "type": "crew",
   "customer": "individual",
   "story": "A couple wanted warmth without spectacle; a small film crew made the backyard feel magical."
  },
  {
   "file": "back-cover.jpg",
   "title": "The next page is yours",
   "place": "Close the book",
   "type": "cover",
   "customer": "cover",
   "story": "Sketch the need. We will help cast the right person or crew."
  }
] as ScenePage[];

export interface PlanField { name: string; label: string; placeholder?: string; type?: string; autocomplete?: string; max: number; optional?: boolean; control?: "textarea" | "select"; wide?: boolean; options?: string[] }
export interface Plan { eyebrow: string; title: string; button: string; intro: string; saved: string; fields: PlanField[] }

export const plans: Record<"talent" | "buyer", Plan> = {
  talent: {
    eyebrow: "For entertainment professionals", title: "Tell us what you offer", button: "Save my professional interest", saved: "Your professional interest is saved.",
    intro: "Share the skills you would like to offer beyond the set. This helps us plan professional onboarding; it does not publish a profile.",
    fields: [
      { name: "name", label: "Your name", placeholder: "e.g. Sam Rivera", autocomplete: "name", max: 120 },
      { name: "email", label: "Email for follow-up", placeholder: "you@example.com", type: "email", autocomplete: "email", max: 254 },
      { name: "role", label: "Your entertainment role or craft", placeholder: "e.g. editor, actor, scenic carpenter", max: 200 },
      { name: "services", label: "What services would you like to offer?", placeholder: "Describe the work you could do for people or businesses.", control: "textarea", wide: true, max: 1200 },
      { name: "location", label: "Where can you work?", placeholder: "City, ZIP, remote, or travel radius", autocomplete: "address-level2", max: 200 },
      { name: "availability", label: "When are you available?", placeholder: "e.g. weekdays between shoots", max: 200 },
      { name: "rate", label: "Rate or preferred range", optional: true, max: 200 },
      { name: "details", label: "Anything else we should know?", placeholder: "Experience, interests, or the kind of work you want next.", control: "textarea", wide: true, optional: true, max: 1200 },
    ],
  },
  buyer: {
    eyebrow: "For people and businesses", title: "Tell us what you need", button: "Save my project request", saved: "Your project request is saved.",
    intro: "Describe the outcome you need, even if you do not know which entertainment professional could help. This saves an early request; it is not a booking.",
    fields: [
      { name: "name", label: "Your name or business", placeholder: "e.g. Alex or Field House", autocomplete: "name", max: 120 },
      { name: "email", label: "Email for follow-up", placeholder: "you@example.com", type: "email", autocomplete: "email", max: 254 },
      { name: "project", label: "What do you need help with?", placeholder: "Describe the task, project, or outcome.", control: "textarea", wide: true, max: 1200 },
      { name: "location", label: "Where will the work happen?", placeholder: "City, ZIP, or remote", autocomplete: "address-level2", max: 200 },
      { name: "timing", label: "When do you need it?", placeholder: "A date, timeframe, or \u201cflexible\u201d", max: 200 },
      { name: "team_size", label: "How much help do you expect?", control: "select", options: ["Not sure yet", "One person", "A small team", "A full crew"], max: 80 },
      { name: "budget", label: "Budget or preferred range", optional: true, max: 200 },
      { name: "details", label: "Anything else we should know?", placeholder: "Priorities, constraints, access, or what success looks like.", control: "textarea", wide: true, optional: true, max: 1200 },
    ],
  },
};
