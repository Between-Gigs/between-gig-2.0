import { handleUpload } from "@/lib/server/routes";

export const POST = (req: Request) => handleUpload(req);
