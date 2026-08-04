import { mobileApiSuccess } from "@/lib/mobile-api/response";
import { getPublicEnvironment, getStagingReleaseReadiness } from "@/lib/stagingSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const releaseReadiness = getStagingReleaseReadiness();

  return mobileApiSuccess({
    available: true,
    apiVersion: "v1",
    environment: getPublicEnvironment(),
    ...(releaseReadiness ? { releaseReadiness } : {}),
  });
}
