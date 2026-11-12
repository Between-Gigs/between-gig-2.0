/*
 * Template · Confirmation (Figma: DS · Patterns → Profile submitted). One centred card on the still-life photo: a check
 * in a mint circle, a serif title, what happens next as short numbered steps, one primary action and a quiet link
 * back. Used where a Gigster lands once their profile is with the team (components/profile/MyProfile).
 */
import { cx } from "@ds/components/cx";
import { Check } from "lucide-react";
import type * as React from "react";
import { Heading, Text, TextLink } from "../atoms";
import { PhotoStage } from "../organisms";

export function ConfirmationTemplate({ title, lead, eyebrow, steps, action, back, className }: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** A small status line above the title ("Sent May 4"). */
  eyebrow?: React.ReactNode;
  /** What happens next, in order. */
  steps: { title: React.ReactNode; body?: React.ReactNode }[];
  /** The primary button (a ButtonLink or Button). */
  action: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <PhotoStage className="min-h-full">
      <div className="mx-auto grid w-full max-w-7xl place-items-center px-4 py-12 sm:px-6 lg:min-h-160 lg:py-16">
        <section aria-labelledby="confirm-h" className={cx("grid w-full max-w-lg justify-items-center gap-6 rounded-xl border border-line bg-surface p-6 text-center shadow-md sm:p-10", className)}>
          <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-success-soft text-success ring-8 ring-success-soft/40">
            <Check className="size-8" strokeWidth={2.5} />
          </span>
          <div className="grid gap-2">
            {eyebrow && <p className="text-eyebrow tracking-widest text-ink-muted uppercase">{eyebrow}</p>}
            <Heading id="confirm-h" level="h1" as="h1">{title}</Heading>
            {lead && <Text size="lg" muted className="text-pretty">{lead}</Text>}
          </div>
          <div className="grid w-full gap-3 border-t border-line pt-6 text-left">
            <p className="text-label-md font-semibold text-ink">What happens next</p>
            <ol className="grid gap-3">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-label-sm font-semibold text-ink tabular-nums">{i + 1}</span>
                  <div className="grid gap-0.5 pt-0.5">
                    <p className="text-label-md font-semibold text-ink">{s.title}</p>
                    {s.body && <Text size="sm" muted>{s.body}</Text>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid w-full justify-items-center gap-2 pt-2">
            {action}
            {back && <TextLink href={back.href}>{back.label}</TextLink>}
          </div>
        </section>
      </div>
    </PhotoStage>
  );
}
