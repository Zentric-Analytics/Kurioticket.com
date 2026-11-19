import { adminOperationalReadResponse } from "@/services/adminOperationalReadHttp";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return adminOperationalReadResponse(
    await adminOperationalReads.searches.detail(id, new URL(request.url).searchParams),
  );
}
