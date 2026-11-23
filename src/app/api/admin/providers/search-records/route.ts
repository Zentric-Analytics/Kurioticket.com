import { adminOperationalReadResponse } from "@/services/adminOperationalReadHttp";
import { adminProductSearchRecords } from "@/services/adminProductSearchRecordsService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return adminOperationalReadResponse(
    await adminProductSearchRecords.list(new URL(request.url).searchParams),
  );
}
