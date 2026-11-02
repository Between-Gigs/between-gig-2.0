// The preview's door: a super admin's signed-in session gets the /preview cookie (lib/server/preview.ts).
import { grantPreview } from "@/lib/server/preview";

export const POST = (req: Request) => grantPreview(req);
