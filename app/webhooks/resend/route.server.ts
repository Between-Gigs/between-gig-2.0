import { forwardResend } from "@/lib/server/webhooks";

export const POST = (req: Request) => forwardResend(req);
