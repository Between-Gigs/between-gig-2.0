import { companyOs, configFromEnv, CompanyOsError, type CompanyOs } from "./companyos";
import { bearer, failure, readCapped } from "./routes";
import { session } from "./gigs";
import { mediaProblem, mp4Duration, SHOWCASE_MAX_BYTES } from "@/lib/profile/showcase";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export async function handleWorkUpload(req: Request, deps: {
    cos?: CompanyOs;
    enabled?: boolean;
} = {}) {
    const token = bearer(req);
    if (!token)
        return json(401, { error: "unauthorized" });
    if (!(deps.enabled ?? process.env.COMPANY_OS_PROFILE_REVIEW === "1"))
        return json(503, { error: "profile_review_unavailable", message: "Showcase uploads are awaiting backend activation." });
    const mime = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(mime))
        return json(415, { error: "unsupported_media_type" });
    const bytes = await readCapped(req, SHOWCASE_MAX_BYTES);
    if (!bytes)
        return json(413, { error: "file_too_large" });
    const problem = mediaProblem(mime, bytes.byteLength, mime === "video/mp4" ? mp4Duration(bytes) : undefined);
    if (problem)
        return json(422, { error: "invalid_media", message: problem });
    try {
        const cos = deps.cos ?? companyOs(configFromEnv()), cred = { kind: "session" as const, token };
        const who = await session({ cos, cred, appUrl: "" });
        if (!who?.personId)
            return json(403, { error: "profile_required" });
        let [profile] = await cos.query(cred, { entity: "profile", filter: { field: "person", op: "eq", value: who.personId }, limit: 1 });
        if (!profile)
            profile = await cos.create(cred, "profile", { person: who.personId, display_name: who.name });
        const kind = mime === "video/mp4" ? "portfolio_video" : "portfolio";
        const { file, uploadUrl } = await cos.startUpload(cred, { ownerEntity: "profile", ownerId: profile.id, kind, filename: "showcase." + (mime === "image/jpeg" ? "jpg" : mime.split("/")[1]), mime, sizeBytes: bytes.byteLength });
        await cos.putBytes(uploadUrl, bytes, mime);
        await cos.confirmUpload(cred, file.id);
        return json(200, { result: "/media/" + file.id });
    }
    catch (e) {
        return failure(e instanceof CompanyOsError ? e : new CompanyOsError(502, "upload_failed"));
    }
}
