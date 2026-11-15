export const KINDS = ["project", "milestone", "task", "checklist", "request", "deliverable", "communication"] as const;
export const STATUSES = ["not_started", "in_progress", "blocked", "in_review", "done", "archived"] as const;
export const CATEGORIES = ["copy", "ui", "bug", "infrastructure", "data", "profile", "review", "email", "accessibility", "testing", "other"] as const;
export const JOURNEYS = ["gigster", "owner", "shared"] as const;
export type WorkKind = typeof KINDS[number];
export type WorkStatus = typeof STATUSES[number];
export type Category = typeof CATEGORIES[number];
export type Journey = typeof JOURNEYS[number];
export interface Evidence { label: string; url: string; note: string; checkedAt: string }
export interface Phase { id: string; title: string; order: number; summary: string; state: "complete" | "active" | "planned"; doneLooksLike: string; sourceNote: string }
export interface WorkFields {
  title: string; phase: string; kind: WorkKind; parent: string; category: Category; journey: Journey;
  status: WorkStatus; owner: string; description: string; acceptance: string; blocker: string;
  startDate: string; dueDate: string; evidence: Evidence[]; dependsOn: string[];
  deployment: "not_applicable" | "unknown" | "local" | "test" | "production";
}
export interface WorkItem extends WorkFields { id: string; revision: number; updatedAt: string }
export interface WorkspaceSnapshot { ready: boolean; phases: Phase[]; items: WorkItem[]; observedAt: string; mode: "database" | "sample" }
export interface ProductGateway {
  snapshot(): Promise<WorkspaceSnapshot>;
  initialize(): Promise<WorkspaceSnapshot>;
  create(input: WorkFields): Promise<WorkspaceSnapshot>;
  update(input: { id: string; revision: number; fields: WorkFields }): Promise<WorkspaceSnapshot>;
}
