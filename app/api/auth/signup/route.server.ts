import { handleSignup } from "@/lib/server/routes";

export const POST = (req: Request) => handleSignup(req);
