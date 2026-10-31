import type { Harness } from "./harness";

/** The live harness: 2.0's server routes against a local Company OS. Wired with lib/data/api.ts. */
export async function liveHarness(): Promise<Harness> {
  throw new Error("The live harness needs lib/data/api.ts and the server routes");
}
