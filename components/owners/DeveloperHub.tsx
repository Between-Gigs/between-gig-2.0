"use client";
import { OwnerGate } from "./OwnerGate";
import { OwnerShell } from "./OwnerShell";
import { data } from "@/lib/data";
import { markArea } from "@/lib/split-area";
import { basePath } from "@/lib/site";
markArea("bg-split:dashboard");
export function DeveloperHub() {
  const sampleHub = data.kind === "live" || basePath === "/hub" ? "/hub/" : `${basePath}/hub/`;
  const href = `${sampleHub}?embedded=developer`;
  return <OwnerGate>{() => <OwnerShell><section className="grid gap-4 pb-6">
    <div><p className="text-label-md text-ink-muted">Developer Mode</p><h1 className="font-display text-heading-xl text-ink">Hub</h1></div>
    <p className="max-w-3xl text-body-md text-ink-muted">The Hub below is a fictional sample workspace. Your signed-in account and live team permissions stay in this outer navigation.</p>
    <a href={sampleHub} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-label-md text-ink underline">Open sample Hub in a separate tab</a>
    <iframe title="Fictional sample Hub" src={href} data-developer-hub="" name="bg-preview:visitor" className="h-200 w-full rounded-lg border border-line bg-bg" />
  </section></OwnerShell>}</OwnerGate>;
}
