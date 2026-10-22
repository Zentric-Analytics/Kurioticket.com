import { adminOperationalReadResponse } from "@/services/adminOperationalReadHttp";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return adminOperationalReadResponse(
    await adminOperationalReads.searches.list(new URL(request.url).searchParams),
  );
}
