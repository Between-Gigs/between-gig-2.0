"use client";
import { useLook } from "@/components/site/LookSync";
import { asset } from "@/lib/site";
import { Icon3D } from "@/components/ui/Icon3D";
import { cx } from "@ds/components";
import { Page } from "@/components/site/Page";
import { ModernWelcome } from "./ModernWelcome";
import { AuthTemplate } from "@/components/ds/templates/AuthTemplate";
import { AuthStageTemplate } from "@/components/ds/templates/AuthStageTemplate";
import { Status } from "@/components/ds/atoms";
import { useAuthV2 } from "./authDesign";

const steps = [
  { title: "Open your link", body: "Set up your account with this email address." },
  { title: "Fill in your page", body: "Your photo, what you do on set, your services, where and when you work. It saves as you go." },
  { title: "Send it for review", body: "We review every profile before it goes live, and email you when it's approved." },
];

/**
 * Green Room (`editorial`) shows the launch frame, AuthStageTemplate, unless an AuthDesignProvider asks for "v1" (the Hub
 * drafts), which keeps the previous AuthTemplate. The other looks keep their own frames below.
 *
 * Log in and Sign up share one frame (direction G · Swiss grid): on a 12-column grid, the huge headline and lead fill
 * the left eight columns and the form sits in the right four (cols 9–12, over step 3) under a thick rule; tablets split 6/6. Sign up then lists the three steps in
 * a row under thick rules, the first one (where they are now) as the screen's single mint block. `lead` is a short note
 * at the foot of the form; `eyebrow` names how they arrived ("You're invited").
 */
export function AuthShell({ header, lead, children, className, eyebrow, steps: showSteps = true }: {
  header: "Log in" | "Sign up"; lead?: React.ReactNode; children: React.ReactNode; className?: string; eyebrow?: string;
  /** Sign up only: the three-step row. Off when there is nothing to start (an invite already used, invite-only). */
  steps?: boolean;
}) {
  const look = useLook();
  const warm = look === "friendly" || look === "call-sheet";
  const classic = look === "classic";
  const modern = look === "modern";
  const login = header === "Log in";
  const v2 = useAuthV2();
  if (look === "editorial" && v2) {
    // Launch design (Flow p2): still-life stage, welcome on the paper, the form in the card. `eyebrow` (how they
    // arrived, "You're invited") becomes a badge at the top of the card; the stage keeps the Founding Gigsters line.
    return (
      <Page bare>
        <AuthStageTemplate
          eyebrow={login ? "Welcome back" : "Founding Gigsters"}
          title={login ? <>Pick up where<br className="max-sm:hidden" /> you left off.</> : <>Bring your craft<br className="max-sm:hidden" /> beyond the set.</>}
          lead={login ? "Log in to keep your profile current and see where it stands." : "Create a profile so people can find the services you offer between gigs."}>
          <div className={className}>
            {eyebrow && <Status tone="brand" className="mb-4">{eyebrow}</Status>}
            {children}
            {lead && <div className="mt-6 border-t border-line pt-4 text-body-sm text-ink-muted">{lead}</div>}
          </div>
        </AuthStageTemplate>
      </Page>
    );
  }
  if (look === "editorial") {
    return (
      <Page bare>
        <AuthTemplate login={login} eyebrow={eyebrow} showSteps={showSteps}>
          <div className={className}>
            {children}
            {lead && <div className="mt-8 border-t border-line pt-5 text-body-sm text-ink-muted">{lead}</div>}
          </div>
        </AuthTemplate>
      </Page>
    );
  }
  return (
    <Page bare={modern} className={modern ? "modern-auth-stage" : look === "swiss" ? undefined : "max-w-6xl"}>
      <div className={modern ? "modern-auth-grid" : classic ? "mx-auto w-full max-w-xl overflow-hidden rounded-lg border border-line bg-surface shadow-md sm:my-8" : warm ? "grid gap-6 sm:my-2 lg:grid-cols-2" : "grid grid-cols-1 gap-x-6 gap-y-10 sm:pt-6 md:grid-cols-12 lg:pt-10"}>
        {modern ? <ModernWelcome login={login} eyebrow={eyebrow} showSteps={showSteps} /> : classic ? <p className="border-b border-line px-6 py-5 text-center text-label-md text-ink">{eyebrow ?? header}</p> : warm ? <WarmWelcome login={login} eyebrow={eyebrow} showSteps={showSteps} /> : (
          <aside aria-label="Welcome to Between Gigs" className="md:col-span-6 lg:col-span-7 xl:col-span-8">
            <p className="flex flex-wrap gap-x-5 gap-y-1 text-eyebrow text-ink uppercase">
              <span>{eyebrow ?? (login ? "Welcome back" : "Welcome")}</span>
              <span className="text-ink-muted">{login ? "Log in" : showSteps ? "Account · Step 1 of 3" : "Sign up"}</span>
            </p>
            <p className="mt-5 font-display text-display-sm text-ink sm:text-display-md md:text-display-sm lg:mt-7 lg:text-display-lg xl:text-display-xl">
              Your craft.<br />More<br />possibilities.
            </p>
            <p className="mt-6 hidden max-w-xl font-display text-heading-md font-medium leading-snug text-pretty text-ink sm:block lg:mt-9">
              {login ? "Your page is right where you left it. Log in to keep it current." : "Bring the work you already have. Show what your skills can offer, on set and beyond."}
            </p>
          </aside>
        )}

        <div className={modern ? "modern-auth-form" : classic ? "p-6 sm:p-8" : warm ? "rounded-2xl bg-surface p-6 shadow-md sm:p-10 lg:p-14" : "self-start rounded-2xl border border-line bg-surface-raised p-5 shadow-sm sm:p-6 swiss:border-0 swiss:border-t-8 swiss:border-line-strong swiss:bg-transparent swiss:p-0 swiss:pt-6 md:col-span-6 lg:col-span-5 xl:col-span-4"}>
          {warm && <span aria-hidden="true" className="grid size-16 place-items-center rounded-xl bg-tint-mint-soft"><Icon3D name={login ? "waving_hand" : "key"} className="size-9" /></span>}
          <div className={cx(warm && "mt-6", className)}>
            {children}
            {lead && <div className="mt-8 border-t border-line pt-5 text-body-sm text-ink-muted">{lead}</div>}
          </div>
        </div>

        {look === "swiss" && !login && showSteps && (
          <ol aria-label="Three steps" className="grid gap-x-6 gap-y-4 md:col-span-12 md:grid-cols-3 lg:mt-8">
            {steps.map((s, i) => (
              <li key={s.title} aria-current={i === 0 ? "step" : undefined}
                className={cx("flex gap-5 border-t-4 pt-4 pr-6 pb-6 md:flex-col md:gap-3 lg:flex-row lg:gap-5", i === 0 ? "border-tint-mint bg-tint-mint pl-5 text-forest-950" : "border-line-strong text-ink")}>
                <span aria-hidden="true" className="font-display text-stat tabular-nums">{i + 1}</span>
                <div className="grid content-start gap-2 pt-1">
                  {i === 0 && <span className="text-eyebrow uppercase">You are here</span>}
                  <h2 className="font-display text-heading-md">{s.title}</h2>
                  <p className={cx("text-body-md", i === 0 ? "text-forest-950" : "text-ink-muted")}>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Page>
  );
}

function WarmWelcome({ login, eyebrow, showSteps }: { login: boolean; eyebrow?: string; showSteps: boolean }) {
  return (
    <aside data-call-sheet-stage="welcome" aria-label="Welcome to Between Gigs" className="relative isolate hidden flex-col overflow-hidden rounded-2xl bg-tint-peach text-tint-ink lg:flex">
      <div className="px-12 pt-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-label-md text-ink">
          <Icon3D name="waving_hand" className="size-5" />{eyebrow ?? (login ? "Welcome back" : "Welcome")}
        </span>
        <p className="mt-8 font-display text-display-md text-balance">
          Your craft.<br />
          <span className="bg-linear-to-t from-mint-500 from-25% to-transparent to-25% px-0.5">More possibilities.</span>
        </p>
        <p className="mt-5 max-w-md text-body-lg">
          {login ? "Your page is right where you left it. Log in to keep it current." : "Bring the work you already have. Show what your skills can offer, on set and beyond."}
        </p>
        {!login && showSteps && (
          <ol className="mt-7 flex max-w-md flex-wrap gap-2.5" aria-label="Three steps">
            {["Open your link", "Fill in your page", "Send it for review"].map((s, i) => (
              <li key={s} className="inline-flex items-center gap-2 rounded-full bg-surface py-1.5 pr-4 pl-1.5 text-label-md text-ink">
                <span aria-hidden="true" className={cx("grid size-7 place-items-center rounded-full text-label-sm", i === 0 ? "bg-mint-500 text-ink" : "bg-ink text-bg")}>{i + 1}</span>{s}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="relative mt-auto ml-12 pt-32">
        <span className="absolute top-6 left-4 z-raised inline-flex -rotate-3 items-center gap-3 rounded-xl bg-surface px-4 py-3 text-ink shadow-md">
          <Icon3D name="sparkles" className="size-7" />
          <span className="grid"><b className="text-label-md">About 10 minutes</b><span className="text-body-sm text-ink-muted">It saves as you go</span></span>
        </span>
        <span className="absolute top-20 right-6 z-raised inline-flex rotate-2 items-center gap-3 rounded-xl bg-surface px-4 py-3 text-ink shadow-md">
          <Icon3D name="clapper_board" className="size-7" />
          <span className="grid"><b className="text-label-md">Production comes first</b><span className="text-body-sm text-ink-muted">Pause any time</span></span>
        </span>
        <img src={asset("email/craft-invitation-desktop.jpg")} alt="" className="block aspect-video w-full rounded-tl-2xl object-cover" />
      </div>
    </aside>
  );
}
