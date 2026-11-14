import { handleWorkUpload } from "@/lib/server/showcase";
export const POST = (req: Request) => handleWorkUpload(req);
