import type {
  EmailTemplate, ExternalIdentity, InviteLookup, OutboxEmail, PeopleQuery, Person, PersonSummary, PrivacyRequest, Profile, ProfileDraft,
  ProfileFields, RegisterResult, RequestCodeResult, Role, Session, SignInResult, SyncExternalResult, SketchKind, SketchSubmission,
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
    /** Browser-only sample registration. An invite is optional; new accounts are always Gigsters. */
    register(input: { token?: string; email?: string; name: string; acceptTerms: boolean }): Promise<RegisterResult>;
    /** Sends a 6-digit sign-in code by email (queues a "sign-in-code" email). */
    requestCode(email: string): Promise<RequestCodeResult>;
    verifyCode(email: string, code: string): Promise<SignInResult>;
    /**
     * Opens a session for an identity Clerk has verified, creating a Gigster record on first sign-in.
     * Optional invites are attributed only when valid and matched to the verified email.
     */
    syncExternal(identity: ExternalIdentity): Promise<SyncExternalResult>;
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
    /**
     * The builder's photo step: stores the image and returns what goes in `fields.photo` (a data URL in the sample;
     * live, the photo is uploaded to the person's profile at once and this is its /media link).
     */
    uploadPhoto?(personId: string, file: Blob): Promise<string>;
  };

  emails: {
    outbox(): Promise<OutboxEmail[]>;
    get(id: string): Promise<OutboxEmail | null>;
    queue(template: EmailTemplate, to: string, props: Record<string, string>): Promise<OutboxEmail>;
  };

  /** The public funnel (Milestone 3). Each call maps to an existing route in the live app; see docs/handoff/milestone-3.md. */
  funnel: {
    /** Step 1 of "Get on the call sheet": email + ZIP (+ category from the card that opened it). Queues the welcome email. */
    /** `website` is the form's honeypot (components/funnel/Honeypot.tsx): only bots fill it, and live drops what they send. */
    joinWaitlist(input: { email: string; zip: string; category?: string; placement: string; website?: string }): Promise<WaitlistResult>;
    /** Step 2 (optional): service category and "What would you offer?". */
    /** `signupId` is the id joinWaitlist returned (live: a short-lived signed token). `website` is the honeypot. */
    addDetails(signupId: string, input: { category: string; details: string; website?: string }): Promise<WaitlistSignup>;
    /** Storyboard forms. Queues the coming-soon email. `answers.website` is the honeypot. */
    submitSketch(kind: SketchKind, answers: Record<string, string>): Promise<SketchSubmission>;
    privacyRequest(email: string, message: string, website?: string): Promise<PrivacyRequest>;
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
    /**
     * Sample only. Undoes the last approve or request-changes on this person, right after it: back to submitted,
     * notes cleared, the decision's activity line and its still-queued email withdrawn. Live, the review toast holds
     * the decision for a few seconds instead, and Undo cancels it before anything is sent (decision N-10).
     */
    undoReview?(personId: string): Promise<Person>;
    waitlist(query?: WaitlistQuery): Promise<WaitlistRow[]>;
    /** Invites waitlist sign-ups: creates the person and invite, queues the invite email. Skips anyone already invited. */
    /** Live: invites again people invited but not signed up yet; Company OS revokes their older link. At most 10 a call. */
    resendInvite?(personIds: string[]): Promise<{ invited: number; skipped: number; failed?: number }>;
    /** At most 10 sign-ups a call live (the waitlist sends bigger selections in chunks). */
    invite(signupIds: string[]): Promise<{ invited: number; skipped: number; /** Live: invitations that failed (none were sent). */ failed?: number }>;
  };

  /** Sample-only controls for the Preview guide and QA. The live implementation omits them. */
  demo?: {
    reset(): Promise<void>;
    signInAs(role: Role | "invited", personId?: string): Promise<{ inviteToken?: string }>;
    /** Makes the demo invite usable again without touching who is signed in (Studio's Live site preview). */
    rearmInvite(): Promise<void>;
    /** The code the sample "sent", so the login page can show it in place of an inbox. */
    peekCode(email: string): Promise<string | null>;
    /** Makes the pending code expire now, to show the expired state. */
    expireCode(email: string): Promise<void>;
    tokens(): Promise<{ valid: string; used: string; expired: string; unknown: string }>;
  };
}
