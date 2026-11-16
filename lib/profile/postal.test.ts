import { describe, expect, it } from "vitest";
import { blankFields } from "@/lib/data/fields";
import { fromProfile, toProfile } from "@/lib/data/companyos/fields";
import { defaultProfileTemplate } from "./template";
import { isPartFilled, validateStep } from "./validate";
import { POSTAL_CODE_MAX, postalCodeError, validPostalCode } from "./postal";

describe("market-aware postal answers", () => {
 it.each(["90026","01234"])("keeps a five-digit LA ZIP (%s)", value => expect(validPostalCode("la", value)).toBe(true));
 it.each(["", "1234", "123456", "90026-1234", "K1A 0B1"])("refuses non-five-digit LA values (%s)", value => expect(validPostalCode("la", value)).toBe(false));
 it.each(["K1A 0B1", "SW1A 1AA", "123456", "1000-123", "Å1 2BC"])("keeps letters, separators and longer fictional postal values (%s)", value => expect(validPostalCode("other", value)).toBe(true));
 it.each(["", "   ", "<script>", "A\n123", "A".repeat(POSTAL_CODE_MAX+1)])("refuses empty, malformed or oversized values (%s)", value => expect(validPostalCode("other", value)).toBe(false));
 it("uses the selected market consistently for errors and the location checklist", () => {
  const fields = { ...blankFields(), market: "other" as const, otherCity: "Fictional city, country", zip: "K1A 0B1" };
  expect(validateStep(2, fields)).not.toHaveProperty("zip");
  expect(isPartFilled("where", fields)).toBe(true);
  expect(validateStep(2, { ...fields, market: "la" })).toHaveProperty("zip", postalCodeError("la"));
  expect(isPartFilled("where", { ...fields, market: "la" })).toBe(false);
  expect(validateStep(2, { ...fields, zip: "" })).toHaveProperty("zip", postalCodeError("other"));
  expect(validateStep(2, { ...fields, zip: "" }, { ...defaultProfileTemplate, required: [] })).not.toHaveProperty("zip");
 });
 it("round-trips through existing profile fields without stripping letters or changing legacy answers", () => {
  const fields={...blankFields(),market:"other" as const,otherCity:"Fictional city",zip:"K1A 0B1",travel:"Existing travel note"};
  const {data,items}=toProfile(fields);
  expect(data.postal_code).toBe("K1A 0B1");
  expect(fromProfile(data,items,"")).toMatchObject({market:"other",zip:fields.zip,travel:fields.travel});
 });
});
