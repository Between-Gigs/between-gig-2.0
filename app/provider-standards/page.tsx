import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy/PolicyPage";

export const metadata: Metadata = { title: "Provider standards" };

export default function Page() {
  return (
    <PolicyPage title="Provider standards" sections={[
      { title: "The standards we’re designing for launch", body: <p>These are planned expectations for the future marketplace. No provider has been verified or approved through this waitlist, and the illustrative profiles are not actual listings.</p> },
      { title: "Identity and experience are different checks", body: <p>We plan to require an identity review before a provider can accept work. The process and verification provider are not yet finalized. Professional profiles are planned to include work samples, references where appropriate, and links to IMDb credits where available. An IMDb page alone is not an identity check, background check, license verification, or insurance confirmation.</p> },
      { title: "Accurate portfolios and clear services", body: <p>Providers will be expected to use work they are authorized to show, describe their role accurately, and define the services they can competently perform. A production credit is not a qualification for every kind of residential or commercial work.</p> },
      { title: "Clear agreements and professional conduct", body: <p>Before work begins, providers and customers should agree on scope, rates, expenses, timing, and boundaries. We are designing for respectful communication, consent before entering private spaces or sharing images, and a clear way to report concerns.</p> },
      { title: "Licenses and insurance", body: <p>Providers must hold licenses and coverage required for their actual services. We intend to show applicable qualifications distinctly from entertainment credits and general identity checks. See the <Link href="/licensing-insurance/">licensing and insurance disclosure</Link>.</p> },
      { title: "Provider control", body: <p>Our planned model lets professionals set their services, rates, and availability; decline projects; and pause for production work. Fees, payouts, client-relationship terms, and the final review process will be published before hiring opens.</p> },
    ]} />
  );
}
