import type { ProductGateway, WorkItem, WorkspaceSnapshot } from "./types";
import { validateRelations, validateWork, validatePhase } from "./validation";
const phase = "00000000-0000-4000-8000-000000000001";
let state: WorkspaceSnapshot = {
  ready: true,
  mode: "sample",
  observedAt: new Date().toISOString(),
  phases: [
    {
      id: phase,
      title: "Example phase",
      order: 0,
      state: "active",
      summary:
        "Fictional preview. No actual project status or private correspondence.",
      doneLooksLike: "Demonstrate planning, evidence and progress controls.",
      sourceNote:
        "Fictional sample only; changes reset when this page is reloaded.",
    },
  ],
  items: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      phase,
      title: "Example: review an onboarding screen",
      kind: "task",
      parent: "",
      category: "ui",
      journey: "gigster",
      status: "in_review",
      owner: "Sample designer",
      description: "Fictional work item for exploring this interface.",
      acceptance: "Check the screen on mobile and desktop.",
      blocker: "",
      startDate: "2026-11-14",
      dueDate: "2026-11-18",
      evidence: [],
      dependsOn: [],
      deployment: "local",
      revision: 0,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      phase,
      title: "Example: agree the review checklist",
      kind: "task",
      parent: "",
      category: "review",
      journey: "owner",
      status: "done",
      owner: "Sample reviewer",
      description: "Fictional completed item.",
      acceptance: "Demonstration only.",
      blocker: "",
      startDate: "",
      dueDate: "",
      evidence: [
        {
          label: "Sample evidence",
          url: "",
          note: "Fictional acceptance example, not a real release.",
          checkedAt: "2026-11-15",
        },
      ],
      dependsOn: [],
      deployment: "not_applicable",
      revision: 0,
      updatedAt: new Date().toISOString(),
    },
  ],
};
const snapshot = async () =>
  structuredClone({ ...state, observedAt: new Date().toISOString() });
export const sampleProduct: ProductGateway = {
  snapshot,
  initialize: snapshot,
  create: async (input) => {
    const fields = validateWork(input);
    const id = crypto.randomUUID();
    validateRelations(fields, id, state.phases, state.items);
    state = {
      ...state,
      items: [
        ...state.items,
        { ...fields, id, revision: 0, updatedAt: new Date().toISOString() },
      ],
    };
    return snapshot();
  },
  update: async ({ id, revision, fields: input }) => {
    const current = state.items.find((item) => item.id === id);
    if (!current || current.revision !== revision)
      throw new Error("This sample item changed. Refresh before saving.");
    const fields = validateWork(input);
    validateRelations(fields, id, state.phases, state.items);
    const updated: WorkItem = {
      ...fields,
      id,
      revision: revision + 1,
      updatedAt: new Date().toISOString(),
    };
    state = {
      ...state,
      items: state.items.map((item) => (item.id === id ? updated : item)),
    };
    return snapshot();
  },
  savePhase: async ({ id, revision, fields: input }) => {
    const fields = validatePhase(input);
    const current = state.phases.find((p) => p.id === id);
    if (id && (!current || (current.revision ?? 0) !== revision))
      throw new Error("This phase changed. Refresh before saving.");
    const phase = {
      ...fields,
      id: id ?? crypto.randomUUID(),
      revision: current ? (current.revision ?? 0) + 1 : 0,
    };
    state = {
      ...state,
      phases: current
        ? state.phases.map((p) => (p.id === id ? phase : p))
        : [...state.phases, phase],
    };
    return snapshot();
  },
};
