import { adminAuditReadResponse } from "@/services/adminAuditReadHttp";
import { adminAuditReads } from "@/services/adminAuditReadService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return adminAuditReadResponse(
    await adminAuditReads.list(new URL(request.url).searchParams),
  );
}
