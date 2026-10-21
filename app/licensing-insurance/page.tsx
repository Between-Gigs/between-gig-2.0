import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/PolicyPage";

export const metadata: Metadata = { title: "Licensing and insurance" };

export default function Page() {
  return (
    <PolicyPage title="Licensing and insurance disclosure" sections={[
      { title: "Industry skills are not a contractor’s license", body: <p>A set carpenter, art director, or other entertainment professional is not automatically licensed or insured for residential construction, structural work, electrical work, plumbing, or other regulated services. IMDb credits and a portfolio do not establish those qualifications.</p> },
      { title: "Understand the actual scope", body: <p>Our creative-build examples focus on freestanding furniture and display pieces. Whether a specific project needs a license, permit, or particular insurance depends on its scope and location. Describing work as a “creative build” does not exempt it from applicable requirements.</p> },
      { title: "Check before hiring", body: <p>Before agreeing to regulated work in California, check the professional’s license status and relevant classification through the <a href="https://www.cslb.ca.gov/onlineservices/checklicenseII/checklicense.aspx" target="_blank" rel="noreferrer">Contractors State License Board</a>. Confirm insurance directly with the provider and insurer, including what activities, workers, and potential damage are covered. Review CSLB’s <a href="https://www.cslb.ca.gov/consumers/hire_a_contractor/finding_the_right_contractor.aspx" target="_blank" rel="noreferrer">guidance on hiring a contractor</a>.</p> },
      { title: "This preview provides no coverage or verification", body: <p>No bookings take place through this page. Between Gigs is not providing insurance, a coverage guarantee, or a representation that any illustrative profile is licensed, insured, background-checked, or verified. The future marketplace’s verification and insurance arrangements will be explained before hiring opens.</p> },
    ]} />
  );
}
