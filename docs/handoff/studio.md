# Studio: the no-code designer and CMS

`/studio` is a prototype of the Between Gigs site designer and content manager, meant to become its own service
later. The shell follows Webflow so it feels familiar: a left tool bar (Add `A`, Navigator `Z`, Pages `P`, CMS `J`,
Assets `F`, Settings `S`) with flyout panels, the canvas in the middle with breakpoints, a Style / Settings panel on
the right, and Publish at the top right. The CMS works like Airtable.

## Designer

- **Pages** of elements: Section, Container, Div Block, Columns, Heading, Paragraph, Text Block, Text Link,
  Button, Image, Divider and Collection List. The sample Home and About pages are built from Between Gigs content.
- **On the canvas:** click to select (blue outline and name tag), hover to see outlines, double-click text to edit
  it, drag elements from Add or by their name tag to move them (a blue line shows where they land), Delete,
  Ctrl/Cmd+D to duplicate, Ctrl/Cmd+C and V to copy and paste, Escape to select the parent. The breadcrumb at the
  bottom shows where the selection sits.
- **Navigator:** the layer tree; drag rows to reorder or nest.
- **Style panel:** a selector with Webflow-style classes (shared styles; type a name to create or apply one), then
  Layout (block, flex, grid), Spacing (margin and padding box), Size, Typography, Backgrounds, Borders and
  Effects. Labels turn blue when set at this breakpoint and amber when inherited; click a blue label to clear it.
- **Breakpoints:** Desktop, Tablet (768) and Phone (390). Desktop styles cascade down; tablet and phone override.
- **Settings panel:** text, heading level, links (with page shortcuts and new tab), images and alt text, and
  Collection List sources (collection, limit, sort and a filter). Elements inside a list connect to CMS fields.
- **Preview** (eye icon) and **Publish**, which opens `/studio/site/`: the site as visitors see it, from this
  browser. Publishing to a domain needs hosting and isn't built.

## CMS

- **Collections** (tables) with fields, records and saved views. Seeded from the app's sample data: Gigsters,
  Journal, Storyboard, Services and the Waitlist.
- **Views:** Table, Gallery, Kanban, List and Calendar. Each view keeps its own filters (match all or any), sorts,
  hidden fields, field order, grouping or columns, card image, date field, row height and card size.
- **Table editing:** click a cell, type or press Enter to edit, arrows and Tab to move, Delete to clear, Space for
  checkboxes, 1 to 5 for ratings. Choice, link and image cells open a picker.
- **Fields:** short and long text, single and multiple choice, number, price, date, checkbox, image, rating, web
  link, email and links to another collection. Changing a field's type keeps what it can.
- **Inspector:** the selected record (every field), field (name, type, help text, options and colours, link target,
  title field) or view (layout, card image, columns, dates, fields).
- **Kanban:** drag cards between columns, or use a card's menu (keyboard and touch).
- **Undo and redo** for every change (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z), plus export and import as JSON and a reset
  to the sample.
- Day and night themes and phone layouts: the navigator and inspector become drawers.

## Not built yet

Accounts, sharing and a hosted database (it saves in the browser only; Share says so), real-time collaboration,
file storage for uploads (they're resized to 800px and kept as data URLs), publishing to a domain, CMS template
pages (one page per record), interactions and animations, components (symbols), custom code, formulas and rollups,
form views, permissions and an activity history.

## Code

- `lib/studio/types.ts`: the model (base → collections → fields, records, views). No Between Gigs imports.
- `lib/studio/query.ts`: filtering, searching, sorting, grouping and the plain-language type lists.
- `lib/studio/store.tsx`: state, persistence (`localStorage` key `bg-studio-v1`) and undoable actions. A backend
  replaces `load` and the save effect; the actions keep their shape.
- `lib/studio/pages.ts`: the Designer's element catalog, tree helpers, the style cascade, CSS output and the
  sample pages and classes.
- `lib/studio/seed.ts`: the only file that imports Between Gigs code. A standalone Studio swaps it for templates.
- `components/studio/`: the shell (`Studio.tsx`), CMS navigator, toolbar, inspector, dialogs, cell editors,
  `views/` (CMS) and `designer/` (canvas, renderer, Add / Navigator / Pages panels, Style and Settings panels and
  the site preview).

To lift it out, move `lib/studio` and `components/studio` into their own package and keep the design system as
a dependency.
