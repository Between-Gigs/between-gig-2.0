/*
 * The standard description of each service category (Patti, 13 Nov 2026): one short line, the same for every Gigster
 * who offers it, so clients can compare like with like. The Gigster adds their own one line beside it ("what you'll
 * do", ProfileFields.serviceLines). Gigsters can't edit these (open question for Justin and Patti; default: no).
 * Keyed by the service names in lib/data/taxonomy.ts (offSetServices, plus the two call-sheet categories the sample uses).
 */
import { serviceChoices } from "@/lib/data/taxonomy";

export const serviceDescriptions: Record<string, string> = {
  "Wardrobe & Personal Styling": "Help choosing, editing and organizing clothes, from a closet refresh to outfits for an occasion.",
  "Wardrobe & Laundry Care": "Garment care at home: laundering, steaming, mending and storing clothes so they last.",
  "Furniture & Creative Builds": "Custom furniture, repairs and one-off builds, from a measured sketch to the finished piece.",
  "Beauty & Personal Styling": "A polished look for a day that matters: styling, grooming and finishing touches.",
  "Makeup Services": "Makeup for events, photos and special occasions, applied on location.",
  "Hair Styling": "Cuts, styling and updos for events, photos and everyday looks.",
  "Interior Styling": "Rooms arranged, styled and sourced so a space works and feels like you.",
  "Event Styling": "Decor, tables and atmosphere for parties and gatherings, from plan to setup.",
  "Photography & Portraits": "Portraits, family and product photos, shot and edited to an agreed brief.",
  "Lighting Design": "Lighting planned and set up for a home, an event or a shoot.",
  "Events & Organization": "Planning and running small events: timelines, vendors and the day itself.",
  "Venue & Location Scouting": "Finding and comparing venues or locations against a brief, budget and access needs.",
};

/** The standard description for a service, or "" for a category without one (an older or custom answer). */
export function serviceDescription(service: string): string {
  return serviceDescriptions[service] ?? "";
}

/** Every service a Gigster can pick, each with its description. */
export const describedServices = (source: "sample" | "live") => serviceChoices(source).map((name) => ({ name, description: serviceDescription(name) }));
