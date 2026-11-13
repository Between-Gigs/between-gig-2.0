import { data } from "@/lib/data";
import { staffClient } from "./client";
import { sampleStaff } from "./sample";

export const staff = data.kind === "live" ? staffClient : sampleStaff;
