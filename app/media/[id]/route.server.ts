import { media } from "@/lib/server/media";

export const GET = async (req: Request, { params }: { params: Promise<{ id: string }> }) => media(req, (await params).id);
