import {
  CATEGORIES,
  JOURNEYS,
  KINDS,
  STATUSES,
  type WorkFields,
  type WorkItem,
  type Phase,
} from "./types";
export const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
export const uuid = (x: unknown): x is string =>
  typeof x === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
export class WorkValidationError extends Error {}
function text(x: unknown, limit: number, required = false): string {
  if (
    typeof x !== "string" ||
    x.length > limit ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(x) ||
    (required && !x.trim())
  )
    throw new WorkValidationError("Check the required text and length limits.");
  return x.trim();
}
function choice<T extends string>(value: unknown, options: readonly T[]): T {
  if (typeof value !== "string" || !options.includes(value as T))
    throw new WorkValidationError("Choose a valid option.");
  return value as T;
}
const date = (x: unknown) => {
  const value = text(x, 10);
  if (
    value &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    throw new WorkValidationError("Choose a valid calendar date.");
  return value;
};
export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function validateWork(value: unknown): WorkFields {
  if (!object(value)) throw new WorkValidationError("Enter a work record.");
  const keys = [
    "title",
    "phase",
    "kind",
    "parent",
    "category",
    "journey",
    "status",
    "owner",
    "description",
    "acceptance",
    "blocker",
    "startDate",
    "dueDate",
    "evidence",
    "dependsOn",
    "deployment",
  ];
  if (Object.keys(value).some((key) => !keys.includes(key)))
    throw new WorkValidationError("Unexpected work fields.");
  if (!uuid(value.phase) || (value.parent !== "" && !uuid(value.parent)))
    throw new WorkValidationError("Choose a phase and valid parent.");
  if (
    !Array.isArray(value.evidence) ||
    value.evidence.length > 20 ||
    !Array.isArray(value.dependsOn) ||
    value.dependsOn.length > 30 ||
    !value.dependsOn.every(uuid)
  )
    throw new WorkValidationError("Too many or invalid related records.");
  const evidence = value.evidence.map((e) => {
    if (
      !object(e) ||
      Object.keys(e).some(
        (key) => !["label", "url", "note", "checkedAt"].includes(key),
      )
    )
      throw new WorkValidationError("Invalid evidence.");
    const url = text(e.url, 2000);
    if (url && !safeUrl(url))
      throw new WorkValidationError(
        "Evidence links must use HTTPS without credentials.",
      );
    const note = text(e.note, 2000);
    if (!url && !note)
      throw new WorkValidationError(
        "Evidence needs a source link or verification note.",
      );
    return {
      label: text(e.label, 200, true),
      url,
      note,
      checkedAt: date(e.checkedAt),
    };
  });
  const out: WorkFields = {
    title: text(value.title, 200, true),
    phase: value.phase,
    kind: choice(value.kind, KINDS),
    parent: value.parent as string,
    category: choice(value.category, CATEGORIES),
    journey: choice(value.journey, JOURNEYS),
    status: choice(value.status, STATUSES),
    owner: text(value.owner, 160),
    description: text(value.description, 8000),
    acceptance: text(value.acceptance, 4000),
    blocker: text(value.blocker, 2000),
    startDate: date(value.startDate),
    dueDate: date(value.dueDate),
    evidence,
    dependsOn: [...new Set(value.dependsOn as string[])],
    deployment: choice(value.deployment, [
      "not_applicable",
      "unknown",
      "local",
      "test",
      "production",
    ]),
  };
  if (out.startDate && out.dueDate && out.startDate > out.dueDate)
    throw new WorkValidationError(
      "The due date must be on or after the start date.",
    );
  if (out.status === "blocked" && !out.blocker)
    throw new WorkValidationError("Explain what is blocking this item.");
  if (out.status === "done" && !out.evidence.some((e) => e.checkedAt))
    throw new WorkValidationError(
      "Add dated evidence before marking an item done.",
    );
  return out;
}
export function validatePhase(value: unknown): Omit<Phase, "id" | "revision"> {
  if (
    !object(value) ||
    Object.keys(value).some(
      (key) =>
        ![
          "title",
          "order",
          "summary",
          "state",
          "doneLooksLike",
          "sourceNote",
        ].includes(key),
    )
  )
    throw new WorkValidationError("Enter valid phase fields.");
  if (
    !Number.isSafeInteger(value.order) ||
    Number(value.order) < 0 ||
    Number(value.order) > 10000
  )
    throw new WorkValidationError(
      "Phase order must be a whole number from 0 to 10000.",
    );
  return {
    title: text(value.title, 200, true),
    order: Number(value.order),
    summary: text(value.summary, 4000),
    state: choice(value.state, ["complete", "active", "planned"]),
    doneLooksLike: text(value.doneLooksLike, 4000, true),
    sourceNote: text(value.sourceNote, 2000, value.state === "complete"),
  };
}
export function validateRelations(
  fields: WorkFields,
  id: string,
  phases: Phase[],
  items: WorkItem[],
) {
  if (!phases.some((p) => p.id === fields.phase))
    throw new WorkValidationError("This phase no longer exists. Refresh.");
  const map = new Map(items.map((item) => [item.id, item]));
  const related = [fields.parent, ...fields.dependsOn].filter(Boolean);
  if (
    related.some(
      (target) =>
        target === id ||
        !map.has(target) ||
        map.get(target)!.phase !== fields.phase ||
        map.get(target)!.status === "archived",
    )
  )
    throw new WorkValidationError(
      "Related items must be active items in the same phase.",
    );
  const parentSeen = new Set([id]);
  let parent = fields.parent;
  while (parent) {
    if (parentSeen.has(parent))
      throw new WorkValidationError("A parent cannot contain itself.");
    parentSeen.add(parent);
    parent = map.get(parent)?.parent ?? "";
  }
  // Completion depends on explicit prerequisites AND unfinished child work.
  // Validate their union so a child cannot depend on its own container.
  const proposed = new Map<string, WorkFields>(map);
  proposed.set(id, fields);
  const completionEdges = new Map<string, string[]>();
  for (const [key, item] of proposed) {
    if (item.status !== "archived")
      completionEdges.set(key, [...item.dependsOn]);
  }
  for (const [key, item] of proposed) {
    if (
      item.status !== "archived" &&
      item.kind !== "communication" &&
      item.parent
    ) {
      completionEdges.get(item.parent)?.push(key);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const loops = (key: string): boolean => {
    if (visiting.has(key)) return true;
    if (visited.has(key)) return false;
    visiting.add(key);
    if ((completionEdges.get(key) ?? []).some(loops)) return true;
    visiting.delete(key);
    visited.add(key);
    return false;
  };
  if ([...completionEdges.keys()].some(loops))
    throw new WorkValidationError(
      "Dependencies and child work cannot form a completion loop.",
    );
  if (
    fields.parent &&
    fields.kind !== "communication" &&
    fields.status !== "done" &&
    fields.status !== "archived" &&
    map.get(fields.parent)?.status === "done"
  )
    throw new WorkValidationError(
      "Reopen the completed parent before adding or reopening child work.",
    );
  if (
    fields.status === "done" &&
    fields.dependsOn.some((target) => map.get(target)?.status !== "done")
  )
    throw new WorkValidationError(
      "Finish the dependencies before marking this done.",
    );
  const children = items.filter(
    (item) => item.parent === id && item.status !== "archived",
  );
  if (
    map.get(fields.parent)?.kind === "communication" ||
    (fields.kind === "communication" && children.length)
  )
    throw new WorkValidationError(
      "Communications are reference notes; place work beneath a project, milestone or task instead.",
    );
  const dependents = items.filter(
    (item) => item.status !== "archived" && item.dependsOn.includes(id),
  );
  if (
    children.some((item) => item.phase !== fields.phase) ||
    dependents.some((item) => item.phase !== fields.phase) ||
    (fields.status === "archived" && (children.length || dependents.length))
  )
    throw new WorkValidationError(
      "Move or archive linked work before archiving or changing this phase.",
    );
  if (
    fields.status === "done" &&
    children.some(
      (item) => item.kind !== "communication" && item.status !== "done",
    )
  )
    throw new WorkValidationError(
      "Finish the child items before marking this container done.",
    );
  if (
    fields.status !== "done" &&
    dependents.some((item) => item.status === "done")
  )
    throw new WorkValidationError(
      "Reopen completed dependent work before reopening this dependency.",
    );
}
