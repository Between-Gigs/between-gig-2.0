import { handleStaff } from "@/lib/server/staff";
export async function POST(req: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  return handleStaff(action, req);
}
