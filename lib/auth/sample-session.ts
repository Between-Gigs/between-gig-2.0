import type { DataSource } from "../data/source";
import type { Session } from "../data/types";

/** A person explicitly selected, registered or signed in locally in the browser-only sample app. */
export function isLocalSampleSession(source: DataSource["kind"], session: Session | null) {
  return source === "sample" && !!session && session.via !== "clerk";
}
