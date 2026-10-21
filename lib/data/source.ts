import type {
  EmailTemplate, InviteLookup, OutboxEmail, PeopleQuery, Person, PersonSummary, PrivacyRequest, Profile, ProfileDraft,
  ProfileFields, RegisterResult, RequestCodeResult, Role, Session, SignInResult, SketchKind, SketchSubmission,
  WaitlistResult, WaitlistSignup, ActivityEvent, DashboardSummary, ReviewNoteInput, WaitlistQuery, WaitlistRow,
} from "./types";

/**
 * Everything the UI reads or writes goes through this interface. Every method is async so the
 * production implementation can be a fetch to the Worker API without touching a single component.
 * Method-by-method backend mapping: docs/handoff/data-layer.md.
 */
export interface DataSource {
  /** Which implementation this is. The UI shows a "Fictional sample" flag when it is "sample". */
  readonly kind: "sample" | "live";

  people: {
    /** Owner only. Filters, searches and sorts everyone from the waitlist on. */
    list(query?: PeopleQuery): Promise<PersonSummary[]>;
    /** Owner, or the person themself. */
    get(id: string): Promise<PersonSummary | null>;
    /** Public: only approved people resolve; anyone else returns { person, profile: null }. */
    getPublic(slug: string): Promise<{ person: Person | null; profile: Profile | null }>;
    /** Approved people other than this one, for "You might also like". */
    similar(id: string, limit?: number): Promise<{ person: Person; profile: Profile }[]>;
  };

  invites: {
    /** Resolves the token from the invite email's "Create your profile" link. */
    lookup(token: string): Promise<InviteLookup>;
  };

  auth: {
    session(): Promise<Session | null>;
    /** Uses the invite: creates the account (status invited → registered) and signs them in. */
    register(input: { token: string; name: string; acceptTerms: boolean }): Promise<RegisterResult>;
    /** Sends a 6-digit sign-in code by email (queues a "sign-in-code" email). */
    requestCode(email: string): Promise<RequestCodeResult>;
    verifyCode(email: string, code: string): Promise<SignInResult>;
    signOut(): Promise<void>;
    /** Subscribes to session changes (sign in / out, demo role switches). Returns an unsubscribe. */
    onChange(listener: () => void): () => void;
  };

  profiles: {
    getDraft(personId: string): Promise<ProfileDraft | null>;
    /** Autosave. Moves registered → draft on the first save. Never changes a submitted profile. */
    saveDraft(personId: string, fields: ProfileFields, step: number): Promise<ProfileDraft>;
    /** Freezes the draft as the profile, sets status submitted, queues the confirmation email. */
    submit(personId: string): Promise<{ person: Person; profile: Profile }>;
    getProfile(personId: string): Promise<Profile | null>;
  };

  emails: {
    outbox(): Promise<OutboxEmail[]>;
    get(id: string): Promise<OutboxEmail | null>;
    queue(template: EmailTemplate, to: string, props: Record<string, string>): Promise<OutboxEmail>;
  };

  /** The public funnel (Milestone 3). Each call maps to an existing route in the live app; see docs/handoff/milestone-3.md. */
  funnel: {
    /** Step 1 of "Get on the call sheet": email + ZIP (+ category from the card that opened it). Queues the welcome email. */
    joinWaitlist(input: { email: string; zip: string; category?: string; placement: string }): Promise<WaitlistResult>;
    /** Step 2 (optional): service category and "What would you offer?". */
    addDetails(signupId: string, input: { category: string; details: string }): Promise<WaitlistSignup>;
    /** Storyboard forms. Queues the coming-soon email. */
    submitSketch(kind: SketchKind, answers: Record<string, string>): Promise<SketchSubmission>;
    privacyRequest(email: string, message: string): Promise<PrivacyRequest>;
  };

  /** The owners' tools (Milestone 4). Owner role required on every call. */
  owners: {
    dashboard(): Promise<DashboardSummary>;
    activity(limit?: number): Promise<ActivityEvent[]>;
    /** Submitted profiles, oldest first. */
    reviewQueue(): Promise<PersonSummary[]>;
    /** submitted → approved. Publishes /p/[slug] and queues the "approved" email. */
    approve(personId: string): Promise<Person>;
    /** submitted → changes_requested, with one short note per section. Queues the "changes-requested" email. */
    requestChanges(personId: string, notes: ReviewNoteInput[]): Promise<Person>;
    waitlist(query?: WaitlistQuery): Promise<WaitlistRow[]>;
    /** Invites waitlist sign-ups: creates the person and invite, queues the invite email. Skips anyone already invited. */
    invite(signupIds: string[]): Promise<{ invited: number; skipped: number }>;
  };

  /** Sample-only controls for the demo switcher. The live implementation omits them. */
  demo?: {
    reset(): Promise<void>;
    signInAs(role: Role | "invited", personId?: string): Promise<{ inviteToken?: string }>;
    /** The code the sample "sent", so the login page can show it in place of an inbox. */
    peekCode(email: string): Promise<string | null>;
    /** Makes the pending code expire now, to show the expired state. */
    expireCode(email: string): Promise<void>;
    tokens(): Promise<{ valid: string; used: string; expired: string; unknown: string }>;
  };
}
