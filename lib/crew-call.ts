/*
 * /crew-call: the client's "Call sheet prototype", version 15 ("Testimonials + wording"), shared at
 * between-gigs.com/share/call-sheet?v=15. Words are theirs, verbatim. Images: the hero is the client's own
 * prototype photo (imagine-os/between-gigs public/prototypes/claude-design/assets/hero-help2.jpg); the rest are
 * our sample photos standing in until the client sends the V15 originals. Swap a path here to replace one;
 * `image: null` shows the branded "photo coming" panel.
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
}

export const hero = {
  eyebrow: "Between Gigs",
  title: ["Hollywood Talent.", "At Your Service."],
  lead: "Hire the skilled professionals behind your favorite movies and TV shows for projects at home, at work, and beyond.",
  search: "How can we help you?",
  image: "art/crew-call/hero.jpg",
};

export const services: CrewService[] = [
  { id: "moving", title: "Moving & Muscle", line: "Big furniture. Heavy lifting. Crew strength for your next move.", icon: "moving", image: null },
  { id: "carpentry", title: "Carpentry & Custom Builds", line: "From backyard sheds to custom shelves—put Hollywood's builders to work.", icon: "carpentry", image: "img/people/jordan-1.jpg" },
  { id: "furniture", title: "Furniture Assembly", line: "Skip the instruction manual. We'll turn those boxes into furniture.", icon: "furniture", image: "img/people/jordan-4.jpg" },
  { id: "photography", title: "Photography", line: "Your people. Your products. Your big moments. Captured with a cinematic eye.", icon: "photography", image: "img/people/priya-5.jpg" },
  { id: "location", title: "Location Scouting", line: "Find the perfect backdrop for your shoot, event or next big idea.", icon: "location", image: "art/samples/cards/devon-work.jpg" },
  { id: "events", title: "Events & Experiences", line: "Turn your party, launch or celebration into a production worth talking about.", icon: "events", image: "art/samples/cards/renee-work.jpg" },
  { id: "hair", title: "Hair & Makeup", line: "Big night? Big day? Bring a little red-carpet magic to your chair.", icon: "hair", image: null },
  { id: "production", title: "Production Support", line: "Schedules, logistics, moving parts—handled by people who keep productions rolling.", icon: "production", image: "img/people/sam-2.jpg" },
  { id: "drivers", title: "Drivers & Transportation", line: "Get your people and gear where they need to be, right on cue.", icon: "drivers", image: null },
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
  { quote: "My new closet is incredible! The carpenter was a genius, and when I found out he worked on FRIENDS I was blown away. You can see the Hollywood quality in every detail.", name: "Jessica R.", kind: "Home Project", image: "img/people/maya-3.jpg" },
  { quote: "We hired a Blumhouse vet to design and build our annual corporate Halloween party and it was next level. Our team is still talking about it!", name: "Michael T.", kind: "Corporate Event", image: "img/people/priya-1.jpg" },
  { quote: "Our media room looks like it came straight from a set. The crew knew exactly what they were doing, professional, creative, and so easy to work with. Highly recommend!", name: "Sarah L.", kind: "Home Renovation", image: "art/samples/cards/simone-work.jpg" },
];
