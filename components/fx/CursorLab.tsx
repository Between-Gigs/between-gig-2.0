"use client";
import { Badge, Banner, Button } from "@ds/components";
import { ArrowRight, Check, MousePointer2, Power } from "lucide-react";
import * as React from "react";
import { cursorAllowed, cursorEffects, onCursorChange, savedCursor, saveCursor, startCursorFx, type CursorKind } from "@/lib/cursor-fx";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";

/** One effect, running only inside its own panel, with a button and a link to show hover states. */
function Stage({ kind }: { kind: Exclude<CursorKind, "none"> }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { const el = ref.current; if (!el || !cursorAllowed()) return; return startCursorFx(kind, el); }, [kind]);
  return (
    <div ref={ref} className="relative isolate grid h-56 place-items-center overflow-hidden rounded-xl border border-line bg-surface-brand phosphor-dots">
      <div className="relative z-raised grid justify-items-center gap-3 text-center">
        <p className="text-label-md text-ink-muted">Move here{kind === "sparks" ? ", then click" : ""}</p>
        <span className="flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="secondary">A button</Button>
          <Button size="sm" variant="ghost">Another</Button>
        </span>
      </div>
    </div>
  );
}

/** /preview/cursors: try each mouse effect, then turn one on for the whole site to see it on real pages. */
export function CursorLab() {
  const [current, setCurrent] = React.useState<CursorKind>("none");
  const [allowed, setAllowed] = React.useState(true);
  React.useEffect(() => { setCurrent(savedCursor()); setAllowed(cursorAllowed()); return onCursorChange(() => setCurrent(savedCursor())); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const name = cursorEffects.find((e) => e.id === current)?.name;
  return (
    <Page>
      <div className="grid gap-3">
        <p className="text-eyebrow text-ink-brand uppercase">Preview</p>
        <h1 className="font-display text-display-sm text-ink">Mouse effects</h1>
        <p className="max-w-prose text-body-lg text-ink-muted">Move your mouse over each panel to try it. Like one? Use it on the whole site to see it on real pages; it&apos;s saved in this browser only, and it&apos;s easy to switch off.</p>
      </div>
      {!allowed && (
        <Banner tone="info" className="mt-6" title="Effects are off on this device">They only run with a mouse, and not when your system asks for reduced motion. Try this page on a laptop or desktop.</Banner>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <MousePointer2 className="size-5 text-ink-brand" aria-hidden="true" />
        <p className="text-body-md text-ink">{name ? <>On across the site: <b>{name}</b></> : "No effect on the site right now."}</p>
        <span className="flex-1" />
        {name && <ButtonLink href="/" size="sm" iconEnd={<ArrowRight />}>See it on the home page</ButtonLink>}
        {name && <Button size="sm" variant="ghost" iconStart={<Power />} onClick={() => saveCursor("none")}>Turn it off</Button>}
      </div>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cursorEffects.map((e, i) => (
          <li key={e.id} className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <Stage kind={e.id} />
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-heading-md text-ink"><span className="mr-2 text-label-md text-ink-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>{e.name}</h2>
              {current === e.id && <Badge tone="success" size="sm" icon={<Check />}>On</Badge>}
            </div>
            <p className="text-body-sm text-ink-muted">{e.body}</p>
            <div>
              {current === e.id
                ? <Button size="sm" variant="ghost" iconStart={<Power />} onClick={() => saveCursor("none")}>Turn off</Button>
                : <Button size="sm" variant="secondary" iconStart={<MousePointer2 />} onClick={() => saveCursor(e.id)}>Use on the whole site</Button>}
            </div>
          </li>
        ))}
      </ul>
    </Page>
  );
}
