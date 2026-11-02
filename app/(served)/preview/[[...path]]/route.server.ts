// /preview/…: the sample-data export of the whole site, super admins only (lib/server/preview.ts).
import { servePreview } from "@/lib/server/preview";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => servePreview(req);
export const HEAD = (req: Request) => servePreview(req);
