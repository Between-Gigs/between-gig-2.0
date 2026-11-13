import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { asset } from "@/lib/site";
import { accountPath, JourneyFrame } from "./JourneyFrame";

/** Candidate-facing version of the Stage 2 invitation, with one invitation action. */
export function JourneyInvitation() {
  return (
    <JourneyFrame step="invitation">
      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-6 sm:px-6 sm:py-10">
        <p className="text-eyebrow text-ink-muted uppercase">Alternative journey · Invitation preview</p>
        <article data-theme="light" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-md" aria-labelledby="journey-invitation-title">
          <div className="bg-surface-sunken bg-cover bg-center px-4 py-10 sm:px-20 sm:py-16"
            style={{ backgroundImage: `url("${asset("art/stage/still-life-portrait.jpg")}")` }}>
            <div className="mx-auto grid max-w-lg justify-items-center gap-5 rounded-lg bg-bg px-5 py-8 text-center text-ink shadow-lg sm:px-10 sm:py-10">
              <img src={asset("email/between-gigs-wide-on-light.png")} alt="Between Gigs" className="h-8 w-auto" />
              <p className="mt-2 text-eyebrow text-ink-brand uppercase">Your invitation · Stage 2</p>
              <h1 id="journey-invitation-title" className="font-serif text-display-sm font-semibold leading-tight text-balance text-forest-800">Welcome to the Gigster community.</h1>
              <p className="text-body-md text-ink">We’ve been hard at work behind the scenes, and we’re excited to take the next step with you!</p>
              <p className="text-body-md text-ink">Bring a photo, a few credits and a short description of the jobs people can hire you for. Add your starting rate and tell us where and when you’re available.</p>
              <Link href={accountPath} className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest-800 px-5 py-3 text-label-md font-bold text-white hover:bg-forest-700">
                Create your profile<ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>
            </div>
          </div>
          <div className="mx-auto grid max-w-2xl gap-3 px-5 py-7 text-center sm:px-8">
            <h2 className="font-display text-heading-sm text-ink">What happens next?</h2>
            <p className="text-body-md text-ink-muted">After you submit, our team reviews your profile. Once we’ve assembled our founding Gigsters, we’ll introduce your skills and services to the public.</p>
            <p className="mt-2 text-label-md text-ink-brand">The Between Gigs Team</p>
          </div>
        </article>
      </div>
    </JourneyFrame>
  );
}
