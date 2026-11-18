import { handleStaffNavigation } from "@/lib/server/staff-navigation";
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  return handleStaffNavigation((await context.params).action, request);
}
