import { describe, expect, it, vi } from "vitest";
import { handleProductDevelopment } from "./product-development";
import { companyOs } from "./companyos";
import { SCHEMA } from "@/lib/product-development/schema";
const verifiedIdentity = { user: { id: "00000000-0000-4000-8000-000000000010", email: "qa@example.test" }, roleKeys: ["super_admin"], isSuperAdmin: true, tenant: { slug: "between-gigs", id: "38c1218b-1c1f-4fd3-874a-a8b2ea547628" } };
const request = (body: unknown, token = "session-token") =>
  new Request("https://example.org/api/product-development/", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
describe("private product development", () => {
  it("requires a session before accessing backend", async () => {
    const call = vi.fn();
    expect(
      (
        await handleProductDevelopment(request({ action: "snapshot" }, ""), {
          cos: { call } as never,
        })
      ).status,
    ).toBe(401);
    expect(call).not.toHaveBeenCalled();
  });
  it("denies providers before metadata, records or mutations", async () => {
    const cos = {
      me: vi.fn().mockResolvedValue({ isSuperAdmin: false }),
      call: vi.fn(),
    };
    expect(
      (
        await handleProductDevelopment(request({ action: "initialize" }), {
          cos: cos as never,
        })
      ).status,
    ).toBe(403);
    expect(cos.call).not.toHaveBeenCalled();
  });
  it("refuses caller-controlled tenant, entity and unsupported actions", async () => {
    const cos = {
      me: vi.fn().mockResolvedValue(verifiedIdentity),
      call: vi.fn(),
    };
    for (const body of [
      { action: "snapshot", tenant: "other" },
      { action: "delete" },
      { action: "snapshot", entity: "person" },
    ])
      expect(
        (await handleProductDevelopment(request(body), { cos: cos as never }))
          .status,
      ).toBe(400);
    expect(cos.call).not.toHaveBeenCalled();
  });
  it("reports uninitialized database honestly and without writing", async () => {
    const fetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        expect(init?.method).toBe("GET");
        return Response.json(
          String(url).endsWith("/me")
            ? verifiedIdentity
            : { entities: [] },
        );
      },
    );
    const cos = companyOs({
      url: "https://api.example.org",
      tenant: "between-gigs",
      readerToken: "",
      submitterToken: "",
      fetch: fetch as typeof globalThis.fetch,
    });
    const res = await handleProductDevelopment(
      request({ action: "snapshot" }),
      { cos },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).result).toMatchObject({
      ready: false,
      mode: "database",
      items: [],
    });
    expect(
      fetch.mock.calls.every(([url]) =>
        String(url).startsWith("https://api.example.org/t/between-gigs/"),
      ),
    ).toBe(true);
  });
});


describe("verified identity and private generic-API storage boundary", () => {
  const permissions = () => SCHEMA.flatMap(entity => ["read", "create", "update", "delete"].map(action => ({ entity: entity.key, action, scope: "all" })));
  const stub = (me: unknown = verifiedIdentity, roles: unknown = [{ key: "super_admin", permissions: permissions() }], entities: unknown = SCHEMA) => {
    const query = vi.fn(async () => []);
    const call = vi.fn(async (_cred: unknown, method: string, path: string) => {
      if (method === "GET" && path === "/meta/entities") return { entities };
      if (method === "GET" && path === "/admin/roles") return { roles };
      throw new Error("Unexpected backend operation");
    });
    return { me: vi.fn(async () => me), call, query };
  };
  it.each(["false", 1, {}, null, undefined])("refuses malformed superadmin assertion %j before storage", async assertion => {
    const cos = stub({ ...verifiedIdentity, isSuperAdmin: assertion });
    expect((await handleProductDevelopment(request({action:"snapshot"}), {cos:cos as never})).status).toBe(403);
    expect(cos.call).not.toHaveBeenCalled(); expect(cos.query).not.toHaveBeenCalled();
  });
  it.each([
    { ...verifiedIdentity, user: null }, { ...verifiedIdentity, user: { id: "wrong", email: "qa@example.test" } },
    { ...verifiedIdentity, roleKeys: "super_admin" }, { ...verifiedIdentity, tenant: null },
    { ...verifiedIdentity, tenant: { slug: "between-gigs", id: "other" } },
    { ...verifiedIdentity, tenant: { slug: "other", id: verifiedIdentity.tenant.id } },
  ])("refuses unverifiable identity or tenant before metadata", async me => {
    const cos = stub(me);
    expect((await handleProductDevelopment(request({action:"snapshot"}), {cos:cos as never})).status).toBe(503);
    expect(cos.call).not.toHaveBeenCalled(); expect(cos.query).not.toHaveBeenCalled();
  });
  it.each(["snapshot", "initialize"])("refuses nonadmin grants before %s reads or writes", async action => {
    for (const entity of SCHEMA) for (const scope of ["own", "all"]) {
      const cos = stub(verifiedIdentity, [{key:"super_admin",permissions:permissions()}, {key:"provider",permissions:[{entity:entity.key,action:"read",scope}]}]);
      const response = await handleProductDevelopment(request({action}), {cos:cos as never});
      expect(response.status).toBe(409); expect((await response.json()).error).toBe("product_storage_not_private");
      expect(cos.query).not.toHaveBeenCalled(); expect(cos.call.mock.calls.every(([,method])=>method==="GET")).toBe(true);
    }
  });
  it("refuses unsafe partial storage before creating missing metadata", async () => {
    const cos=stub(verifiedIdentity,[{key:"super_admin",permissions:permissions()},{key:"provider",permissions:[{entity:SCHEMA[0].key,action:"update",scope:"own"}]}],[SCHEMA[0]]);
    expect((await handleProductDevelopment(request({action:"initialize"}),{cos:cos as never})).status).toBe(409);
    expect(cos.query).not.toHaveBeenCalled(); expect(cos.call.mock.calls.every(([,method])=>method==="GET")).toBe(true);
  });
  it.each(["read", "create", "update", "delete"])("refuses missing required superadmin %s grant", async action => {
    const cos=stub(verifiedIdentity,[{key:"super_admin",permissions:permissions().filter(permission=>permission.action!==action)}]);
    expect((await handleProductDevelopment(request({action:"snapshot"}),{cos:cos as never})).status).toBe(409);
    expect(cos.query).not.toHaveBeenCalled();
  });
  it.each([null, [], [{key:"super_admin",permissions:null}], [{key:"provider",permissions:[{entity:SCHEMA[0].key,action:"read",scope:"unexpected"}]}]])("fails closed on malformed access metadata", async roles => {
    const cos=stub(verifiedIdentity,roles);
    expect((await handleProductDevelopment(request({action:"snapshot"}),{cos:cos as never})).status).toBe(503);
    expect(cos.query).not.toHaveBeenCalled();
  });
  it("allows reviewed private storage without granting or repairing permissions", async () => {
    const cos=stub(); const response=await handleProductDevelopment(request({action:"snapshot"}),{cos:cos as never});
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store"); expect(response.headers.get("vary")).toBe("Authorization");
    expect(cos.call.mock.calls.every(([,method])=>method==="GET")).toBe(true); expect(cos.query).toHaveBeenCalledTimes(2);
  });
  it.each([
    [SCHEMA[1], SCHEMA[1]],
    [{ ...SCHEMA[1], fields: [...SCHEMA[1].fields, SCHEMA[1].fields[0]] }],
    [{ ...SCHEMA[1], orgUnit: "other-unit" }],
  ])("refuses incompatible partial schema before setup creates metadata", async (...entities) => {
    const cos=stub(verifiedIdentity,undefined,entities);
    expect((await handleProductDevelopment(request({action:"initialize"}),{cos:cos as never})).status).toBe(409);
    expect(cos.query).not.toHaveBeenCalled(); expect(cos.call.mock.calls.every(([,method])=>method==="GET")).toBe(true);
  });

});
