import { vimeoThumbnail } from "@/lib/server/vimeo-thumb";

/** A Vimeo video's thumbnail address (JSON {url}), fetched server side and cached. null means "show the neutral placeholder". */
export const GET = async (req: Request) => {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const url = await vimeoThumbnail(id);
  return Response.json({ url }, { headers: { "cache-control": url ? "public, max-age=3600" : "public, max-age=300", "x-content-type-options": "nosniff" } });
};
