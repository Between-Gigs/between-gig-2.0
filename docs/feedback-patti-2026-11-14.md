# Patti review — 14 November 2026

Source: Justin’s complete pasted annotation text and the attached overview contact sheet. Numbering here is the intake order, not a claim to recover original screenshot marker IDs. Individual full-resolution annotation images were not supplied here. This text is sufficient to begin implementation; unclear pixels are not inferred as extra requests.

Primary review: https://test.between-gigs.com
Frontend: Between-Gigs/between-gig-2.0
Backend: Playset-LLC/Company-OS
Baseline: 1adf0f2f26b7825045cd6a9fdd0ce3364e4ee287
Release target: Railway test and GitHub Pages; production remains a separate later release.

## Acceptance checklist (57 items)

Implementation status: drafted on this branch. Unchecked items are not yet accepted as complete; live/backend and browser verification are recorded in docs/handoff/patti-review-2026-11-14.md.

- [ ] **01 · Home / signup** — Make FOUNDING GIGSTERS a little bigger.

- [ ] **02 · Signup** — Remove: First, create or verify your sign-in with Clerk. Then confirm your name and agree… (redundant).

- [ ] **03 · Signup** — Remove the extra Create your account heading because it appears below.

- [ ] **04 · Signup** — Replace profile introduction with: Create your profile to connect with people and businesses looking for the expertise you bring from behind the scenes.

- [ ] **05 · Sign in** — Make WELCOME BACK bigger, consistent with the signup page.

- [ ] **06 · Sign in** — Use phone → Use phone number.

- [ ] **07 · Invitation** — Start Let us help you put them to work. on the next line after Your skills have value beyond the set.

- [ ] **08 · Invitation** — Make YOU’RE INVITED / Your craft. More possibilities. a little bigger.

- [ ] **09 · Invitation** — What happens next closing: and begin connecting you with new opportunities in the coming weeks.

- [ ] **10 · Invitation** — YOUR BETWEEN GIGS TEAM → The Between Gigs Team.

- [ ] **11 · Invitation** — Ensure Unsubscribe actually works with Resend / the sending system; verify the full suppression path.

- [ ] **12 · Profile / location** — Remove Areas you serve.

- [ ] **13 · Profile / location** — Make Travel radius required; use a select with mileage choices.

- [ ] **14 · Profile / location** — Choices: Up to 5 miles, Up to 15 miles, Up to 25 miles, Up to 50 miles.

- [ ] **15 · Profile / location** — Add a checkbox for willingness to travel beyond Los Angeles.

- [ ] **16 · Profile / location** — For Los Angeles, label ZIP code (remove or postal).

- [ ] **17 · Profile / location** — For Somewhere else, keep ZIP or postal code and support international letters / more than five characters; LA accepts only a five-digit ZIP.

- [ ] **18 · Profile / services** — Textarea prompt should be an instruction, not an example (example is underneath).

- [ ] **19 · Profile / services** — Allow users to reorder services.

- [ ] **20 · Profile / services** — Name your own service should be a discoverable Other option.

- [ ] **21 · Profile / services** — Your own service → Name of the Service.

- [ ] **22 · Profile / services** — Say choose a service, not name a service. One clear service is enough to start. Five is the maximum.

- [ ] **23 · Profile / services** — Move Example: Hang artwork and style a room for a party. beneath What can a customer hire you to do? and above the input.

- [ ] **24 · Profile / services** — Remove Not on the list? from the new service review note.

- [ ] **25 · Profile / rates** — Starting project price option → By Project.

- [ ] **26 · Profile / rates** — Hourly rate option → Hourly. (User wrote remove word reate.)

- [ ] **27 · Profile / rates** — If Hourly selected, show required hourly amount and optional minimum hours.

- [ ] **28 · Profile / rates** — Hourly and By Project can both be selected. Require at least one.

- [ ] **29 · Profile / rates** — Replace introductory rate note with: Materials and travel can be agreed to separately as needed.

- [ ] **30 · Profile / rates** — For project pricing, ask only optional minimum project price.

- [ ] **31 · Profile / availability** — Visually separate availability from rate questions.

- [ ] **32 · Profile / availability** — Remove This month · November 2026 (and the corresponding dynamic month line).

- [ ] **33 · Profile / availability** — Limited → Limited Availability.

- [ ] **34 · Profile / showcase** — Give each work sample an optional short description.

- [ ] **35 · Profile / showcase** — Work samples → Showcase your work.

- [ ] **36 · Profile / showcase** — Description: Show customers what you can do! Upload photos, videos, or examples of past projects that demonstrate your skills and experience. These can be from your work in film and television or projects you’ve completed outside the industry.

Only share work you have permission to display.

- [ ] **37 · Profile / showcase** — Support choosing image or video, video thumbnail, link or upload, and reasonable size and duration limits.

- [ ] **38 · Profile / experience** — Move Skills & experience before services.

- [ ] **39 · Profile / experience** — On-set skills should be searchable / suggested tags or chips, with custom entries; spreadsheet options will come later.

- [ ] **40 · Profile / experience** — Remove Department or role.

- [ ] **41 · Profile / experience** — Question uses in the entertainment industry instead of film and television.

- [ ] **42 · Profile / experience** — Years in film and TV → Years in the Entertainment Industry.

- [ ] **43 · Profile / experience** — How that experience helps → How can customers benefit from your entertainment industry experience?

- [ ] **44 · Profile / experience** — Example: For example: “Building sets for film and television. I bring that same craftsmanship, creativity, and attention to detail to custom furniture, home improvements, and special projects.”

- [ ] **45 · Profile / credits** — Credit role label → Your role or Title.

- [ ] **46 · Profile / credits** — Credit production label → Name of the Production.

- [ ] **47 · Profile / credits** — Add optional LinkedIn.

- [ ] **48 · Profile / credits** — Remove Helps the team confirm your credits. Clients don’t see it.

- [ ] **49 · Profile / personality** — Explain the purpose: Let your potential clients get to know you better.

- [ ] **50 · Profile / details** — Where you work, multiple selections: On Site, at the client’s location. / At my office, studio or other place of business.

- [ ] **51 · Profile / details** — Remove Transport.

- [ ] **52 · Profile / details** — Tools/equipment example: Special Cameras, Lighting Kit, Box Truck, Makeup kit, etc.; multiline input, 3–5 lines maximum.

- [ ] **53 · Profile / details** — When I have liability insurance selected, let the user describe it.

- [ ] **54 · Profile / contact** — Private booking contact → Contact Information.

- [ ] **55 · Profile / contact** — For number, let users select SMS, Phone, WhatsApp. Add separate clear booking/project contact permission and optional BG marketing/general update permission; improve wording and comply with applicable requirements.

- [x] **56 · Profile / submit** — Exact copy already shipped in PR #40: You’re Almost There!

Preview your profile to see how it will appear to potential customers. Once you’re happy with it, submit it to the Between Gigs team for review.

Your profile will remain private until it’s approved and we’re ready to make it public.

- [ ] **57 · Professionals** — Keep Get discovered, get hired on the same line.

## Verification plan

Check sign-up / sign-in headings and phone copy, invitation HTML and text plus actual unsubscribe routing, editor autosave and reload through both sample and Company OS adapters, validation and rates combinations, ordered services and showcases, media limits, contact permission persistence and separation, reviewed/public privacy, and mobile / desktop layout. Run typecheck, lint, relevant behavior tests, builds, and review the integrated diff twice before release. Record item-level completion and any exact backend blocker here.
