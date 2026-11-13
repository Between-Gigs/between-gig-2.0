"use client";
import { Button, cx } from "@ds/components";
import { ArrowRight } from "lucide-react";
import { selectLook, setUnstyled, useLook, useUnstyled } from "@/components/site/LookSync";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { lookIds, looks } from "@/lib/look";
import { LivePagePreview } from "./LivePagePreview";

/**
 * The design system on the preview hub. The preview is the live design system page, so it always shows the theme in
 * use; the swatches switch it right here (and every other thumbnail on the hub follows).
 */
export function DesignSystemBlock() {
  const current = useLook();
  const plain = useUnstyled();
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-center">
      <div className="lg:col-span-7">
        <LivePagePreview href="/preview/design-system/#foundations" title="Design system" />
      </div>
      <div className="grid content-start gap-4 lg:col-span-5">
        <div className="grid gap-1">
          <p className="text-eyebrow text-ink-muted uppercase">Theme in use</p>
          <p className="font-display text-display-sm text-ink">{looks[current].name}{plain && <span className="text-ink-muted"> · Unstyled</span>}</p>
          <p className="text-body-md text-ink-muted">{looks[current].detail}</p>
        </div>
        <ul aria-label="Themes" className="flex flex-wrap gap-2.5">
          {lookIds.map((look) => (
            <li key={look}>
              <button type="button" onClick={() => { setUnstyled(false); selectLook(look); }} aria-pressed={current === look && !plain}
                title={looks[look].detail}
                className={cx("inline-flex min-h-11 items-center gap-2.5 rounded-lg border py-1.5 pr-4 pl-1.5 text-label-md text-ink transition-colors duration-fast hover:bg-surface-hover",
                  current === look && !plain ? "border-line-strong bg-surface-selected" : "border-line")}>
                <span aria-hidden="true" className="look-option look-option-chip" data-option={look} />{looks[look].name}
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setUnstyled(!plain)} aria-pressed={plain}
              className={cx("inline-flex min-h-11 items-center gap-2.5 rounded-lg border py-1.5 pr-4 pl-1.5 text-label-md text-ink transition-colors duration-fast hover:bg-surface-hover",
                plain ? "border-line-strong bg-surface-selected" : "border-line")}>
              <span aria-hidden="true" className="look-option look-option-chip" data-option="unstyled" />Unstyled
            </button>
          </li>
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <ButtonLink href="/preview/design-system/" variant="primary" iconEnd={<ArrowRight />}>Open the design system</ButtonLink>
          {plain && <Button variant="ghost" onClick={() => setUnstyled(false)}>Back to styled</Button>}
        </div>
      </div>
    </div>
  );
}
