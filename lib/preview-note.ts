import type { DataSource } from "@/lib/data/source";

/** The footer's sample-data note and preview link: only where the data is the sample, never on a live site. */
export const showsPreviewNote = (kind: DataSource["kind"]) => kind === "sample";
