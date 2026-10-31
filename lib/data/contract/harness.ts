/*
 * The DataSource contract suite runs against the interface, never an implementation (rule E12). A harness supplies
 * the source and the few things outside the interface: a clean start, and who is signed in. With Clerk, signing in
 * happens in Clerk and then the app calls auth.syncExternal(); the harness does the Clerk part (the sample needs
 * none; live, Company OS's dev login stands in) and then calls syncExternal itself.
 *
 * CONTRACT_TARGET=live runs it against 2.0's server routes and a local Company OS (lib/data/contract/live.ts);
 * the default is the sample.
 */
import { it } from "vitest";
import type { DataSource } from "../source";
import type { Session, SyncExternalResult } from "../types";

export interface Harness {
  readonly target: "sample" | "live";
  readonly source: DataSource;
  /** Before each test. The sample starts from its seed; live keeps the tenant, and tests use fresh addresses. */
  reset(): Promise<void>;
  /** An invited person signs in (Clerk, then syncExternal). */
  signIn(email: string, name?: string): Promise<SyncExternalResult>;
  /** One of the owners signs in. */
  signInOwner(): Promise<Session>;
  signOut(): Promise<void>;
}

export async function harness(): Promise<Harness> {
  if (process.env.CONTRACT_TARGET === "live") return (await import("./live")).liveHarness();
  return (await import("./sample")).sampleHarness();
}

/** A test only one target can run: sample-only behaviour (the demo block, code sign-in) or a live-only rule (access). */
export const only = (h: Harness, target: Harness["target"]) => (h.target === target ? it : it.skip);
