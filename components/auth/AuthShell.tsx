import { cx } from "@ds/components";
import { Page } from "@/components/site/Page";

const steps = [
  { title: "Open your link", body: "Set up your account with this email address." },
  { title: "Fill in your page", body: "Your photo, what you do on set, your services, where and when you work. It saves as you go." },
  { title: "Send it for review", body: "We review every profile before it goes live, and email you when it's approved." },
];

/**
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
  const login = header === "Log in";
  return (
    <Page>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:pt-6 md:grid-cols-12 lg:pt-10">
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

        <div className="border-t-8 border-line-strong pt-6 md:col-span-6 lg:col-span-5 xl:col-span-4">
          <div className={className}>
            {children}
            {lead && <div className="mt-8 border-t border-line pt-5 text-body-sm text-ink-muted">{lead}</div>}
          </div>
        </div>

        {!login && showSteps && (
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
