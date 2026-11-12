"use client";
import { Camera, Check, ChevronDown, Circle, CircleCheck, CircleDot, CloudCheck, Pencil, Plus } from "lucide-react";
import * as React from "react";
import type { Person, ProfileFields } from "@/lib/data";
import { basisShort } from "@/lib/data/taxonomy";
import { pinnedCredits } from "@/lib/profile/validate";
import type { ProfilePartId } from "@/lib/profile/template";
import { asset } from "@/lib/site";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

type Part = ProfilePartId;

const names: Record<Part, string> = {
  name: "Name", position: "Department", photo: "Photo", years: "Years in the business", where: "Where you work",
  availability: "When you're free", about: "About", services: "Services", skills: "On-set skills", credits: "Credits",
  rate: "Starting rate", languages: "Languages", imdb: "IMDb link", details: "Work and booking details",
};

const sections: { part: Part; title: string; hint: string }[] = [
  { part: "about", title: "Introduce yourself", hint: "A few sentences on what you bring, in your own words." },
  { part: "services", title: "Add the services you offer", hint: "Everyday work you can help clients with." },
  { part: "skills", title: "Add your on-set skills", hint: "What you do in film and television." },
  { part: "credits", title: "Add your notable credits", hint: "Projects or productions you want people to know about." },
  { part: "imdb", title: "Add your IMDb link", hint: "The team uses this to review your profile." },
  { part: "details", title: "Work and booking details", hint: "How you work and how the team can reach you." },
];

interface Props {
  fields: ProfileFields;
  person: Person;
  order: readonly Part[];
  required: readonly Part[];
  editing: Part | null;
  next: Part | null;
  inline: boolean;
  panel: React.ReactNode;
  filled: (id: Part) => boolean;
  open: (id: Part) => void;
}

export function ModernCanvas({ fields: d, person, order, required, editing, next, inline, panel, filled, open }: Props) {
  const [navOpen, setNavOpen] = React.useState(false);
  const navId = React.useId();
  const done = required.filter(filled).length;
  const credits = pinnedCredits(d);
  const summary: Record<Part, string> = {
    photo: "", name: d.name, position: d.position, years: d.years ? `${d.years} years in the business` : "",
    where: d.market === "la" ? d.areas.join(" · ") : d.otherCity, availability: d.dates,
    rate: d.rate ? `$${d.rate} / ${basisShort[d.basis]}` : "", languages: d.languages,
    about: d.about, services: d.services.join(" · "), skills: d.skills.join(" · "), credits: credits.join(" · "),
    imdb: d.imdb, details: [d.hireableJobs, d.tools, d.transport, d.personality].filter(Boolean).join(" · "),
  };
  const status = person.status === "approved" ? "Live profile" : person.status === "submitted" ? "In review" : "Private draft";
  const editorHere = (part: Part) => inline && editing === part;
  const buttonLabel = (part: Part) => `${filled(part) ? "Edit" : "Add"} ${part === "photo" ? "your photo" : names[part].toLowerCase()}${required.includes(part) ? "" : " (optional)"}`;

  function field(part: Part, title = names[part], hint = "") {
    const active = editing === part;
    const value = summary[part];
    return (
      <div key={part} data-spot={part} data-field-open={editorHere(part) || undefined} className="mc-field">
        <button type="button" data-spot-edit="" aria-label={buttonLabel(part)} aria-pressed={active} onClick={() => open(part)}
          className="mc-field-button" hidden={editorHere(part)}>
          {value ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
          <span><strong>{value && !hint ? value : title}</strong>{hint && <small>{value || hint}</small>}</span>
          {!required.includes(part) && !value && <em>optional</em>}
        </button>
        {editorHere(part) && panel}
      </div>
    );
  }

  return (
    <div className="mc-workspace">
      <nav className="mc-nav" aria-label="Profile parts">
        <div className="mc-nav-top"><span>Your page</span><b>{required.length ? `${done}/${required.length}` : "Ready"}</b>
          <button type="button" aria-label="Show profile parts" aria-expanded={navOpen} aria-controls={navId} onClick={() => setNavOpen(!navOpen)}><ChevronDown aria-hidden="true" /></button>
        </div>
        <div id={navId} className="mc-nav-content" data-expanded={navOpen || undefined}>
          <ol>{order.map((part, i) => {
            const current = editing === part || (!editing && next === part);
            const Indicator = current ? CircleDot : filled(part) ? CircleCheck : Circle;
            return <li key={part}><button type="button" aria-current={current ? "step" : undefined} onClick={() => { setNavOpen(false); open(part); }}>
              <Indicator aria-hidden="true" /><span>{names[part]}</span><small>{required.includes(part) ? i + 1 : "optional"}</small>
            </button></li>;
          })}</ol>
          <p><CloudCheck aria-hidden="true" /><span>Everything saves as you go. Select a field on the page to fill it in.</span></p>
        </div>
      </nav>
      <article className="mc-paper" aria-label="Edit your profile on the page">
        <div className="mc-pagebar"><span className="mc-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="mc-handle">/p/{person.slug}/</span><span>{status}</span></div>
        <div className="mc-paper-body">
          <section className="mc-identity" aria-label="Profile identity">
            <div data-spot="photo"><button type="button" className="mc-portrait" data-spot-edit="" aria-pressed={editing === "photo"} aria-label={buttonLabel("photo")} onClick={() => open("photo")}>
              {d.photo ? <img src={asset(d.photo)} alt="" /> : <><Camera aria-hidden="true" /><span>Add photo</span></>}
            </button></div>
            <div data-spot="name" className="mc-name"><span>{d.name ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />} Name {d.name ? "· done" : ""}</span>
              <h1><button type="button" data-spot-edit="" aria-pressed={editing === "name"} aria-label={buttonLabel("name")} onClick={() => open("name")}>
                {d.name || "Your name"}<Pencil aria-hidden="true" /></button></h1></div>
          </section>
          <div className="mc-stories">
            {inline && (editing === "photo" || editing === "name") && panel}
            {field("position")}
            <div className="mc-facts">{(["years", "where", "availability", "languages"] as Part[]).map((part) => field(part))}</div>
            {sections.map(({ part, title, hint }) => <section className="mc-story" key={part} aria-label={names[part]}>
              <h2>{names[part]}</h2>{field(part, summary[part] ? names[part] : title, hint)}
            </section>)}
          </div>
          <aside className="mc-booking" aria-label="Booking card">
            <strong>{summary.rate || "Rate on request"}</strong>{field("rate")}
            <p>Clients see your starting rate here. You agree on the final price and dates together.</p>
          </aside>
        </div>
      </article>
    </div>
  );
}
