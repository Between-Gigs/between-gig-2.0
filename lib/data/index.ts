/*
 * The one place the app picks its DataSource: the localStorage sample by default (the preview, `pnpm check`), or
 * with NEXT_PUBLIC_DATA_SOURCE=companyos the live one, which calls 2.0's server routes and through them Company OS
 * (lib/data/api.ts). Nothing in app/ or components/ depends on which.
 */
import { apiSource } from "./api";
import { sampleSource } from "./sample";
import type { DataSource } from "./source";

export const data: DataSource = process.env.NEXT_PUBLIC_DATA_SOURCE === "companyos" ? apiSource : sampleSource;

export type { DataSource } from "./source";
export * from "./types";
