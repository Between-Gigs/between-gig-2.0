"use client";
import { Badge, Banner, Button } from "@ds/components";
import { ArrowRight, Check, MousePointer2, Power } from "lucide-react";
import * as React from "react";
import { cursorAllowed, cursorEffects, onCursorChange, savedCursor, saveCursor, startCursorFx, type CursorKind } from "@/lib/cursor-fx";
import { SITE_CURSOR, cursorStyles, cursorValue, onCursorStyleChange, savedCursorStyle, saveCursorStyle, type CursorStyle } from "@/lib/cursor-style";
import { basePath } from "@/lib/site";
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

/** One pointer shape: its two states side by side, and a panel to hover where it's live. */
function StyleCard({ id, name, body, current }: { id: Exclude<CursorStyle, "system">; name: string; body: string; current: boolean }) {
  return (
    <li className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="relative grid h-40 grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface-brand phosphor-dots" style={{ cursor: cursorValue(id) }}>
        {[["Normal", false], ["Over a link", true]].map(([label, hover]) => (
          <div key={String(label)} className="grid place-items-center gap-2 p-3 text-center">
            <img src={`${basePath}/cursors/${id}${hover ? "-hover" : ""}.svg`} alt="" width={48} height={48} className="size-12" />
            <span className="text-label-sm text-ink-muted">{label}</span>
          </div>
        ))}
        <span className="absolute inset-x-0 bottom-3 flex justify-center">
          <Button size="sm" variant="ghost" style={{ cursor: cursorValue(id, true) }}>Hover me</Button>
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-heading-md text-ink">{name}</h3>
        <span className="flex gap-1.5">
          {id === SITE_CURSOR && <Badge tone="brand" size="sm">Chosen for the site</Badge>}
          {current && <Badge tone="success" size="sm" icon={<Check />}>On here</Badge>}
        </span>
      </div>
      <p className="text-body-sm text-ink-muted">{body}</p>
      <div>
        {current
          ? id !== SITE_CURSOR && <Button size="sm" variant="ghost" iconStart={<Power />} onClick={() => saveCursorStyle(SITE_CURSOR)}>Back to the site's cursor</Button>
          : <Button size="sm" variant="secondary" iconStart={<MousePointer2 />} onClick={() => saveCursorStyle(id)}>{id === SITE_CURSOR ? "Use the site's cursor" : "Try on the whole site"}</Button>}
      </div>
    </li>
  );
}

/** /preview/cursors: pointer shapes and mouse effects to try, and to turn on across the site to see them on real pages. */
export function CursorLab() {
  const [style, setStyle] = React.useState<CursorStyle>(SITE_CURSOR);
  React.useEffect(() => { setStyle(savedCursorStyle()); return onCursorStyleChange(() => setStyle(savedCursorStyle())); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const [current, setCurrent] = React.useState<CursorKind>("none");
  const [allowed, setAllowed] = React.useState(true);
  React.useEffect(() => { setCurrent(savedCursor()); setAllowed(cursorAllowed()); return onCursorChange(() => setCurrent(savedCursor())); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const name = cursorEffects.find((e) => e.id === current)?.name;
  return (
    <Page>
      <div className="grid gap-3">
        <p className="text-eyebrow text-ink-brand uppercase">Preview</p>
        <h1 className="font-display text-display-sm text-ink">Cursors and mouse effects</h1>
        <p className="max-w-prose text-body-lg text-ink-muted">Two choices: the pointer&apos;s shape, and an effect that follows it. Hover each panel to try it, then use it on the whole site to see it on real pages. Choices are saved in this browser only, and easy to switch off.</p>
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
      <h2 className="mt-10 font-display text-heading-lg text-ink">Cursor styles</h2>
      <p className="mt-1 text-body-md text-ink-muted">The site uses the <b className="text-ink">Spotlit 3D arrow</b>, the client&apos;s choice. {style !== SITE_CURSOR && <>This browser is previewing <b className="text-ink">{style === "system" ? "the system pointer" : cursorStyles.find((c) => c.id === style)?.name}</b>.</>}</p>
      <ul className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cursorStyles.map((c) => <StyleCard key={c.id} id={c.id} name={c.name} body={c.body} current={style === c.id} />)}
      </ul>
      <h2 className="mt-12 font-display text-heading-lg text-ink">Mouse effects</h2>
      <ul className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cursorEffects.map((e, i) => (
          <li key={e.id} className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <Stage kind={e.id} />
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-heading-md text-ink"><span className="mr-2 text-label-md text-ink-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>{e.name}</h3>
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
