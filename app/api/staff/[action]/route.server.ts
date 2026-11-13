import { handleStaff } from "@/lib/server/staff";
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  return handleStaff((await context.params).action, request);
}
