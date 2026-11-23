import { adminOperationalReadResponse } from "@/services/adminOperationalReadHttp";
import { adminProductSearchRecords } from "@/services/adminProductSearchRecordsService";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return adminOperationalReadResponse(
    await adminProductSearchRecords.detail(id, new URL(request.url).searchParams),
  );
}
