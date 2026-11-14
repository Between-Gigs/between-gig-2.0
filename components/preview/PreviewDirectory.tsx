import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Page } from "@/components/site/Page";
import { basePath } from "@/lib/site";

/** Read-only navigation into existing sample forms and journeys; no production editor or send action. */
export function PreviewDirectory({ kind }: { kind: "forms" | "funnels" }) {
  const home = basePath === "/hub" ? "/home/" : "/";
  const items = kind === "forms" ? [
    { title: "Profile sign up", href: "/join/", text: "Explore account creation with fictional sample data." },
    { title: "Log in", href: "/login/", text: "Try the sample email-code sign-in form." },
    { title: "Call Sheet", href: home, text: "Open the landing page and its Call Sheet form." },
    { title: "Privacy request", href: "/privacy/", text: "Inspect the sample privacy-request form." },
  ] : [
    { title: "Gigster onboarding", href: "/emails/invite/", text: "Start with the invitation, then account setup, profile editing and review." },
    { title: "Call Sheet signup", href: home, text: "Explore the landing-page signup and sample waitlist journey." },
    { title: "Client request", href: "/crew-call/", text: "Explore the Crew Call request planner." },
  ];
  return <Page>
    <Link href={basePath === "/hub" ? "/" : "/hub/"} className="inline-flex min-h-11 items-center text-label-md text-ink underline underline-offset-4">Hub</Link>
    <h1 className="mt-4 font-display text-display-sm text-ink">{kind === "forms" ? "Form previews" : "Funnel previews"}</h1>
    <p className="mt-3 max-w-2xl text-body-lg text-ink-muted">Explore existing previews with fictional sample data. No real accounts or messages are created here.</p>
    <ul className="mt-8 grid gap-4 sm:grid-cols-2">
      {items.map(item => <li key={item.title}><Link href={item.href} className="group flex h-full min-h-11 items-start justify-between gap-4 rounded-xl border border-line bg-surface p-5 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus">
        <span className="grid gap-2"><span className="font-display text-heading-md text-ink">{item.title}</span><span className="text-body-md text-ink-muted">{item.text}</span></span><ArrowRight aria-hidden="true" className="size-5 shrink-0 text-ink" />
      </Link></li>)}
    </ul>
  </Page>;
}
