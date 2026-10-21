/*
 * The one place the app picks its DataSource. Today: the localStorage sample.
 * Anu: replace this export with the live implementation (a fetch client for the Worker API) and
 * nothing else in app/ or components/ needs to change. See docs/handoff/data-layer.md.
 */
import { sampleSource } from "./sample";
import type { DataSource } from "./source";

export const data: DataSource = sampleSource;

export type { DataSource } from "./source";
export * from "./types";
