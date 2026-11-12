"use client";
import * as React from "react";
import Link from "next/link";
import { Accordion, Button } from "@ds/components";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Camera, Clapperboard, ClipboardList,
  Hammer, Heart, House, Info, MapPin, Paintbrush, Scissors, Share, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { data } from "@/lib/data";
import { basisShort, insuranceLabel, modeLabel, monthStatusLabel } from "@/lib/data/taxonomy";
import { craftIcon } from "@/lib/icons3d";
import type { ProfileSectionId } from "@/lib/profile/template";
import { startDateLabel } from "@/lib/profile/stage-two";
import { asset } from "@/lib/site";
import type { ProfileLayoutProps } from "./ProfileView";
import { PublicBookingDetails } from "./PublicBookingDetails";

const serviceIcons: Partial<Record<ReturnType<typeof craftIcon>, LucideIcon>> = {
  artist_palette: Paintbrush, basket: ClipboardList, briefcase: BriefcaseBusiness, camera: Camera, clapper_board: Clapperboard,
  clipboard: ClipboardList, couch_and_lamp: House, dress: Scissors, hammer_and_wrench: Hammer, house: House,
  scissors: Scissors, sewing_needle: Scissors, toolbox: Wrench, video_camera: Camera, world_map: MapPin,
};
const sectionTitles: Record<ProfileSectionId, string> = {
  about: "About", services: "Services", work: "Work", credits: "On set", details: "Details", questions: "Questions",
};

/** Direction E. The same parts, actions and public data feed the live page and the editable canvas. */
export function ModernProfile({ person, fields: f, mode, embedded, draft, part, aside, first, callName, pageLabel,
  services, helps, portfolio, sample, editing, show, priced, rate, where, credits, unseen, reviewed, P,
  creditRows, questions, sections, saved, onSave, onShare, onPhoto, onRequest, ids, similar = [] }: ProfileLayoutProps) {
  const Name = embedded || mode === "owner" ? "h2" : "h1";
  const offered = helps.length ? helps : services;
  const dates = monthStatusLabel[f.monthStatus];
  const how = [modeLabel[f.mode], f.travel, f.transport, !unseen && f.insurance === "yes" ? insuranceLabel.yes : ""].filter(Boolean).join(" · ");
  const start = data.kind === "sample" ? startDateLabel(f.earliestStart) : "";
  const minimum = data.kind === "sample" ? f.bookingMinimum?.trim() : "";
  const availability = <div className="modern-availability">
    <b><i data-away={f.monthStatus === "away"} />{dates}</b>{f.dates && <p>{f.dates}</p>}
    {(start || minimum) && <dl>{start && <div><dt>Earliest start</dt><dd>{start}</dd></div>}
      {minimum && <div><dt>Minimum booking</dt><dd>{minimum}</dd></div>}</dl>}
  </div>;
  const stats: [string, React.ReactNode][] = [];
  if (f.years || editing) stats.push(["In the business", part ? part("years", { content: f.years || null, hint: "Add years", kind: "line" }) : <>{f.years}<small> yrs</small></>]);
  if (offered.length) stats.push([offered.length === 1 ? "Service" : "Services", offered.length]);
  if (credits.length) stats.push([credits.length === 1 ? "Credit" : "Credits", credits.length]);
  if (priced) stats.push(["Starting rate", <>${f.rate}<small>/{basisShort[f.basis]}</small></>]);

  const facts = [
    ["Works in", where], ["Where", modeLabel[f.mode]], ["Travel", [f.travel, f.transport].filter(Boolean).join(" · ")],
    ["Speaks", f.languages], ["Brings", f.tools],
  ].filter(([,value]) => value);

  const body: Partial<Record<ProfileSectionId, React.ReactNode>> = {
    about: (show || f.about.trim()) && P("about", !!f.about.trim(),
      <p className="whitespace-pre-line">{f.about}</p>, "Your experience, what you offer and what it’s like to work with you.", "block"),
    services: (show || offered.length > 0 || !!f.hireableJobs?.trim()) && P("services", offered.length > 0 || !!f.other.trim() || !!f.hireableJobs?.trim(),
      <div className="grid gap-3">
        {data.kind === "sample" && f.hireableJobs?.trim() && <p>{f.hireableJobs}</p>}
        {offered.length > 0 && <ol className="modern-services">{offered.map((s, i) => {
          const Icon = serviceIcons[craftIcon(s, f.position)] ?? Sparkles;
          return <li key={s}><span><Icon aria-hidden="true" size={17} /></span><b>{s}</b><small>{String(i + 1).padStart(2, "0")}</small></li>;
        })}</ol>}
        {editing && f.other && <p className="text-ink-muted">Something else, in private review: {f.other}</p>}
      </div>, "The services you'd offer clients between gigs", "block"),
    work: portfolio.length > 0 && <><ul className="modern-work">{portfolio.slice(0, 4).map((item, i) => (
      <li key={item.src}><button type="button" onClick={() => onPhoto(i)} aria-label={`Open image: ${item.caption}`}>
        <img src={asset(item.src)} alt="" loading="lazy" /><small>{String(i + 1).padStart(2, "0")}</small>
      </button></li>))}</ul>
      <div className="mt-3 flex flex-wrap items-center gap-3"><Button size="sm" variant="secondary" onClick={() => onPhoto(0)}>Show all {portfolio.length} photos</Button>
        {sample && <p className="text-body-sm text-ink-muted">Concept images showing the kind of work to discuss, not completed client projects.</p>}</div></>,
    credits: (show || credits.length > 0 || f.skills.length > 0 || (mode === "owner" && !!f.imdb)) && <div className="grid gap-3">
      {P("skills", !!f.skills.length, <div className="flex flex-wrap gap-2">{f.skills.map(s => <span className="modern-label" key={s}>{s}</span>)}</div>, "Your on-set skills", "block")}
      {P("credits", !!credits.length, <ol className="modern-credits">{creditRows.map(({title, role}, i) => <li key={credits[i]}><Clapperboard size={17} aria-hidden="true" /><div><b>{title}</b>{role && <p>{role}</p>}</div></li>)}</ol>, "Your notable credits, best first", "block")}
      {(mode === "owner" || editing || draft) && P("imdb", !!f.imdb, <p className="text-body-sm text-ink-muted"><a href={f.imdb} className="text-link underline" target="_blank" rel="noreferrer">IMDb page</a> · only the Between Gigs team sees this</p>, "Your IMDb link. Only the team sees it.", "block")}
    </div>,
    details: <div className="grid gap-3">
      <dl className="modern-facts">
        {(where || show) && <div><dt>Works in</dt><dd>{P("where", !!where, where, "Where you work", "block")}</dd></div>}
        <div><dt>Availability</dt><dd>{P("availability", !!f.dates.trim() || !show, [dates, f.dates].filter(Boolean).join(" · "), "When you’re free this month", "block")}</dd></div>
        {(rate || show) && <div><dt>Rate</dt><dd>{P("rate", !!rate, rate, "Your starting rate", "block")}</dd></div>}
        {(f.languages || show) && <div><dt>Languages</dt><dd>{P("languages", !!f.languages.trim(), f.languages, "Languages", "block")}</dd></div>}
        <div><dt>How {first} works</dt><dd>{P("details", !!(f.tools.trim() || f.transport.trim()) || !show,
          [how, f.tools].filter(Boolean).join(" · "), "Tools, transport, insurance and how you work", "block")}</dd></div>
      </dl>
      {data.kind === "sample" && <PublicBookingDetails earliestStart={f.earliestStart} bookingMinimum={f.bookingMinimum} personality={f.personality} />}
    </div>,
    questions: !editing && <Accordion variant="flush" items={questions} />,
  };
  const present = sections.filter(key => body[key]);
  const nav = present.filter(key => key === "services" || key === "work" || key === "credits");
  const [active, setActive] = React.useState("overview");
  const navKey = nav.join(",");
  React.useEffect(() => {
    const ordered = ["overview", ...navKey.split(",").filter(Boolean)];
    const targets = ordered.map(id => [id, document.getElementById(`${ids}-${id}`)] as const);
    const sync = () => {
      let current = "overview";
      for (const [id, node] of targets) if (node && node.getBoundingClientRect().top <= 155) current = id;
      setActive(current);
    };
    sync();
    window.addEventListener("scroll", sync, {passive:true});
    return () => window.removeEventListener("scroll", sync);
  }, [ids, navKey]);
  const actions = mode === "public" && !editing && <div className="modern-actions">
    <Button size="sm" variant="secondary" iconStart={<Heart className={saved ? "fill-current" : ""} />} aria-pressed={saved} onClick={onSave}>{saved ? "Saved" : "Save"}</Button>
    <Button size="sm" variant="secondary" iconStart={<Share />} onClick={onShare}>Share</Button>
  </div>;
  const checks = <section className="modern-panel modern-checks"><h2>What we&apos;ve checked</h2><ul>
    <li><BadgeCheck size={16} aria-hidden="true" />{reviewed ? "Profile reviewed by the Between Gigs team" : "The team reviews this profile before it goes public"}</li>
    <li><Info size={16} aria-hidden="true" />Credits and details are shared by {first}, not independently verified.</li>
  </ul></section>;

  return <div className="modern-profile">
    <section id={`${ids}-overview`} aria-label={`About ${first}`} className="modern-identity">
      <div className="modern-portrait">{P("photo", !!f.photo || !show,
        <PersonPhoto id={person.id} morph={!editing} name={f.name} src={f.photo || undefined} fallback="brand" department={f.position} skills={f.skills}
          alt={f.photo ? `Portrait of ${f.name}${sample ? " (fictional)" : ""}` : undefined} className="size-full object-cover" />, "Add photo", "photo")}</div>
      <div className="modern-identity-copy">
        <div className="modern-badges">{reviewed && <span><BadgeCheck size={13} aria-hidden="true" />Reviewed by Between Gigs</span>}
          {reviewed && <span className="modern-status"><i data-away={f.monthStatus === "away"} />{dates}</span>}{editing && <span>{pageLabel}</span>}</div>
        {P("name", !!f.name.trim(), <Name>{f.name}</Name>, "Your name", "title")}
        <div className="modern-byline">{P("position", !!f.position, <span>{f.position}</span>, "Department")}{where && <span>{where}</span>}</div>
      </div>
    </section>
    <div className="modern-layout"><div className="modern-story">
      <div className="modern-profile-tools">
        <nav aria-label="Profile sections"><a href={`#${ids}-overview`} aria-current={active === "overview" ? "location" : undefined}>Overview</a>
          {nav.map(key => <a key={key} href={`#${ids}-${key}`} aria-current={active === key ? "location" : undefined}>{sectionTitles[key]}</a>)}</nav>{actions}
      </div>
      {stats.length > 0 && <dl className="modern-stats">{stats.map(([k,v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
      {!aside && <div className="modern-mobile-status">{availability}</div>}
      {present.map(key => <section id={`${ids}-${key}`} data-profile-section={key} key={key} className="modern-content">
        <header><h2>{sectionTitles[key]}</h2>{key === "services" && offered.length > 0 && <small>{offered.length} offered</small>}
          {key === "work" && <small>{portfolio.length} photos</small>}</header>{body[key]}
      </section>)}
      {sample && !editing && <p className="mt-6 text-body-sm text-ink-muted">This is a fictional sample profile: the person, biography and credits are made up for the preview.</p>}
    </div>
    <aside className="modern-rail" aria-label={aside ? "Editor" : `${first} at a glance`}>{aside ?? <>
      <section aria-label={`Book ${first}`} className="modern-panel modern-book">
        <p>{priced ? <><b>${f.rate}</b> / {basisShort[f.basis]} · starting rate</> : <b>Rate on request</b>}</p>
        {availability}
        <Button variant="primary" fullWidth disabled={mode !== "public"} iconEnd={<ArrowRight />} onClick={onRequest}>Request {callName}</Button>
        <p>{mode === "public" ? "You won't be charged. Scope and rate are agreed first." : mode === "own" ? "Clients see this card on your profile." : "Owner view: requests are off here."}</p>
      </section>
      {facts.length > 0 && sections.includes("details") && <section aria-label="At a glance" className="modern-panel"><dl className="modern-facts compact">
        {facts.map(([k,v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl></section>}{checks}</>}</aside>
    </div>
    {similar.length > 0 && <section className="modern-content"><header><h2>More Gigsters like {first}</h2><Link className="text-link underline" href="/p/">Browse all Gigsters</Link></header>
      <ul className="modern-similar">{similar.slice(0,3).map(({person:p,profile}) => <li key={p.id}><Link href={`/p/${p.slug}/`}>
        <PersonPhoto id={p.id} name={p.name} src={profile.fields.photo || undefined} alt="" className="size-12 shrink-0 rounded-md object-cover" /><span><b>{p.name}</b><small>{profile.fields.position || profile.fields.services[0]}</small></span><ArrowRight size={15} aria-hidden="true" /></Link></li>)}</ul></section>}
    {mode === "public" && !aside && <div className="modern-mobile-request"><span>{rate || "Rate on request"}</span><Button variant="primary" size="sm" iconEnd={<ArrowRight />} onClick={onRequest}>Request {callName}</Button></div>}
  </div>;
}
