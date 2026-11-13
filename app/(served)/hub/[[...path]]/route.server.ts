import { servePreview } from "@/lib/server/preview";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => servePreview(request);
export const HEAD = GET;
