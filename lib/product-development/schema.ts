import { CATEGORIES, JOURNEYS, KINDS, STATUSES } from "./types";
export const PHASE_ENTITY = "product_development_phase";
export const WORK_ENTITY = "product_development_item";
const field = (
  key: string,
  type = "text",
  config: Record<string, unknown> = {},
) => ({ key, name: key.replace(/_/g, " "), type, config });
const options = (values: readonly string[]) => ({
  options: values.map((value) => ({ value, label: value.replace(/_/g, " ") })),
});
export const SCHEMA = [
  {
    key: PHASE_ENTITY,
    name: "Product development phases",
    description: "Private product planning; superadmins only by default.",
    displayField: "title",
    fields: [
      field("title"),
      field("order", "number"),
      field("summary", "long_text"),
      field("state", "select", options(["complete", "active", "planned"])),
      field("doneLooksLike", "long_text"),
      field("sourceNote", "long_text"),
      field("revision", "number", { default: 0 }),
      field("seedKey"),
      field("creationHash"),
    ],
  },
  {
    key: WORK_ENTITY,
    name: "Product development work",
    description:
      "Private tasks, requests, evidence and related communications.",
    displayField: "title",
    fields: [
      field("title"),
      field("phase", "reference", { referenceEntityKey: PHASE_ENTITY }),
      field("kind", "select", options(KINDS)),
      field("parent", "reference", { referenceEntityKey: WORK_ENTITY }),
      field("category", "select", options(CATEGORIES)),
      field("journey", "select", options(JOURNEYS)),
      field("status", "select", options(STATUSES)),
      field("owner"),
      field("description", "long_text"),
      field("acceptance", "long_text"),
      field("blocker", "long_text"),
      field("startDate", "date"),
      field("dueDate", "date"),
      field("evidence", "json", { default: [] }),
      field("dependsOn", "json", { default: [] }),
      field(
        "deployment",
        "select",
        options(["not_applicable", "unknown", "local", "test", "production"]),
      ),
      field("revision", "number", { default: 0 }),
      field("seedKey"),
      field("creationHash"),
    ],
  },
];
