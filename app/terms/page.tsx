import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy/PolicyPage";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("terms"), title: "Terms of Use" };

export default function Page() {
  return (
    <PolicyPage title="Terms of Use" sections={[
      { title: "A preview and waitlist", body: <p>Between Gigs is developing a platform connecting entertainment professionals with people and businesses who need their skills. This website collects interest and feedback. Joining the waitlist is free and does not create a booking, employment relationship, provider listing, or promise of work or access by a particular date.</p> },
      { title: "Illustrative content", body: <p>Sample profiles are fictional and cannot be booked. Their portraits, portfolio images, credits, prices, and availability are illustrative. Planned features—including identity verification, IMDb links, provider-set rates, and payment processing—are not active services on this waitlist.</p> },
      { title: "Using the website", body: <p>Provide accurate information you are authorized to share. Do not submit unlawful content, spam, another person’s private information without permission, or material that infringes others’ rights. Do not attempt unauthorized access or interfere with the website.</p> },
      { title: "Your submissions", body: <p>You retain rights in the original material you submit. By sending a response, you allow Between Gigs to store and use it to operate the waitlist, plan the service, and respond to your interest, as described in the <Link href="/privacy/">Privacy Policy</Link>. A submission does not grant us permission to publish your portfolio as a public provider profile.</p> },
      { title: "Future marketplace terms", body: <p>Fees, commissions, payout timing, cancellation terms, client communication, and repeat-booking arrangements remain under development. Separate terms will be presented before people can offer or book services. No payment is requested here.</p> },
      { title: "Qualifications and third-party links", body: <p>Entertainment experience does not establish professional licensing, insurance, identity verification, or a background check. Read the <Link href="/provider-standards/">provider standards</Link> and <Link href="/licensing-insurance/">licensing and insurance disclosure</Link>. Third-party sites operate under their own terms and privacy practices.</p> },
      { title: "Site materials and questions", body: <p>Between Gigs and its licensors retain rights in protected site materials. BETWEEN GIGS™ is a trademark of Between Gigs. Nothing here limits rights that applicable law does not allow to be limited. Questions about these terms can be sent through our <Link href="/privacy/#request">contact form</Link>.</p> },
    ]} />
  );
}
