import { servePreview } from "@/lib/server/preview";
export const dynamic = "force-dynamic";
export const GET = servePreview;
export const HEAD = servePreview;
