import type { CellValue, Collection, Field, FieldType, Filter, FilterOp, StudioRecord, View, ViewType } from "./types";

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

/** Plain-language names for field types, for people who have never built a database. */
export const fieldTypes: { type: FieldType; label: string; hint: string }[] = [
  { type: "text", label: "Short text", hint: "A name, title or one line" },
  { type: "longText", label: "Long text", hint: "A description or a few paragraphs" },
  { type: "select", label: "Single choice", hint: "One option from a list, like a status" },
  { type: "multiSelect", label: "Multiple choices", hint: "Several options, like tags" },
  { type: "number", label: "Number", hint: "Counts, years, quantities" },
  { type: "currency", label: "Price", hint: "An amount in dollars" },
  { type: "date", label: "Date", hint: "A day on the calendar" },
  { type: "checkbox", label: "Checkbox", hint: "Yes or no" },
  { type: "image", label: "Image", hint: "A photo or picture" },
  { type: "rating", label: "Rating", hint: "One to five stars" },
  { type: "url", label: "Web link", hint: "A website address" },
  { type: "email", label: "Email", hint: "An email address" },
  { type: "link", label: "Link to collection", hint: "Connect to items in another collection" },
];
export const fieldTypeLabel = (t: FieldType) => fieldTypes.find((f) => f.type === t)?.label ?? t;

export const viewTypes: { type: ViewType; label: string; hint: string }[] = [
  { type: "grid", label: "Table", hint: "Rows and columns, edit like a spreadsheet" },
  { type: "gallery", label: "Gallery", hint: "Cards with a big image" },
  { type: "kanban", label: "Kanban", hint: "Columns by status; drag cards across" },
  { type: "list", label: "List", hint: "A clean list, like a content library" },
  { type: "calendar", label: "Calendar", hint: "Items on the days they happen" },
];
export const viewTypeLabel = (t: ViewType) => viewTypes.find((v) => v.type === t)?.label ?? t;

export const isEmpty = (v: CellValue | undefined) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || v === false;

/** A cell as plain text: for search, sorting, link chips and record titles. */
export function cellText(field: Field | undefined, v: CellValue | undefined, lookup?: (id: string) => string): string {
  if (!field || isEmpty(v)) return "";
  switch (field.type) {
    case "select": return field.choices?.find((c) => c.id === v)?.label ?? "";
    case "multiSelect": return (v as string[]).map((id) => field.choices?.find((c) => c.id === id)?.label ?? "").filter(Boolean).join(", ");
    case "link": return (v as string[]).map((id) => lookup?.(id) ?? "").filter(Boolean).join(", ");
    case "checkbox": return v ? "Yes" : "";
    case "currency": return `$${Number(v).toLocaleString("en-US")}`;
    case "rating": return "★".repeat(Number(v));
    case "date": return formatDate(String(v));
    default: return String(v);
  }
}

export const formatDate = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
};

export const recordTitle = (c: Collection, r: StudioRecord) => {
  const f = c.fields.find((x) => x.id === c.primaryField);
  return cellText(f, r.values[c.primaryField]) || "Untitled";
};

/** Fields in the view's order, the primary field first, hidden ones left out unless asked for. */
export function viewFields(c: Collection, v: View, includeHidden = false): Field[] {
  const rank = (f: Field) => (f.id === c.primaryField ? -1 : v.order.indexOf(f.id) === -1 ? 1000 + c.fields.indexOf(f) : v.order.indexOf(f.id));
  return c.fields.filter((f) => includeHidden || f.id === c.primaryField || !v.hidden.includes(f.id)).sort((a, b) => rank(a) - rank(b));
}

/** Which filter conditions make sense for a field type. */
export function filterOps(t: FieldType): { op: FilterOp; label: string; needsValue: boolean }[] {
  const empty = [{ op: "isEmpty" as const, label: "is empty", needsValue: false }, { op: "isNotEmpty" as const, label: "is not empty", needsValue: false }];
  if (t === "checkbox") return [{ op: "checked", label: "is checked", needsValue: false }, { op: "unchecked", label: "is not checked", needsValue: false }];
  if (t === "number" || t === "currency" || t === "rating") return [{ op: "is", label: "=", needsValue: true }, { op: "gt", label: ">", needsValue: true }, { op: "lt", label: "<", needsValue: true }, ...empty];
  if (t === "date") return [{ op: "is", label: "is on", needsValue: true }, { op: "gt", label: "is after", needsValue: true }, { op: "lt", label: "is before", needsValue: true }, ...empty];
  if (t === "select") return [{ op: "is", label: "is", needsValue: true }, { op: "isNot", label: "is not", needsValue: true }, ...empty];
  if (t === "multiSelect" || t === "link") return [{ op: "hasAny", label: "has", needsValue: true }, ...empty];
  return [{ op: "contains", label: "contains", needsValue: true }, { op: "notContains", label: "does not contain", needsValue: true }, { op: "is", label: "is", needsValue: true }, ...empty];
}

function matches(f: Filter, field: Field | undefined, v: CellValue | undefined, lookup: (id: string) => string) {
  if (!field) return true;
  const q = (f.value ?? "").trim().toLowerCase();
  switch (f.op) {
    case "isEmpty": return isEmpty(v);
    case "isNotEmpty": return !isEmpty(v);
    case "checked": return v === true;
    case "unchecked": return v !== true;
  }
  if (!q) return true; // A condition still being written doesn't hide anything yet.
  if (field.type === "select") return f.op === "isNot" ? v !== f.value : v === f.value;
  if (field.type === "multiSelect" || field.type === "link") return Array.isArray(v) && v.includes(f.value ?? "");
  if (field.type === "number" || field.type === "currency" || field.type === "rating" || field.type === "date") {
    if (isEmpty(v)) return false;
    const a = field.type === "date" ? String(v).slice(0, 10) : Number(v), b = field.type === "date" ? q : Number(q);
    return f.op === "gt" ? a > b : f.op === "lt" ? a < b : a === b;
  }
  const text = cellText(field, v, lookup).toLowerCase();
  return f.op === "notContains" ? !text.includes(q) : f.op === "is" ? text === q : text.includes(q);
}

/** The records a view shows: filtered, searched and sorted. */
export function viewRecords(c: Collection, v: View, search: string, lookup: (id: string) => string): StudioRecord[] {
  const byId = new Map(c.fields.map((f) => [f.id, f]));
  const q = search.trim().toLowerCase();
  let rows = c.records.filter((r) => {
    if (v.filters.length) {
      const results = v.filters.map((f) => matches(f, byId.get(f.fieldId), r.values[f.fieldId], lookup));
      if (v.match === "or" ? !results.some(Boolean) : !results.every(Boolean)) return false;
    }
    if (q) return c.fields.some((f) => cellText(f, r.values[f.id], lookup).toLowerCase().includes(q));
    return true;
  });
  if (v.sorts.length) {
    rows = rows.slice().sort((a, b) => {
      for (const s of v.sorts) {
        const f = byId.get(s.fieldId);
        if (!f) continue;
        const x = a.values[f.id], y = b.values[f.id];
        if (isEmpty(x) !== isEmpty(y)) return isEmpty(x) ? 1 : -1; // Blanks last, either way.
        let d: number;
        if (f.type === "number" || f.type === "currency" || f.type === "rating") d = Number(x ?? 0) - Number(y ?? 0);
        else if (f.type === "select") d = (f.choices?.findIndex((o) => o.id === x) ?? 0) - (f.choices?.findIndex((o) => o.id === y) ?? 0);
        else if (f.type === "checkbox") d = Number(!!x) - Number(!!y);
        else d = cellText(f, x, lookup).localeCompare(cellText(f, y, lookup), "en", { numeric: true });
        if (d) return s.dir === "asc" ? d : -d;
      }
      return 0;
    });
  }
  return rows;
}

/** Groups for grouped tables and kanban columns: every choice in order (even empty ones), then "No value". */
export function groupRecords(field: Field | undefined, rows: StudioRecord[]): { id: string; label: string; color: number; rows: StudioRecord[] }[] {
  if (!field || (field.type !== "select" && field.type !== "checkbox")) return [{ id: "all", label: "All", color: 0, rows }];
  if (field.type === "checkbox") return [
    { id: "yes", label: "Checked", color: 1, rows: rows.filter((r) => r.values[field.id] === true) },
    { id: "no", label: "Not checked", color: 0, rows: rows.filter((r) => r.values[field.id] !== true) },
  ];
  const groups = (field.choices ?? []).map((c) => ({ id: c.id, label: c.label, color: c.color, rows: rows.filter((r) => r.values[field.id] === c.id) }));
  const none = rows.filter((r) => !field.choices?.some((c) => c.id === r.values[field.id]));
  return none.length ? [...groups, { id: "", label: "No value", color: 0, rows: none }] : groups;
}

export const newView = (type: ViewType, c: Collection, name?: string): View => {
  const select = c.fields.find((f) => f.type === "select");
  const image = c.fields.find((f) => f.type === "image");
  const date = c.fields.find((f) => f.type === "date");
  return {
    id: uid("viw"), name: name ?? viewTypeLabel(type), type, hidden: [], order: [], filters: [], match: "and", sorts: [],
    groupBy: type === "kanban" ? select?.id : undefined, coverField: image?.id, dateField: date?.id, rowHeight: "short", cardSize: "md",
  };
};

/** An empty value of the right kind for a field. */
export const blankValue = (t: FieldType): CellValue => (t === "multiSelect" || t === "link" ? [] : t === "checkbox" ? false : null);
