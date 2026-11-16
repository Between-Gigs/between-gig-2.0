import type { Market } from "@/lib/data/types";

/** Bounded text entry, not a country-by-country postal-address verifier. */
export const POSTAL_CODE_MAX = 20;
export function validPostalCode(market: Market, value: string): boolean {
  if (market === "la") return /^\d{5}$/.test(value);
  const code = value.trim();
  return code.length <= POSTAL_CODE_MAX && /^[\p{L}\p{N}][\p{L}\p{N}\p{M} -]*$/u.test(code);
}
export const postalCodeError = (market: Market) => market === "la"
  ? "Enter a 5-digit ZIP code, like 90026."
  : `Enter a ZIP or postal code using up to ${POSTAL_CODE_MAX} letters, numbers, spaces or hyphens.`;
