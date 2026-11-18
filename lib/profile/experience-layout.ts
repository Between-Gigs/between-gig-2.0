/** Editor-only arrangement preference: field identities, never profile answers or publication order. */
export const experienceOrder = ["skills", "years", "about"] as const;
export type ExperienceField = typeof experienceOrder[number];
export function parseExperienceOrder(raw: string | null): readonly ExperienceField[] {
 try { const value: unknown=JSON.parse(raw??"null");if(Array.isArray(value)&&value.length===3&&new Set(value).size===3&&value.every(v=>experienceOrder.includes(v)))return value as ExperienceField[]; } catch { /* Invalid browser preference. */ }
 return experienceOrder;
}
export function moveExperienceField(order: readonly ExperienceField[], field: ExperienceField, direction: -1|1): readonly ExperienceField[] {
 const from=order.indexOf(field),to=from+direction;if(from<0||to<0||to>=order.length)return order;
 const next=[...order];[next[from],next[to]]=[next[to],next[from]];return next;
}
