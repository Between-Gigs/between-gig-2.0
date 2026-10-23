// Every route QA visits, with the sample state it needs. `setup` runs in the page with window.bgSample
// (the sample DataSource's demo controls); `ready` waits for content; `act` interacts before the shot.
const reset = () => window.bgSample.reset();
const as = (role, id) => new Function(`return window.bgSample.reset().then(() => window.bgSample.signInAs(${JSON.stringify(role)}, ${JSON.stringify(id)}))`);

export const routes = [
  { name: "home", path: "/", ready: "h1" },
  { name: "preview-guide", path: "/preview/", ready: "h1" },
  // Milestone 5b: home page proposals.
  { name: "proposal-visitor", path: "/proposals/home/", setup: reset, ready: "#proposal-h" },
  { name: "proposal-gigster", path: "/proposals/home/?view=gigster", setup: reset, ready: "#g-hello" },
  { name: "proposal-owner", path: "/proposals/home/?view=owner", setup: reset, ready: "#o-today" },
  { name: "emails", path: "/emails/", ready: "h1" },
  { name: "email-invite", path: "/emails/invite/", ready: "iframe" },
  { name: "email-sign-in-code", path: "/emails/sign-in-code/", ready: "iframe" },
  { name: "email-profile-submitted", path: "/emails/profile-submitted/", ready: "iframe" },
  { name: "join-open", path: "/join/", setup: reset, ready: "form" },
  { name: "join-valid", path: "/join/?invite=riley-7q2m", setup: reset, ready: "form" },
  { name: "join-used", path: "/join/?invite=grace-3k8d", setup: reset, ready: "h1" },
  { name: "join-expired", path: "/join/?invite=sky-9x4p", setup: reset, ready: "h1" },
  { name: "join-unknown", path: "/join/?invite=not-a-real-invite", setup: reset, ready: "h1" },
  { name: "login", path: "/login/", setup: reset, ready: "form" },
  {
    name: "login-code", path: "/login/", setup: reset, ready: "form",
    act: async (page) => { await page.getByLabel("Email").fill("maya.chen@example.com"); await page.getByRole("button", { name: "Email me a code" }).click(); await page.getByLabel("6-digit code").waitFor(); },
  },
  { name: "profile-registered", path: "/profile/", setup: as("gigster", "grace-liu"), ready: "h1" },
  { name: "profile-draft", path: "/profile/", setup: as("gigster", "elena-petrova"), ready: "h1" },
  { name: "profile-submitted", path: "/profile/", setup: as("gigster", "imani-carter"), ready: "h1" },
  { name: "profile-changes", path: "/profile/", setup: as("gigster", "hana-kim"), ready: "h1" },
  { name: "profile-approved", path: "/profile/", setup: as("gigster", "maya"), ready: "h1" },
  { name: "builder-start", path: "/profile/edit/", setup: as("gigster", "grace-liu"), ready: "[data-step]" },
  { name: "builder-where", path: "/profile/edit/", setup: as("gigster", "elena-petrova"), ready: "[data-step]" },
  { name: "builder-review", path: "/profile/edit/?step=review", setup: as("gigster", "hana-kim"), ready: "[data-step]" },
  { name: "public-maya", path: "/p/maya/", setup: reset, ready: "h1" },
  { name: "public-monogram", path: "/p/dana-whitfield/", setup: reset, ready: "h1" },
  { name: "public-not-yet", path: "/p/imani-carter/", setup: reset, ready: "h1" },
  { name: "owner-gate", path: "/owners/people/", setup: reset, ready: "h1" },
  { name: "owner-people", path: "/owners/people/", setup: as("owner"), ready: "[data-results]" },
  { name: "owner-people-grid", path: "/owners/people/", setup: as("owner"), ready: "[data-results]", act: async (page) => { await page.getByRole("radio", { name: "Grid" }).click(); } },
  { name: "owner-person", path: "/owners/people/hana-kim/", setup: as("owner"), ready: "h1" },
  { name: "not-found", path: "/no-such-page/", ready: "h1" },
  // Milestone 3: the public funnel.
  { name: "professionals", path: "/professionals/", ready: "h1" },
  {
    name: "call-sheet-dialog", path: "/professionals/", setup: reset, ready: "h1",
    act: async (page) => { await page.getByRole("button", { name: "Get on the call sheet" }).first().click(); await page.getByRole("dialog").waitFor(); },
  },
  { name: "storyboard", path: "/storyboard/", ready: "h1" },
  { name: "crew-call", path: "/crew-call/", ready: "h1" },
  { name: "demo", path: "/demo/", setup: reset, ready: "iframe" },
  {
    name: "crew-call-form", path: "/crew-call/", ready: "h1",
    act: async (page) => { await page.getByRole("button", { name: "Carpentry & Custom Builds" }).click(); await page.getByRole("dialog").waitFor(); },
  },
  {
    name: "storyboard-form", path: "/storyboard/", setup: reset, ready: "h1",
    act: async (page) => { await page.getByRole("button", { name: "Offer your skills" }).click(); await page.getByRole("dialog").waitFor(); },
  },
  { name: "privacy", path: "/privacy/", ready: "h1" },
  { name: "terms", path: "/terms/", ready: "h1" },
  { name: "provider-standards", path: "/provider-standards/", ready: "h1" },
  { name: "licensing-insurance", path: "/licensing-insurance/", ready: "h1" },
  // Milestone 4: the owners' tools.
  { name: "owner-dashboard", path: "/owners/", setup: as("owner"), ready: "h1" },
  { name: "owner-dashboard-person", path: "/owners/", setup: as("owner"), ready: "h1", act: async (page) => { await page.getByRole("button", { name: "Ben Okafor" }).click(); await page.getByRole("dialog").waitFor(); } },
  { name: "owner-review-queue", path: "/owners/review/", setup: as("owner"), ready: "h1" },
  { name: "owner-review", path: "/owners/people/imani-carter/", setup: as("owner"), ready: "#review-h" },
  {
    name: "owner-suggest-edits", path: "/owners/people/theo-nakamura/", setup: as("owner"), ready: "#review-h",
    act: async (page) => { await page.getByRole("button", { name: "Suggest edits" }).click(); await page.getByRole("dialog").waitFor(); },
  },
  { name: "owner-waitlist", path: "/owners/waitlist/", setup: as("owner"), ready: "[data-results]" },
  { name: "email-approved", path: "/emails/approved/", ready: "iframe" },
  { name: "email-changes-requested", path: "/emails/changes-requested/", ready: "iframe" },
  { name: "email-welcome", path: "/emails/welcome/", ready: "iframe" },
  { name: "email-coming-soon", path: "/emails/coming-soon/", ready: "iframe" },
];
