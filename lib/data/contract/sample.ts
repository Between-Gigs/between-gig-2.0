import { sampleSource } from "../sample";
import { SAMPLE_OWNER } from "../seed";
import type { Harness } from "./harness";

/** The sample in Node: no localStorage, so its store lives in memory; demo.reset() puts the seed back. */
export function sampleHarness(): Harness {
  const source = sampleSource;
  return {
    target: "sample",
    source,
    reset: () => source.demo!.reset(),
    signIn: (email, name) => source.auth.syncExternal({ email, name, acceptedTerms: true }),
    async signInOwner() {
      const r = await source.auth.syncExternal({ email: SAMPLE_OWNER.email, name: SAMPLE_OWNER.name, role: "owner" });
      if (!r.ok) throw new Error(r.error);
      return r.session;
    },
    signOut: () => source.auth.signOut(),
  };
}
