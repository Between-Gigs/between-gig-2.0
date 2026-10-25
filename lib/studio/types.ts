/*
 * Studio's data model: a base holds collections (tables); each collection has fields, records and views.
 * Nothing here knows about Between Gigs; lib/studio/seed.ts fills a base from its sample data, so Studio can
 * later run as its own service with another seed or a real backend behind the same shapes.
 */

export type FieldType =
  | "text" | "longText" | "number" | "currency" | "select" | "multiSelect" | "date" | "checkbox"
  | "image" | "url" | "email" | "rating" | "link";

export interface Choice {
  id: string;
  label: string;
  /** One of the design system's categorical colours, 1 to 8. */
  color: number;
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  description?: string;
  /** select and multiSelect. */
  choices?: Choice[];
  /** link: the collection it points at. */
  linkTable?: string;
}

/** text-like fields hold strings, number/currency/rating numbers, checkbox booleans; multiSelect and link hold id lists. */
export type CellValue = string | number | boolean | string[] | null;

export interface StudioRecord {
  id: string;
  values: Record<string, CellValue>;
  createdAt: string;
}

export type ViewType = "grid" | "gallery" | "kanban" | "list" | "calendar";

export type FilterOp = "contains" | "notContains" | "is" | "isNot" | "isEmpty" | "isNotEmpty" | "gt" | "lt" | "checked" | "unchecked" | "hasAny";

export interface Filter {
  id: string;
  fieldId: string;
  op: FilterOp;
  value?: string;
}

export interface Sort {
  fieldId: string;
  dir: "asc" | "desc";
}

export interface View {
  id: string;
  name: string;
  type: ViewType;
  /** Field ids left out of this view. The primary field is always shown. */
  hidden: string[];
  /** Field ids in display order; fields missing from it follow in their collection order. */
  order: string[];
  filters: Filter[];
  /** "and": every filter must match; "or": any one. */
  match: "and" | "or";
  sorts: Sort[];
  /** grid: optional group headers; kanban: the columns (a select field). */
  groupBy?: string;
  /** gallery, kanban and list: the image shown on each card. */
  coverField?: string;
  /** calendar: where records land. */
  dateField?: string;
  rowHeight: "short" | "medium" | "tall";
  cardSize: "sm" | "md" | "lg";
}

export type CollectionIcon = "users" | "book" | "image" | "sparkles" | "inbox" | "tag" | "folder" | "calendar" | "star";

export interface Collection {
  id: string;
  name: string;
  icon: CollectionIcon;
  description?: string;
  /** The field that names each record: titles, card headings, link chips. */
  primaryField: string;
  fields: Field[];
  records: StudioRecord[];
  views: View[];
}

export interface Base {
  id: string;
  name: string;
  version: 1;
  collections: Collection[];
}
