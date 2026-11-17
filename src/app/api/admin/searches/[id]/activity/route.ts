import { adminOperationalReadResponse } from "@/services/adminOperationalReadHttp";
import { readAdminSearchScopedActivity } from "@/services/adminSearchScopedActivityService";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return adminOperationalReadResponse(
    await readAdminSearchScopedActivity(id, new URL(request.url).searchParams),
  );
}
