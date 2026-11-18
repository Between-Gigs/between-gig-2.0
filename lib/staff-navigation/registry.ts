/** Stable menu identifiers shared by configuration validation and the actual navigation renderer. */
export const NAVIGATION_GROUPS = [
  { id: "profile", title: "Personal profile", modes: ["gigster"], items: [{ id: "my_profile", label: "My profile" }, { id: "edit_profile", label: "Edit profile" }] },
  { id: "overview", title: "Overview", modes: ["owner", "developer"], items: [{ id: "dashboard", label: "Dashboard" }] },
  { id: "developer", title: "Developer", modes: ["developer"], items: [{ id: "hub", label: "Hub" }] },
  { id: "gigsters", title: "Gigsters", modes: ["owner", "developer"], items: [{ id: "review", label: "Review queue" }, { id: "people", label: "People" }, { id: "waitlist", label: "Waitlist" }] },
  { id: "team", title: "Team", modes: ["developer"], items: [{ id: "staff", label: "Staff" }] },
  { id: "previews", title: "Previews", modes: ["developer"], items: [{ id: "page_previews", label: "Page Previews" }, { id: "social_previews", label: "Social Previews" }, { id: "email_previews", label: "Email Previews" }, { id: "forms", label: "Forms" }, { id: "funnels", label: "Funnels" }] },
  { id: "studio", title: "Studio", modes: ["developer"], items: [{ id: "product_development", label: "Product Development" }, { id: "design_system", label: "Design System" }, { id: "wallpapers", label: "Wallpapers" }, { id: "media_library", label: "Media Library" }, { id: "copywriting", label: "Copywriting" }, { id: "skills", label: "Skills" }, { id: "characters", label: "Characters" }] },
] as const;
export const NAVIGATION_MODES = ["gigster", "owner", "developer"] as const;
export const NAVIGATION_ITEMS = NAVIGATION_GROUPS.flatMap(group => group.items.map(item => item.id));
export type NavigationItemId = typeof NAVIGATION_ITEMS[number];
export type StaffNavigationMode = typeof NAVIGATION_MODES[number];
export type NavigationGroupId = typeof NAVIGATION_GROUPS[number]["id"];
