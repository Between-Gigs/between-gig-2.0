import { describe, expect, it } from "vitest";
import { companyOs } from "./companyos";
import { session } from "./gigs";

describe("owner sessions keep their own linked person", () => {
  it.each([true, false])("keeps admin authority with linked person = %s", async (linked) => {
    const entities: string[] = [];
    const fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(_input));
      const reply = (value: unknown) => new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
      if (url.pathname.endsWith("/me")) return reply({ user: { id: "owner-user", email: "owner@example.org", name: "Owner" }, isSuperAdmin: true, roleKeys: ["super_admin"] });
      const query = JSON.parse(String(init?.body));
      entities.push(query.entity);
      if (query.entity === "person") {
        expect(JSON.stringify(query.filter)).toContain("user");
        expect(JSON.stringify(query.filter)).toContain("$me");
        return reply({ data: linked ? [{ id: "own-person", data: { user: "owner-user", email: "owner@example.org", name: "Owner" } }] : [] });
      }
      return reply({ data: [] });
    }) as typeof globalThis.fetch;
    const cos = companyOs({ url: "http://cos.internal:4000", tenant: "between-gigs", readerToken: "r".repeat(20), submitterToken: "s".repeat(20), fetch });
    const result = await session({ cos, cred: { kind: "session", token: "session-token" }, appUrl: "http://localhost:3000" });
    expect(result).toMatchObject({ role: "owner", personId: linked ? "own-person" : null, email: "owner@example.org" });
    expect(entities).toEqual(linked ? ["person", "profile"] : ["person"]);
  });
});
