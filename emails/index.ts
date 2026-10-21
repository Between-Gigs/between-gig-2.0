/*
 * Email templates as pure functions: props in, { subject, preheader, html, text } out. No React, no
 * DOM, so they run unchanged in the Worker / Supabase Edge Function that sends through Resend.
 * Previews: /emails and /emails/[name].
 */
import { invite, type InviteProps } from "./invite";
import { profileSubmitted, type ProfileSubmittedProps } from "./profile-submitted";
import { signInCode, type SignInCodeProps } from "./sign-in-code";
import { defaultContext, type EmailContext, type RenderedEmail } from "./layout";
import type { EmailTemplate } from "@/lib/data/types";

export type { EmailContext, RenderedEmail };
export { defaultContext };

interface TemplateInfo<P> {
  name: EmailTemplate;
  label: string;
  /** Who gets it and when. */
  when: string;
  render: (props: P, ctx?: EmailContext) => RenderedEmail;
  /** Fictional props for the preview. */
  sample: P;
}

export const emailTemplates = {
  invite: {
    name: "invite", label: "Invite", when: "To each waitlist sign-up when professional onboarding opens.",
    render: invite, sample: { inviteUrl: "https://between-gigs.com/join?invite=sample-token", email: "riley.park@example.com" },
  } satisfies TemplateInfo<InviteProps>,
  "sign-in-code": {
    name: "sign-in-code", label: "Sign-in code", when: "When someone asks to sign in with their email.",
    render: signInCode, sample: { code: "482913", email: "maya.chen@example.com", minutes: "10" },
  } satisfies TemplateInfo<SignInCodeProps>,
  "profile-submitted": {
    name: "profile-submitted", label: "Profile submitted", when: "Right after a Gigster submits their profile for review.",
    render: profileSubmitted, sample: { firstName: "Maya", profileUrl: "https://between-gigs.com/profile", editUrl: "https://between-gigs.com/profile/edit" },
  } satisfies TemplateInfo<ProfileSubmittedProps>,
} as const;

export const emailNames = Object.keys(emailTemplates) as EmailTemplate[];

/** Renders any template from loose props (the outbox stores them as strings). Missing props fall back to the sample. */
export function renderEmail(name: EmailTemplate, props: Record<string, string> = {}, ctx: EmailContext = defaultContext): RenderedEmail {
  const t = emailTemplates[name];
  const render = t.render as unknown as (p: Record<string, string>, c?: EmailContext) => RenderedEmail;
  return render({ ...(t.sample as Record<string, string>), ...props }, ctx);
}
