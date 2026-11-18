import type { ProfileFields } from "@/lib/data/types";
export const OTHER_SERVICE = "__other";
/** Keep unknown current answers visible and offer Other on both new and existing rows. */
export function serviceSelectOptions(choices: string[], selected: string[], current: string | undefined, otherVisible: boolean) {
  return [
    ...[...new Set([...choices, ...(current ? [current] : [])])].filter(value => value === current || !selected.includes(value)).map(value => ({ value, label: value })),
    ...(!otherVisible ? [{ value: OTHER_SERVICE, label: "Other — name your service" }] : []),
  ];
}
export type ServiceFields = Pick<ProfileFields, "services" | "serviceLines" | "other">;
/** Explicit conversion moves the personal text intact into the existing custom-service field. */
export function customServiceFrom(fields: ServiceFields, index: number, otherVisible = false): ServiceFields | null {
  const name = fields.services[index];
  if (!name || otherVisible || fields.other.trim()) return null;
  const services = fields.services.filter((_, i) => i !== index);
  const lines = { ...fields.serviceLines }, line = Object.hasOwn(lines, name) ? lines[name] : "";
  if (!services.includes(name)) delete lines[name];
  return { services, serviceLines: lines, other: `${name}${line ? `\n${line}` : ""}` };
}

/** Refuse a delayed confirmation if any service answer changed while it was open. */
export function customServiceIfUnchanged(current: ServiceFields, expected: ServiceFields, index: number) {
  if (current.other !== expected.other || JSON.stringify(current.services) !== JSON.stringify(expected.services) || JSON.stringify(current.serviceLines ?? {}) !== JSON.stringify(expected.serviceLines ?? {})) return null;
  return customServiceFrom(current, index);
}

/** State transitions stay pure: queued edits are applied before a confirmed conversion is checked. */
export interface ServiceDraftState {
  fields: ProfileFields | null;
  conversion: { id: number; succeeded: boolean } | null;
}
export type ServiceDraftAction =
  | { type: "set"; value: ProfileFields | null | ((current: ProfileFields | null) => ProfileFields | null) }
  | { type: "convert"; id: number; expected: ServiceFields; index: number };
export function serviceDraftReducer(state: ServiceDraftState, action: ServiceDraftAction): ServiceDraftState {
  if (action.type === "set") {
    const fields = typeof action.value === "function" ? action.value(state.fields) : action.value;
    return Object.is(fields, state.fields) ? state : { ...state, fields };
  }
  const converted = state.fields && customServiceIfUnchanged(state.fields, action.expected, action.index);
  return {
    fields: converted && state.fields ? { ...state.fields, ...converted } : state.fields,
    conversion: { id: action.id, succeeded: !!converted },
  };
}
