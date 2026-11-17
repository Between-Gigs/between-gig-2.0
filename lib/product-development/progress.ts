import type { WorkItem } from "./types";
/** Count actionable leaves only. Milestone/project containers and correspondence never inflate completion. */
export function progress(items: WorkItem[]) {
  const active = items.filter((item) => item.status !== "archived");
  const parents = new Set(
    active
      .filter((item) => item.kind !== "communication")
      .map((item) => item.parent)
      .filter(Boolean),
  );
  const leaves = active.filter(
    (item) =>
      !parents.has(item.id) &&
      ["task", "checklist", "request", "deliverable"].includes(item.kind),
  );
  const done = leaves.filter(
    (item) => item.status === "done" && item.evidence.some((e) => e.checkedAt),
  ).length;
  return {
    done,
    total: leaves.length,
    blocked: leaves.filter((item) => item.status === "blocked").length,
    percent: leaves.length ? Math.round((done / leaves.length) * 100) : null,
  };
}
