import { serviceCategory, serviceCatalogue, serviceLabel } from "./service-catalogue";
import { serviceChoices } from "@/lib/data/taxonomy";

/** Approved category taglines for profile context. Full example descriptions live in service-catalogue. */
export const serviceDescriptions: Record<string, string> = {
  ...Object.fromEntries(serviceCatalogue.map(c => [c.value, c.tagline])),
  "Wardrobe & Laundry Care": "Garment care at home: laundering, steaming, mending and storing clothes so they last.",
  "Events & Organization": "Planning and running small events: timelines, vendors and the day itself.",
  "Venue & Location Scouting": "Finding and comparing venues or locations against a brief, budget and access needs.",
};

export function serviceDescription(service: string): string {
  return serviceCategory(service)?.tagline ?? serviceDescriptions[service] ?? "";
}

export const describedServices = (source: "sample" | "live") => serviceChoices(source).map(name => ({ name: serviceLabel(name), description: serviceDescription(name) }));
