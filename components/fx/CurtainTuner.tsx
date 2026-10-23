"use client";
import { Button, IconButton, Slider, cx, useToast } from "@ds/components";
import { ChevronRight, Copy, Play, RotateCcw, Save, SlidersHorizontal, Upload } from "lucide-react";
import * as React from "react";
import { curtainDefaults, type CurtainController, type CurtainParams } from "@/lib/curtain";
import { CallSheetHome } from "@/components/home/CallSheetHome";

type Field = { key: keyof CurtainParams; label: string; min: number; max: number; step: number; fmt?: (v: number) => string };
const pct = (v: number) => `${Math.round(v * 100)}%`;
const GROUPS: { name: string; fields: Field[] }[] = [
  { name: "Cloth", fields: [
    { key: "folds", label: "Folds", min: 6, max: 60, step: 1, fmt: (v) => String(v) },
    { key: "foldDepth", label: "Fold depth", min: 0, max: 0.09, step: 0.002, fmt: (v) => v.toFixed(3) },
    { key: "crowd", label: "Dots crowd into creases", min: 0, max: 4, step: 0.1, fmt: (v) => v.toFixed(1) },
    { key: "flare", label: "Folds deepen toward the hem", min: 0, max: 1, step: 0.05, fmt: pct },
    { key: "spacing", label: "Dot spacing", min: 7, max: 20, step: 0.5, fmt: (v) => `${v}px` },
    { key: "dotSize", label: "Dot size", min: 0.4, max: 2.2, step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
  ] },
  { name: "Light", fields: [
    { key: "contrast", label: "Fold light and shade", min: 0, max: 1, step: 0.02, fmt: pct },
    { key: "light", label: "Light direction", min: -3.14, max: 3.14, step: 0.05, fmt: (v) => `${Math.round((v * 180) / Math.PI)}°` },
    { key: "topFade", label: "Fade toward the top", min: 0.2, max: 3, step: 0.1, fmt: (v) => v.toFixed(1) },
    { key: "stageLight", label: "Stage light behind", min: 0, max: 1, step: 0.05, fmt: pct },
    { key: "glow", label: "Horizon glow", min: 0, max: 2, step: 0.05, fmt: pct },
  ] },
  { name: "Mouse", fields: [
    { key: "brushRadius", label: "Reach", min: 50, max: 350, step: 5, fmt: (v) => `${v}px` },
    { key: "brushStrength", label: "Strength", min: 0, max: 2.5, step: 0.05, fmt: pct },
    { key: "waveSize", label: "Ripple size", min: 8, max: 70, step: 1, fmt: (v) => `${v}px` },
    { key: "waveSpeed", label: "Ripple speed", min: 0, max: 12, step: 0.25, fmt: (v) => v.toFixed(2) },
    { key: "settle", label: "Settles (slow → fast is low)", min: 0.8, max: 0.99, step: 0.005, fmt: (v) => v.toFixed(3) },
  ] },
  { name: "Opening", fields: [
    { key: "openMs", label: "Duration", min: 400, max: 3500, step: 50, fmt: (v) => `${(v / 1000).toFixed(2)}s` },
    { key: "gather", label: "How far it slides", min: 0.4, max: 1, step: 0.01, fmt: pct },
    { key: "bunch", label: "Bunching at the sides", min: 0, max: 5, step: 0.1, fmt: (v) => v.toFixed(1) },
  ] },
  { name: "Stage", fields: [
    { key: "curve", label: "Screen curve (low = more curved)", min: 0.3, max: 1.2, step: 0.01, fmt: (v) => v.toFixed(2) },
    { key: "horizon", label: "Horizon height", min: 0.55, max: 0.95, step: 0.01, fmt: pct },
    { key: "floor", label: "Floor dot spacing", min: 0.8, max: 3, step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
    { key: "floorFade", label: "Floor fade toward you", min: 0.3, max: 4, step: 0.1, fmt: (v) => v.toFixed(1) },
  ] },
];
const KEY = "bg-curtain-tuning", SLOTS = ["A", "B", "C"] as const;
const load = (k: string): CurtainParams | null => { try { const v = localStorage.getItem(k); return v ? { ...curtainDefaults, ...JSON.parse(v) } : null; } catch { return null; } };
const save = (k: string, v: CurtainParams) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

/**
 * /preview/curtain: the home page with the stage curtain and a panel to tune it live. Brush it with the mouse,
 * play the opening, save up to three favourites (this browser only) and copy the settings to send them over.
 * The panel is a desktop tool: it hides on phones, where the curtain still shows.
 */
export function CurtainTuner() {
  const toast = useToast();
  const [p, setP] = React.useState<CurtainParams>(curtainDefaults);
  const [panel, setPanel] = React.useState(true);
  const [slots, setSlots] = React.useState<Record<string, boolean>>({});
  const live = React.useRef(p);
  const ctl = React.useRef<CurtainController | null>(null);
  React.useEffect(() => {
    const saved = load(KEY); if (saved) setP(saved); // eslint-disable-line react-hooks/set-state-in-effect
    setSlots(Object.fromEntries(SLOTS.map((s) => [s, !!load(`${KEY}-${s}`)])));
  }, []);
  React.useEffect(() => { live.current = p; save(KEY, p); ctl.current?.redraw(); }, [p]);
  const set = (k: keyof CurtainParams) => (v: number) => setP((x) => ({ ...x, [k]: v }));
  const params = React.useCallback(() => live.current, []);
  const curtain = React.useMemo(() => ({ params, stayOnPage: true, onReady: (c: CurtainController) => { ctl.current = c; } }), [params]);

  const copy = async () => {
    const changed = (Object.keys(p) as (keyof CurtainParams)[]).filter((k) => p[k] !== curtainDefaults[k]);
    const text = `Curtain settings (Between Gigs, /preview/curtain):\n${JSON.stringify(p)}\nChanged from default: ${changed.length ? changed.map((k) => `${k} ${curtainDefaults[k]} → ${p[k]}`).join(", ") : "none"}`;
    try { await navigator.clipboard.writeText(text); toast({ message: "Settings copied. Paste them to Claude.", tone: "success" }); }
    catch { toast({ message: "Couldn't copy here. Select the settings text below instead.", tone: "danger" }); }
  };

  return (
    <div className="relative">
      <CallSheetHome curtain={curtain} />
      <aside aria-label="Curtain tuner" className={cx("fixed top-3 right-3 bottom-3 z-sticky flex w-80 max-sm:hidden max-w-full flex-col rounded-2xl border border-line bg-surface shadow-lg transition-transform duration-base", !panel && "translate-x-full")}>
        <div className="flex items-center justify-between gap-2 border-b border-line p-3">
          <p className="flex items-center gap-2 font-display text-heading-sm text-ink"><SlidersHorizontal className="size-4 text-ink-brand" aria-hidden="true" />Curtain tuner</p>
          <IconButton label="Hide the tuner" variant="ghost" icon={<ChevronRight />} onClick={() => setPanel(false)} />
        </div>
        <div className="grid gap-2 border-b border-line p-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" iconStart={<Play />} onClick={() => ctl.current?.open(() => window.setTimeout(() => ctl.current?.reset(), 700))}>Play opening</Button>
            <Button size="sm" variant="ghost" iconStart={<Copy />} onClick={() => void copy()}>Copy settings</Button>
            <Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={() => setP(curtainDefaults)}>Reset</Button>
          </div>
          <p className="text-body-sm text-ink-muted">Brush the curtain with your mouse. The page button plays the opening too.</p>
          <div className="grid gap-1.5">
            <p className="text-label-sm text-ink-subtle">Favourites (this browser)</p>
            {SLOTS.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className="w-6 text-label-md text-ink">{s}</span>
                <Button size="sm" variant="ghost" iconStart={<Save />} onClick={() => { save(`${KEY}-${s}`, p); setSlots((x) => ({ ...x, [s]: true })); toast({ message: `Saved as favourite ${s}`, tone: "success" }); }}>Save</Button>
                {slots[s]
                  ? <Button size="sm" variant="ghost" iconStart={<Upload />} onClick={() => { const v = load(`${KEY}-${s}`); if (v) setP(v); }}>Load</Button>
                  : <span className="text-body-sm text-ink-subtle">Empty</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="grid flex-1 content-start gap-5 overflow-y-auto p-3">
          {GROUPS.map((g) => (
            <section key={g.name} className="grid gap-3">
              <h2 className="text-eyebrow text-ink-brand uppercase">{g.name}</h2>
              {g.fields.map((f) => <Slider key={f.key} label={f.label} min={f.min} max={f.max} step={f.step} value={p[f.key]} onChange={set(f.key)} format={f.fmt} />)}
            </section>
          ))}
        </div>
      </aside>
      {!panel && (
        <Button className="fixed top-3 right-3 z-sticky max-sm:hidden" size="sm" variant="secondary" iconStart={<SlidersHorizontal />} onClick={() => setPanel(true)}>Tuner</Button>
      )}
    </div>
  );
}
