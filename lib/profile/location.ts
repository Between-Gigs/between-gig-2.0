import type { ProfileFields } from "@/lib/data/types";

/**
 * The profile's Location: LA areas, or the city outside LA. A public page never knows that city (Company OS's
 * public_reader doesn't see `home_city`), so it says "Another market", as the search card does.
 */
export const locationLabel = (f: Pick<ProfileFields, "market" | "areas" | "otherCity">) =>
  f.market === "la" ? `${f.areas.join(" · ") || "Los Angeles"}, Los Angeles area` : f.otherCity || "Another market";
