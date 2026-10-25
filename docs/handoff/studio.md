# Studio: the no-code editor and CMS

`/studio` is a prototype of the Between Gigs content manager, meant to become its own service later. The frame
follows site builders (Webflow, Wix): a tool rail and navigator on the left, the canvas in the middle and an
inspector on the right. Data and views work like Airtable.

## What works

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
file storage for uploads (they're resized to 800px and kept as data URLs), formulas and rollups, form views,
publishing collections to site pages, permissions and an activity history.

## Code

- `lib/studio/types.ts`: the model (base → collections → fields, records, views). No Between Gigs imports.
- `lib/studio/query.ts`: filtering, searching, sorting, grouping and the plain-language type lists.
- `lib/studio/store.tsx`: state, persistence (`localStorage` key `bg-studio-v1`) and undoable actions. A backend
  replaces `load` and the save effect; the actions keep their shape.
- `lib/studio/seed.ts`: the only file that imports Between Gigs code. A standalone Studio swaps it for templates.
- `components/studio/`: the shell (`Studio.tsx`), navigator, toolbar, inspector, dialogs, cell editors and
  `views/`.

To lift it out, move `lib/studio` and `components/studio` into their own package and keep the design system as
a dependency.
