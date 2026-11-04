import { cx } from "@ds/components";
import { Page } from "@/components/site/Page";
import { Icon3D } from "@/components/ui/Icon3D";
import { type Icon3DName } from "@/lib/icons3d";
import { asset } from "@/lib/site";

/**
 * Log in and Sign up share one frame (direction B · Warm & friendly): on wide screens a peach welcome panel with the
 * invite's headline, the three steps and a strip of the flat-lay photo; beside it a white card with a 3D icon tile, the
 * form's own heading and fields. On phones only the card shows. `lead` is a short note at the foot of the card.
 */
export function AuthShell({ header, lead, children, className, icon }: {
  header: "Log in" | "Sign up"; lead?: React.ReactNode; children: React.ReactNode; className?: string; icon?: Icon3DName;
}) {
  const login = header === "Log in";
  return (
    <Page className="max-w-6xl">
      <div className="grid gap-6 sm:my-2 lg:grid-cols-2">
        <aside aria-label="Welcome to Between Gigs" className="relative isolate hidden flex-col overflow-hidden rounded-2xl bg-tint-peach text-tint-ink lg:flex">
          <div className="px-12 pt-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-label-md text-ink">
              <Icon3D name="waving_hand" className="size-5" />{login ? "Welcome back" : "Welcome"}
            </span>
            <p className="mt-8 font-display text-display-md text-balance">
              Your craft.<br />
              <span className="bg-linear-to-t from-mint-500 from-25% to-transparent to-25% px-0.5">More possibilities.</span>
            </p>
            <p className="mt-5 max-w-md text-body-lg">
              {login ? "Your page is right where you left it. Log in to keep it current." : "Bring the work you already have. Show what your skills can offer, on set and beyond."}
            </p>
            {!login && (
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
            <img src={asset("email/craft-bottom.jpg")} alt="" className="block aspect-video w-full rounded-tl-2xl object-cover" />
          </div>
        </aside>

        <div className="rounded-2xl bg-surface p-6 shadow-md sm:p-10 lg:p-14">
          <span aria-hidden="true" className="grid size-16 place-items-center rounded-xl bg-tint-mint"><Icon3D name={icon ?? (login ? "waving_hand" : "key")} className="size-9" /></span>
          <div className={cx("mt-6", className)}>
            {children}
            {lead && <div className="mt-8 border-t border-dashed border-line-dashed pt-5 text-body-sm text-ink-muted">{lead}</div>}
          </div>
        </div>
      </div>
    </Page>
  );
}
