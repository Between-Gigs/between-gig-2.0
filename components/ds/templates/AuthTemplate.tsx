/*
 * Template · Auth (Figma: DS · Patterns → Create account / Log in). A full-bleed still-life photo with the welcome on
 * the left and the form card on the right. Under lg the photo becomes a short band above the card. Routes fill it
 * through components/auth/AuthShell (join, login, invite code).
 */
import { cx } from "@ds/components/cx";
import { Check } from "lucide-react";
import type * as React from "react";
import { Eyebrow, Heading, Text } from "../atoms";
import { PhotoStage } from "../organisms";

const STEPS = ["Open your link", "Fill in your page", "Send it for review"];

export function AuthTemplate({ login, eyebrow, showSteps = true, children, className }: { login: boolean; eyebrow?: string; showSteps?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <PhotoStage className="min-h-full">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:min-h-160 lg:grid-cols-12 lg:py-16">
        <aside aria-label="Welcome to Between Gigs" className="grid gap-4 rounded-xl bg-bg/90 p-5 shadow-sm backdrop-blur-sm sm:gap-5 sm:p-8 lg:col-span-6 lg:p-10">
          <Eyebrow rule>{eyebrow ?? (login ? "Welcome back" : "Welcome to Between Gigs")}</Eyebrow>
          <Heading level="display-l" as="p" className="max-w-xl max-sm:text-display-sm">Your craft.<br />More possibilities.</Heading>
          <Text size="lg" muted className="hidden max-w-md sm:block">
            {login ? "Your page is right where you left it. Log in to keep it current." : "Bring the work you already have. Show what your skills can offer, on set and beyond."}
          </Text>
          {!login && showSteps && (
            <ol aria-label="Three steps" className="hidden gap-2 sm:grid">
              {STEPS.map((s, i) => (
                <li key={s} aria-current={i === 0 ? "step" : undefined} className="flex items-center gap-3 text-label-md font-semibold text-ink">
                  <span aria-hidden="true" className={cx("grid size-7 place-items-center rounded-full text-label-sm", i === 0 ? "bg-action text-on-action" : "border border-line-strong")}>
                    {i === 0 ? <Check className="size-3.5" /> : i + 1}
                  </span>{s}
                </li>
              ))}
            </ol>
          )}
        </aside>
        <div className={cx("w-full max-w-md justify-self-center rounded-xl border border-line bg-surface p-6 shadow-md sm:p-8 lg:col-span-5 lg:col-start-8 lg:justify-self-end", className)}>
          {children}
        </div>
      </div>
    </PhotoStage>
  );
}
