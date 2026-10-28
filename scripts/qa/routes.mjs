// Studio: opens the CMS and a collection, from the tool bar or, on narrow screens, the panels drawer.
const studioCms = async (page, name) => {
  const menu = page.getByRole("button", { name: "Open panels" });
  if (await menu.isVisible()) { await menu.click(); await page.getByRole("dialog").getByRole("button", { name: "CMS", exact: true }).click(); if (name) await page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${name}`) }).first().click(); else await page.keyboard.press("Escape"); }
  else { await page.getByRole("button", { name: "CMS (J)" }).click(); if (name) await page.getByRole("complementary", { name: "CMS" }).getByRole("button", { name: new RegExp(`^${name}`) }).first().click(); }
  await page.locator("main [role=tablist]").waitFor();
};

// Every route QA visits, with the sample state it needs. `setup` runs in the page with window.bgSample
// (the sample DataSource's demo controls); `ready` waits for content; `act` interacts before the shot.
const reset = () => window.bgSample.reset();
const as = (role, id) => new Function(`return window.bgSample.reset().then(() => window.bgSample.signInAs(${JSON.stringify(role)}, ${JSON.stringify(id)}))`);

export const routes = [
  { name: "home", path: "/", ready: "h1" },
  { name: "preview-guide", path: "/preview/", ready: "h1" },
  { name: "preview-cursors", path: "/preview/cursors/", ready: "h1" },
  { name: "preview-curtain", path: "/preview/curtain/", ready: "h1" },
  // Studio: the Webflow-style designer and the CMS.
  { name: "studio-designer", path: "/studio/", ready: "[data-el]" },
  { name: "studio-designer-selected", path: "/studio/", ready: "[data-el]", act: async (page) => { await page.locator("[data-el] h1").first().click(); await page.waitForTimeout(200); } },
  { name: "studio-designer-add", path: "/studio/", ready: "[data-el]", act: async (page) => { await page.locator("body").press("a"); await page.waitForTimeout(200); } },
  { name: "studio-table", path: "/studio/", ready: "[data-el]", act: async (page) => { await studioCms(page); } },
  { name: "studio-kanban", path: "/studio/", ready: "[data-el]", act: async (page) => { await studioCms(page); await page.getByRole("tab", { name: "Review pipeline" }).click(); await page.locator("main section").first().waitFor(); } },
  { name: "studio-gallery", path: "/studio/", ready: "[data-el]", act: async (page) => { await studioCms(page); await page.getByRole("tab", { name: "Directory" }).click(); await page.waitForTimeout(200); } },
  {
    name: "studio-record", path: "/studio/", ready: "[data-el]",
    act: async (page) => { await studioCms(page, "Journal"); await page.getByRole("tab", { name: "Covers" }).click(); await page.locator("main ul li button").first().click(); await page.waitForTimeout(200); },
  },
  { name: "studio-calendar", path: "/studio/", ready: "[data-el]", act: async (page) => { await studioCms(page, "Journal"); await page.getByRole("tab", { name: "Publishing calendar" }).click(); await page.waitForTimeout(200); } },
  { name: "studio-site", path: "/studio/site/", ready: "main h1" },
  // Site pages: each Between Gigs page with the design, data, code and API behind it.
  { name: "studio-pages-design", path: "/studio/?site=public-maya&tab=design", ready: "[role=tabpanel] iframe" },
  { name: "studio-pages-data", path: "/studio/?site=owner-review&tab=data", ready: "[role=grid]" },
  { name: "studio-pages-code", path: "/studio/?site=public-maya&tab=code", ready: ".cm-content" },
  { name: "studio-pages-api", path: "/studio/?site=owner-review&tab=api", ready: "main code" },
  { name: "studio-code", path: "/studio/?code=css", ready: ".cm-content" },
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
  // Edit on your profile: blank, with a spot open (spotlight), part-filled, and the client view.
  // The workspace: every project in one shell, and one project open inside it.
  { name: "workspace", path: "/workspace/", setup: reset, ready: "main h1" },
  { name: "workspace-list", path: "/workspace/?folder=onboarding", setup: reset, ready: "main h1", act: async (page) => { await page.getByRole("radio", { name: "List" }).click(); } },
  { name: "workspace-open", path: "/workspace/open/?p=owners", setup: reset, ready: "main iframe" },
  { name: "workspace-search", path: "/workspace/", setup: reset, ready: "main h1", act: async (page) => { await page.getByRole("button", { name: "Search projects and pages" }).click(); await page.keyboard.type("review"); } },
  { name: "canvas-blank", path: "/profile/canvas/", setup: as("gigster", "ava-sinclair"), ready: "[data-spot]" },
  { name: "canvas-editing", path: "/profile/canvas/", setup: as("gigster", "ava-sinclair"), ready: "[data-spot]", act: async (page) => { await page.getByRole("button", { name: "Next spot" }).click(); await page.getByRole("button", { name: /^Next:/ }).click(); await page.waitForTimeout(300); } },
  { name: "canvas-draft", path: "/profile/canvas/", setup: as("gigster", "elena-petrova"), ready: "[data-spot]" },
  { name: "canvas-changes", path: "/profile/canvas/", setup: as("gigster", "hana-kim"), ready: "[data-spot]" },
  { name: "canvas-client", path: "/profile/canvas/", setup: as("gigster", "elena-petrova"), ready: "[data-spot]", act: async (page) => { await page.getByRole("radio", { name: "Client view" }).click(); await page.waitForTimeout(400); } },
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
