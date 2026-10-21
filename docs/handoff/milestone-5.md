# Milestone 5 handoff: the "call sheet" home page

**Status: complete.** `pnpm check` passes. That covers screenshots and axe on every route, light and dark, 1440 and 390, plus the end-to-end flow.

## 5a · Today's home, rebuilt (`/`)

The live home page in the new style, built from the design system's **ComingSoon** template. The words are unchanged:

> Extraordinary talent. Everyday solutions. / **Coming soon.** / Los Angeles Call Sheet / **Get on the call sheet ↗** → `/professionals`

- Always a dark-theme island: the Europium backdrop, the glowing horizon, one mint call to action.
- The header keeps the live page's "Log in" link. A theme switch is added. The footer links to For professionals, Storyboard, Journal, Privacy, Terms and hello@between-gigs.com.
- The old Milestone 2–4 guide page moved to **`/preview`**. It's linked from the footer and the Demo button.

## 5b · The home page once the platform opens (`/proposals/home`)

These are designed proposals, not live pages. One page shows all three, with a **View as** switch (Signed out · Gigster · Owner, linkable as `?view=`). A **Design notes** switch shows or hides the numbered reasoning beside each section. The Gigster view can show any sample status.

| View | First question it answers | Sections (each with a note) |
| --- | --- | --- |
| **Signed out** | "Can someone here do my job?" and "Should I join?" | 1. Search first, because clients arrive with a job. 2. Two equal doors (find talent / get on the call sheet). 3. Needs, not departments ("Refresh a room · from set decorators"). 4. Approved faces only, ordered by availability. 5. The Storyboard strip. 6. Honest trust: what review means, plus the licensing link, no "verified" badges. 7. The Journal's production guides as the bridge to booking. |
| **Gigster** | "What do I need to do?" | 1. One next step per status (the same logic as the /profile banner). 2. Availability in one tap that doesn't trigger a new review. 3. A Requests inbox, honestly empty until booking ships. 4. Journal pieces that help translate a craft into a service. |
| **Owner** | "Is anyone waiting on us?" | 1. The waiting count as the headline, with the oldest review one click away. 2. Four plain numbers (live, waiting, building, not invited). 3. A short summary that hands off to `/owners`, so there's one admin place, not two. |

Every block reuses something already built: the data seams from Milestones 2–4 (`people.similar`, `people.get`, `owners.dashboard`), the Journal content, Storyboard pages and approved copy. Building it for real is mostly layout.

**Not real yet, and labelled so on the page:** the search box (there is no public search route; the owner search could become one), the availability switch (it doesn't save), and Requests (that needs booking).

The Journal sections were taken out of the proposals when the Journal was hidden (see Milestone 3).

## For Anu

- `/` is static and has no data. When the platform opens, this proposal suggests `/` picks a view from the session: signed out → visitor home, Gigster → Gigster home, owner → owner home.
- Code: `components/home/CallSheetHome.tsx` (5a), `components/proposals/*` (5b), `app/preview/` (the guide).

## Open questions

1. Which signed-out version should the client see first, and when does "Coming soon" come down?
2. Public search for clients: a new `/search` page (the design system's SearchResults template) or the home page search alone?
3. Availability without review: agree the rule (Milestone 2 open question 3) before building the one-tap switch.
4. Should owners land on the home page or go straight to `/owners` when they sign in?
