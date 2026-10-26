# Studio: the no-code designer and CMS

`/studio` is a prototype of the Between Gigs site designer and content manager, meant to become its own service
later. The shell follows Webflow so it feels familiar: a left tool bar (Add `A`, Navigator `Z`, Pages `P`, CMS `J`,
Site pages `G`, Code `C`, Assets `F`, Settings `S`) with flyout panels, the canvas in the middle with breakpoints, a Style / Settings panel on
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

## Site pages: the pages behind the pages

`G` (or `/studio/?site=<page>&tab=design|data|code|api`) lists every Between Gigs page, by who it's for, with the
tooling that makes it. The 3D build map stacks these four screens behind each page and links to them.

- **Design**: the real page in a frame at Desktop (1440), Tablet (768) or Phone (390), scaled to fit, with its
  structure (landmarks, sections, headings, forms, lists) beside it. Hover a row to outline it on the page; click to
  scroll to it and read its computed styles. In sample mode the page opens as the person it's for (Maya, the owner,
  an invited visitor), which signs this browser into that sample account.
- **Data**: the CMS collection the page reads, in the CMS's own views (Gigsters, Waitlist, Storyboard, Services).
- **Code**: the page's source files in the code editor, plus every file in the app to browse. Read-only; Edit keeps
  a draft in this browser only (marked as edited) and never changes the site or the repository. GitHub opens the
  real file.
- **API**: each data call, the route it becomes on the backend, its state (to build, live, Clerk, sample) and the
  tables underneath, new ones marked.

The pages, calls, routes and tables live in `lib/studio/app-pages.ts`; keep it in step with the 3D map.

## Code tool

`C` (or `/studio/?code=html|css|custom`) shows the Designer page as code: `index.html` and `styles.css` are
generated from the canvas (read-only, with Copy and Download, like a site builder's export; collection lists come
out filled with their items), and `custom.css` is yours: saved with the page (undoable), applied on the canvas and in
the preview. Elements carry `data-cls` rather than `class`, so `.hero` in custom CSS is rewritten to match them and
scoped to the page, and a class called `container` never picks up the site's own styles. Style-panel values are
inline, so custom CSS needs `!important` to override them.

The editor is CodeMirror 6 (`components/studio/code/CodeEditor.tsx`) with the design system's colours. The source it
reads is exported by `scripts/studio-source.mjs` into `public/studio-source/` (generated, gitignored) as part of
`pnpm build`.

## Not built yet

Accounts, sharing and a hosted database (it saves in the browser only; Share says so), real-time collaboration,
file storage for uploads (they're resized to 800px and kept as data URLs), publishing to a domain, CMS template
pages (one page per record), interactions and animations, components (symbols), custom head and body code (only
custom CSS so far), saving code edits back to the repository, formulas and rollups,
form views, permissions and an activity history.

## Code

- `lib/studio/types.ts`: the model (base → collections → fields, records, views). No Between Gigs imports.
- `lib/studio/query.ts`: filtering, searching, sorting, grouping and the plain-language type lists.
- `lib/studio/store.tsx`: state, persistence (`localStorage` key `bg-studio-v1`) and undoable actions. A backend
  replaces `load` and the save effect; the actions keep their shape.
- `lib/studio/pages.ts`: the Designer's element catalog, tree helpers, the style cascade, CSS output and the
  sample pages and classes.
- `lib/studio/seed.ts`: the only file that imports Between Gigs code. A standalone Studio swaps it for templates.
- `lib/studio/export.ts`: a Designer page as HTML and CSS, and custom CSS scoped to the canvas.
- `lib/studio/app-pages.ts` and `lib/studio/source.ts`: the Between Gigs pages for Site pages, and the source files
  the code editor reads (with browser-only drafts).
- `components/studio/`: the shell (`Studio.tsx`), CMS navigator, toolbar, inspector, dialogs, cell editors,
  `views/` (CMS), `designer/` (canvas, renderer, Add / Navigator / Pages panels, Style and Settings panels and
  the site preview), `code/` (the code editor, the Code tool and the source browser) and `inspect/` (Site pages).

To lift it out, move `lib/studio` and `components/studio` into their own package and keep the design system as
a dependency.
