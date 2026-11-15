import { unsubscribePage } from "@/lib/server/unsubscribe";
export const GET = (req: Request) => unsubscribePage(req);
export const POST = (req: Request) => unsubscribePage(req);
