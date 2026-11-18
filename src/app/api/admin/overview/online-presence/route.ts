import { requireAdminApiSession } from "@/lib/admin";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { getOnlinePresenceSnapshot } from "@/services/onlinePresenceService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAdminApiSession();
  if (access.response) return access.response;

  // The browser's origin is a configuration diagnostic. It grants no access.
  const referrer = request.headers.get("sec-fetch-site") === "same-origin"
    ? request.headers.get("referer") ?? undefined
    : undefined;
  const snapshot = await getOnlinePresenceSnapshot(getPublicEnvironment(), new Date(), referrer);
  return Response.json(snapshot, {
    status: snapshot.status === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" },
  });
}
