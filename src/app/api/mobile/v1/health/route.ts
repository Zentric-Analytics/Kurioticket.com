import { mobileApiSuccess } from "@/lib/mobile-api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return mobileApiSuccess({
    available: true,
    apiVersion: "v1",
  });
}
