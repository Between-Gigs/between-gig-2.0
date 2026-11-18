import { serviceCategory } from "@/lib/profile/service-catalogue";

/** Guidance stays separate from the editable personal answer and is never submitted as profile data. */
export function ServiceGuidance({ service }: { service: string }) {
  const category = serviceCategory(service);
  if (!category) return null;
  return <div className="grid min-w-0 gap-3">
    <p className="text-body-sm text-ink-muted italic">{category.tagline}</p>
    <details className="rounded-md border border-line px-3 py-2">
      <summary className="cursor-pointer py-1 text-body-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-focus">Explore service examples</summary>
      <dl className="grid gap-4 pb-2 pt-3">
        {category.examples.map(example => <div key={example.title} className="grid gap-1">
          <dt className="text-body-sm font-semibold text-ink">{example.title}</dt>
          <dd className="text-body-sm text-ink-muted">{example.description}</dd>
        </div>)}
      </dl>
    </details>
  </div>;
}
