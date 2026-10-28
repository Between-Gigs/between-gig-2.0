import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/PolicyPage";
import { PrivacyRequest } from "@/components/policy/PrivacyRequest";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("privacy"), title: "Privacy Policy" };

export default function Page() {
  return (
    <PolicyPage title="Privacy Policy" sections={[
      { title: "What this page covers", body: <p>This policy describes information submitted to the Between Gigs Phase 1 website and LA waitlist. The marketplace is in development; this website does not accept bookings or payments.</p> },
      { title: "Information we collect", body: <>
        <p>The LA waitlist asks for your email, provider/customer/both selection, and ZIP code. The professional waitlist asks for email and ZIP code and records your interest as a provider. A category selected from a service or sample profile is saved with your signup. You may optionally share a service category and skills or project needs. The Storyboard’s project-request and professional-interest forms collect your name, follow-up email, location, project or service details, timing or availability, and optional budget, rate, or other details. Earlier feedback forms may also collect a name, city, and feedback. Privacy requests collect the email and message you provide.</p>
        <p>We also count page visits using the hostname, page path, timestamp and a random event ID. These are page views, not unique visitors; our counter does not store IP addresses, cookies, visitor IDs or URL query strings. Page-view tracking respects Global Privacy Control and Do Not Track. We record first-party counts of CTA choices and category interest, and summarize signup roles and ZIP codes to understand local demand. Click events have a random event ID, time, button location, role choice, and category; they do not include your email, a visitor identifier, or precise location. We do not add advertising trackers. Optional click tracking respects Global Privacy Control and Do Not Track signals.</p>
      </> },
      { title: "How we use it", body: <p>We use submissions to plan the launch, understand which skills and areas are of interest, contact you about Between Gigs and your stated interests, and respond to requests. We do not sell waitlist information or use it for targeted advertising.</p> },
      { title: "Storage and service providers", body: <p>Responses are stored in the website’s database and copied to a private Google Sheet for the Between Gigs team. Hosting is provided through Cloudflare; the spreadsheet connector uses Google services. These providers may process technical logs or essential cookies under their own policies. The site’s owner dashboard requires authentication. We do not publish your signup on this website.</p> },
      { title: "Your choices and retention", body: <p>Optional fields can be skipped. You can ask to leave the waitlist, access or correct your information, or request deletion using the form below. We retain information for launch planning, communications, and handling requests while it is needed for those purposes, subject to applicable legal requirements. Deletion requests must be reviewed across the site database and the Google Sheet, including any relevant backups.</p> },
      { title: "Security and updates", body: <p>Access to responses is restricted to the site owner in the dashboard and authorized spreadsheet collaborators. No system can guarantee absolute security. This service is intended for adults. If our information practices change, we will update this page and its effective date.</p> },
    ]}>
      <PrivacyRequest />
    </PolicyPage>
  );
}
