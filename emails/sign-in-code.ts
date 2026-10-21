/* The 6-digit sign-in code. Transactional: no marketing, one job. */
import { light } from "./tokens";
import { defaultContext, esc, FONT_MONO, hero, layout, p, section, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface SignInCodeProps {
  code: string;
  email: string;
  /** Minutes until the code expires. */
  minutes: string;
}

const REASON = "You're receiving this because someone asked to sign in to Between Gigs with this email address.";

export function signInCode({ code, email, minutes }: SignInCodeProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const subject = `${code} is your Between Gigs sign-in code`;
  const preheader = `It expires in ${minutes} minutes and works once.`;
  const spaced = code.split("").join(" ");
  const box = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr>
<td align="center" class="e-sunken" bgcolor="${light.surfaceSunken}" style="background-color:${light.surfaceSunken};border:1px solid ${light.line};border-radius:14px;padding:22px 12px">
<p class="e-ink" style="margin:0;font-family:${FONT_MONO};font-size:36px;line-height:44px;font-weight:500;letter-spacing:0.18em;color:${light.ink}" aria-label="Sign-in code ${esc(spaced)}">${esc(code)}</p>
</td></tr></table>`;
  const body = [
    hero({ eyebrow: "Sign in", title: "Here's your sign-in code." }),
    section([
      p(`Enter this code on the Between Gigs sign-in page to continue as <b>${esc(email)}</b>.`),
      box,
      p(`It expires in ${esc(minutes)} minutes and works once. If it runs out, ask for a new one on the sign-in page.`, { muted: true, size: 15 }),
      p("Didn't ask for this? You can ignore this email. No one can sign in without the code.", { muted: true, size: 15, mb: 32 }),
    ].join("")),
  ].join("");
  const text = `${subject}

Here's your sign-in code: ${code}

Enter it on the Between Gigs sign-in page to continue as ${email}.

It expires in ${minutes} minutes and works once. If it runs out, ask for a new one on the sign-in page.

Didn't ask for this? You can ignore this email. No one can sign in without the code.

${textFooter(REASON, ctx.siteUrl)}`;
  return { subject, preheader, html: layout({ title: subject, preheader, body, reason: REASON, ctx }), text };
}
