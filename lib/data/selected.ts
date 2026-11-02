/*
 * Which DataSource this build uses: the sample by default, the live one with NEXT_PUBLIC_DATA_SOURCE=api. A live
 * build replaces this module with selected.live.ts (next.config.ts, turbopack.resolveAlias), so the sample store and
 * its made-up people never reach a live visitor (scripts/check-split.mjs). Tests and the Pages build use this one.
 */
import { apiSource } from "./api";
import { sampleSource } from "./sample";
import type { DataSource } from "./source";

export const selected: DataSource = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? apiSource : sampleSource;
