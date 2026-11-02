/*
 * The one place the app picks its DataSource: the localStorage sample by default (the preview, `pnpm check`), or
 * with NEXT_PUBLIC_DATA_SOURCE=api the live one, which calls 2.0's server routes and through them Company OS
 * (lib/data/api.ts). Nothing in app/ or components/ depends on which.
 */
import { selected } from "@/lib/data/selected";
import type { DataSource } from "./source";

// A live build swaps "@/lib/data/selected" for the api-only module (next.config.ts), so the sample isn't bundled.
export const data: DataSource = selected;

export type { DataSource } from "./source";
export * from "./types";
