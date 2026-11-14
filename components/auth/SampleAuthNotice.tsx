"use client";
import { Banner } from "@ds/components";
import { data } from "@/lib/data";
import { clerkEnabled } from "@/lib/auth/clerk";
import { realAccountLinks } from "@/lib/auth/preview-links";
import { basePath } from "@/lib/site";

/** Explain the existing demo, without enabling an identity provider or depicting a fake Google action. */
export function SampleAuthNotice({ passiveGuide = false }: { passiveGuide?: boolean }) {
  // Hub frames always use isolated fictional sessions, including on Clerk-enabled Pages.
  // Keep this explanation and its real-entry links accessible outside their inert documents.
  if (data.kind !== "sample" || (!passiveGuide && clerkEnabled)) return null;
  const links = realAccountLinks(basePath);
  return <Banner tone="info" title="Sample account preview" className="mb-5">
    <p>These forms use fictional profiles stored in this browser. They do not sign in to a real account or run Google authentication.</p>
    <p className="mt-2">Open the real account flow to see the available sign-in options.</p>
    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
      <a href={links.join} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Real account sign up</a>
      <a href={links.login} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Real account log in</a>
    </div>
  </Banner>;
}
