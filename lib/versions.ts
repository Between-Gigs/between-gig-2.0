import list from "./versions.json";

/**
 * The site's design versions, newest first (lib/versions.json is the one source: the Pages workflow reads it to
 * build each older version from its own commit at <base>/v/<n>/, and the deploy copies it to <base>/versions.json for the older versions' switcher).
 */
export type SiteVersion = { n: number; name: string; date: string; current?: boolean; commit?: string; summary: string; highlights: string[] };
export const versions: SiteVersion[] = list;
export const currentVersion = versions.find((v) => v.current)!;

/** Older versions are only published on the Pages preview (NEXT_PUBLIC_VERSIONS=1), never on a live site. */
export const olderVersionsOnline = process.env.NEXT_PUBLIC_VERSIONS === "1";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** The same page in another version: a full page load, since each older version is its own app. */
export const versionUrl = (v: SiteVersion, path = "/") => `${BASE}${v.current ? "" : `/v/${v.n}`}${path.startsWith("/") ? path : `/${path}`}`;
