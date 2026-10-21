/* Sent when an owner suggests edits. One short note per section, never a thread. Copy: proposal. */
import { light } from "./tokens";
import { button, defaultContext, esc, FONT_UI, hero, layout, p, section, signature, textFooter, type EmailContext, type RenderedEmail } from "./layout";

export interface ChangesRequestedProps {
  firstName: string;
  /** One note per line, "section|note". Sections: about, skills, where, story. */
  notes: string;
  editUrl: string;
}

const REASON = "You're receiving this because you submitted a profile on Between Gigs.";
const sectionLabel: Record<string, string> = { about: "About you", skills: "Skills & services", where: "Where & when", story: "Your story" };

export const parseNotes = (notes: string) => notes.split("\n").filter(Boolean).map((line) => {
  const [section, ...rest] = line.split("|");
  return { section: sectionLabel[section] ?? section, note: rest.join("|") };
});

export function changesRequested({ firstName, notes, editUrl }: ChangesRequestedProps, ctx: EmailContext = defaultContext): RenderedEmail {
  const name = firstName.trim() || "there";
  const list = parseNotes(notes);
  const subject = `A few small changes to your profile, ${name}`;
  const preheader = `We've read your profile and have ${list.length === 1 ? "one suggestion" : `${list.length} suggestions`} before it goes live.`;
  const cards = list.map((n) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px"><tr>
<td class="e-sunken" bgcolor="${light.surfaceSunken}" style="background-color:${light.surfaceSunken};border:1px solid ${light.line};border-radius:12px;padding:14px 16px;font-family:${FONT_UI}">
<p class="e-brand" style="margin:0 0 4px;font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${light.inkBrand}">${esc(n.section)}</p>
<p class="e-ink" style="margin:0;font-size:15px;line-height:22px;color:${light.ink}">${esc(n.note)}</p>
</td></tr></table>`).join("");
  const body = [
    hero({ eyebrow: "Suggested edits", title: "Almost ready,", accent: `${name}.` }),
    section([
      p("Thank you for your profile. We've read it carefully and have a few small suggestions before it goes live:"),
      cards,
      button(editUrl, "Update my profile"),
      p("Your answers are saved, so you only need to change these parts. Then submit again and we'll take another look.", { muted: true, size: 15 }),
      signature(),
      p("", { mb: 16 }),
    ].join("")),
  ].join("");
  const text = `${subject}

Almost ready, ${name}.

Thank you for your profile. We've read it carefully and have a few small suggestions before it goes live:

${list.map((n) => `${n.section.toUpperCase()}\n${n.note}`).join("\n\n")}

Update my profile:
${editUrl}

Your answers are saved, so you only need to change these parts. Then submit again and we'll take another look.

Patti & Peter
Founders, Between Gigs

${textFooter(REASON, ctx.siteUrl)}`;
  return { subject, preheader, html: layout({ title: subject, preheader, body, reason: REASON, ctx }), text };
}
