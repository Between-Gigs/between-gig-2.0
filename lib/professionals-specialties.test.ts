import {describe,expect,it} from "vitest";
import {specialties,everydaySpecialties,productionBackgrounds} from "@/components/landing/professionals-approved-copy";

// Original page copy, independently inspected in Library screenshots and the live source.
// These are marketing descriptions, not new catalogue options or claims about a member.
describe("original public Professionals specialty descriptions",()=>{
 it("preserves all 8 specialties names and exact descriptions",()=>{
  expect(specialties).toEqual([
  {
    "name": "Photography & Videography",
    "description": "Photography, videos and original video production"
  },
  {
    "name": "Locations & Location Management",
    "description": "Scouting, coordination and practical location logistics"
  },
  {
    "name": "Vectorworks & CAD",
    "description": "Drafting and visualization; professional sign-off is separate"
  },
  {
    "name": "Costumes, Cosplay & Custom-made Clothing",
    "description": "Tailoring, alterations and custom costume construction"
  },
  {
    "name": "Landscaping & Greens",
    "description": "Landscaping and plant/greenery specialties confirmed by the provider"
  },
  {
    "name": "Wardrobe & Personal Styling",
    "description": "Personal styling and outfits for a person or occasion"
  },
  {
    "name": "Personal Shopping",
    "description": "Source clothing, gifts and everyday items"
  },
  {
    "name": "Closet & Wardrobe Organization",
    "description": "Sort clothing and create an organized wardrobe"
  }
]);
 });
 it("preserves all 5 everydaySpecialties names and exact descriptions",()=>{
  expect(everydaySpecialties).toEqual([
  {
    "name": "Wallpaper Installation",
    "description": "Wallcovering preparation and installation, with surface condition and job scope agreed first."
  },
  {
    "name": "Project Management",
    "description": "Timelines, logistics, scheduling and coordination for an agreed project."
  },
  {
    "name": "Math & Technical Tutoring",
    "description": "Teaching and study support in a tutor’s demonstrated subject. Not engineering design, certification or professional sign-off."
  },
  {
    "name": "Costume Aging & Dyeing",
    "description": "Character finishes and color work for clothing or costumes; materials, care and safe handling to confirm."
  },
  {
    "name": "Wardrobe & Laundry Care",
    "description": "Garment-specific cleaning and care, with fabric requirements and specialist treatments agreed first."
  }
]);
 });
 it("preserves all 7 productionBackgrounds names and exact descriptions",()=>{
  expect(productionBackgrounds).toEqual([
  {
    "name": "Rigging",
    "description": "Specialist rigging inquiry only. Relevant credentials, venue rules, insurance and job-specific safety review are required; no provider is matched here."
  },
  {
    "name": "Stunts",
    "description": "Industry background and specialist inquiry only. Training, supervision, insurance and job-specific safety must be reviewed before any work."
  },
  {
    "name": "Intimacy Coordination",
    "description": "Specialist production background. Training, consent protocols and the specific production scope need review; no provider is matched here."
  },
  {
    "name": "Armorer",
    "description": "Industry background only. This listing does not offer weapons, handling or instruction. Any production inquiry requires separate legal, credential and safety review."
  },
  {
    "name": "SFX Makeup",
    "description": "Character and special-effects makeup inquiry. Confirm the artist’s specific experience, materials and application requirements; generic makeup experience is not sufficient."
  },
  {
    "name": "Pyrotechnics",
    "description": "Industry background only, not an available fireworks service. Licensing, permissions, insurance and a separate safety review are required; no provider is matched here."
  },
  {
    "name": "Production Medic",
    "description": "Industry background only. No medical advice, care or emergency response is offered here. Any production request requires separate licensing and scope review."
  }
]);
 });
});
