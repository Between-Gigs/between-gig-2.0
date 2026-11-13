/*
 * /crew-call: the client's "Call sheet prototype", version 15 ("Testimonials + wording"), shared at
 * between-gigs.com/share/call-sheet?v=15. Words are theirs, verbatim. Images: the hero is the client's own
 * V15 originals sent by the client (public/art/crew-call: hero, badges, reviews, services/furniture). Service photos
 * not yet received use our sample photos; `image: null` shows the branded "photo coming" panel. Swap a path here
 * to replace one.
 */

export type CrewIcon =
  | "moving" | "carpentry" | "furniture" | "photography" | "location" | "events" | "hair" | "production" | "drivers"
  | "security" | "tech" | "script" | "painting" | "creative" | "audio" | "wardrobe" | "interior" | "video" | "catering";

export interface CrewService {
  id: string;
  title: string;
  line: string;
  icon: CrewIcon;
  /** Path under public/, or null for the placeholder panel. */
  image: string | null;
  /** The client's embroidered patch (public/art/crew-call/badges). */
  badge: string;
  /** Justin's Crew Call design (Figma "Wireframe flows", image 20): the one-line ask under the title. */
  short: string;
  /** The still-life object at the tile's right edge, cut from that design (public/art/crew-call/objects). */
  object: string;
}

export const hero = {
  eyebrow: "Between Gigs",
  title: ["Hollywood Talent.", "At Your Service."],
  lead: "Hire film and TV professionals for projects at home, at work, and beyond.",
  search: "How can we help you?",
  image: "art/crew-call/hero.jpg",
};

export const services: CrewService[] = [
  { id: "moving", title: "Moving & Muscle", line: "Big furniture. Heavy lifting. Crew strength for your next move.", icon: "moving", badge: "art/crew-call/badges/moving.webp", image: null, short: "Get help lifting and moving.", object: "art/crew-call/objects/moving.jpg" },
  { id: "carpentry", title: "Carpentry & Custom Builds", line: "From backyard sheds to custom shelves—put Hollywood's builders to work.", icon: "carpentry", badge: "art/crew-call/badges/carpentry.webp", image: "img/people/jordan-1.jpg", short: "Build shelves and custom pieces.", object: "art/crew-call/objects/carpentry.jpg" },
  { id: "furniture", title: "Furniture Assembly", line: "Skip the instruction manual. We'll turn those boxes into furniture.", icon: "furniture", badge: "art/crew-call/badges/furniture.webp", image: "art/crew-call/services/furniture.jpg", short: "Get flat-pack furniture assembled.", object: "art/crew-call/objects/furniture.jpg" },
  { id: "photography", title: "Photography", line: "Your people. Your products. Your big moments. Captured with a cinematic eye.", icon: "photography", badge: "art/crew-call/badges/photography.webp", image: "img/people/priya-5.jpg", short: "Capture portraits and events.", object: "art/crew-call/objects/photography.jpg" },
  { id: "location", title: "Location Scouting", line: "Find the perfect backdrop for your shoot, event or next big idea.", icon: "location", badge: "art/crew-call/badges/location.webp", image: "art/samples/cards/devon-work.jpg", short: "Find a venue for your next project.", object: "art/crew-call/objects/location.jpg" },
  { id: "events", title: "Events & Experiences", line: "Turn your party, launch or celebration into a production worth talking about.", icon: "events", badge: "art/crew-call/badges/events.webp", image: "art/samples/cards/renee-work.jpg", short: "Plan a party or launch.", object: "art/crew-call/objects/events.jpg" },
  { id: "hair", title: "Hair & Makeup", line: "Big night? Big day? Bring a little red-carpet magic to your chair.", icon: "hair", badge: "art/crew-call/badges/hair.webp", image: null, short: "Get ready for a special occasion.", object: "art/crew-call/objects/hair.jpg" },
  { id: "production", title: "Production Support", line: "Schedules, logistics, moving parts—handled by people who keep productions rolling.", icon: "production", badge: "art/crew-call/badges/production.webp", image: "img/people/sam-2.jpg", short: "Coordinate schedules and crew.", object: "art/crew-call/objects/production.jpg" },
  { id: "drivers", title: "Drivers & Transportation", line: "Get your people and gear where they need to be, right on cue.", icon: "drivers", badge: "art/crew-call/badges/drivers.webp", image: null, short: "Move people and gear.", object: "art/crew-call/objects/drivers.jpg" },
];

export const comingSoon: { id: string; title: string; icon: CrewIcon }[] = [
  { id: "security", title: "Security", icon: "security" },
  { id: "tech", title: "Tech Help", icon: "tech" },
  { id: "script", title: "Script & Story", icon: "script" },
  { id: "painting", title: "Painting & Murals", icon: "painting" },
  { id: "creative", title: "Creative Help", icon: "creative" },
  { id: "audio", title: "Audio & Music", icon: "audio" },
  { id: "wardrobe", title: "Wardrobe & Styling", icon: "wardrobe" },
  { id: "interior", title: "Interior Design", icon: "interior" },
  { id: "video", title: "Video Editing", icon: "video" },
  { id: "catering", title: "Catering & Food", icon: "catering" },
];

/** Sample testimonials from the prototype. Not customer reviews: the page labels each one Sample. */
export const testimonials = [
  { quote: "My new closet is incredible! The carpenter was a genius, and when I found out he worked on FRIENDS I was blown away. You can see the Hollywood quality in every detail.", name: "Jessica R.", kind: "Home Project", image: "art/crew-call/reviews/closet.jpg", avatar: "art/crew-call/reviews/jessica.jpg", title: "A custom closet", short: "The crew was organized, careful, and did an excellent job. My closet looks incredible." },
  { quote: "We hired a Blumhouse vet to design and build our annual corporate Halloween party and it was next level. Our team is still talking about it!", name: "Michael T.", kind: "Corporate Event", image: "art/crew-call/reviews/halloween.jpg", avatar: "art/crew-call/reviews/michael.jpg", title: "A Halloween event", short: "They helped bring our event to life, handling details smoothly and with real creativity." },
  { quote: "Our media room looks like it came straight from a set. The crew knew exactly what they were doing, professional, creative, and so easy to work with. Highly recommend!", name: "Sarah L.", kind: "Home Renovation", image: "art/crew-call/reviews/media-room.jpg", avatar: "art/crew-call/reviews/sarah.jpg", title: "A home screening room", short: "Professional, flexible, and easy to work with. The screening room turned out fantastic." },
];
