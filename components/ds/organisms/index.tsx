/*
 * Organisms (Figma: DS · Components → Organisms). Self-contained sections made of molecules: the auth card, the
 * photo stage behind it, a Gigster result card, a service tile. The site header and footer organisms stay in
 * components/site (SiteHeader, SiteFooter) and follow this look through its tokens.
 */
import { cx } from "@ds/components/cx";
import { Bookmark, Calendar, MapPin } from "lucide-react";
import type * as React from "react";
import { asset } from "@/lib/site";
import { Heading, Text, TextLink } from "../atoms";

/** A full-bleed reference photo (still life or film set) behind a section. The image is decoration only. */
export function PhotoStage({ image = "/art/wallpapers/craft-invitation-desktop.jpg", className, children }: { image?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cx("relative isolate overflow-hidden bg-bg", className)}>
      <img src={asset(image)} alt="" aria-hidden="true" className="absolute inset-0 -z-10 size-full object-cover dark:opacity-25" />
      {children}
    </section>
  );
}

/** The raised card that holds a form (create account, log in, code). */
export function AuthCard({ title, children, className }: { title: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("grid gap-5 rounded-xl border border-line bg-surface p-6 shadow-md sm:p-8", className)}>
      <Heading level="h2" as="h1" className="text-center">{title}</Heading>
      {children}
    </div>
  );
}

/** One Gigster in results: photo, serif name, main service, a line, area and availability, rate and View profile. */
export function ProfileResultCard({ href, name, service, line, area, availability, rate, minimum, photo, onSave, saved }: {
  href: string; name: string; service: string; line?: string; area?: string; availability?: string; rate?: string; minimum?: string; photo?: string; onSave?: () => void; saved?: boolean;
}) {
  return (
    <article className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-3 shadow-sm sm:flex-row sm:items-center">
      <div className="aspect-4/3 w-full shrink-0 overflow-hidden rounded-md bg-surface-sunken sm:w-40">
          {photo ? <img src={asset(photo)} alt="" className="size-full object-cover" /> : (
          <span aria-hidden="true" className="grid size-full place-items-center font-display text-display-sm text-ink-muted">{name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>
        )}
      </div>
      <div className="grid min-w-0 flex-1 gap-1">
        <Heading level="h3" as="h3">{name}</Heading>
        <p className="text-label-md font-semibold text-ink">{service}</p>
        {line && <Text size="sm" muted>{line}</Text>}
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-muted">
          {area && <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="size-3.5" />{area}</span>}
          {availability && <span className="inline-flex items-center gap-1"><Calendar aria-hidden="true" className="size-3.5" />{availability}</span>}
        </p>
      </div>
      <div className="grid gap-1 border-line sm:w-52 sm:border-l sm:pl-5">
        <div className="flex items-start justify-between gap-2">
          {rate && <p className="font-display text-heading-lg whitespace-nowrap text-ink">{rate}</p>}
          {onSave && <button type="button" onClick={onSave} aria-pressed={saved} aria-label={saved ? `Saved ${name}` : `Save ${name}`} className="grid size-11 place-items-center rounded-md text-ink hover:bg-surface-hover"><Bookmark aria-hidden="true" className={cx("size-5", saved && "fill-current")} /></button>}
        </div>
        {minimum && <Text size="xs" muted>{minimum}</Text>}
        <TextLink href={href} kind="external">View profile</TextLink>
      </div>
    </article>
  );
}

/** A service in a grid: icon in a gold ring, serif title, one line, View service. */
export function ServiceTile({ icon: Icon, title, description, href }: { icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; title: string; description: string; href: string }) {
  return (
    <article className="flex gap-4 rounded-lg border border-line bg-surface p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-gold-soft ring-2 ring-accent-gold"><Icon aria-hidden className="size-5 text-ink" /></span>
      <div className="grid gap-1"><Heading level="h4" as="h3">{title}</Heading><Text size="sm" muted>{description}</Text><TextLink href={href} kind="external">View service</TextLink></div>
    </article>
  );
}
