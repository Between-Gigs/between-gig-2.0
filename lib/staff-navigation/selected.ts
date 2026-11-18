import { data } from "@/lib/data";
import { navigationClient } from "./client";
import { sampleNavigation } from "./sample";
export const staffNavigation = data.kind === "live" ? navigationClient : sampleNavigation;
