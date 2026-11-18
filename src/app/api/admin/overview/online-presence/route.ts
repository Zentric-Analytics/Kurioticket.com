import { requireAdminApiSession } from "@/lib/admin";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { getOnlinePresenceSnapshot } from "@/services/onlinePresenceService";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireAdminApiSession();
  if (access.response) return access.response;

  const snapshot = await getOnlinePresenceSnapshot(getPublicEnvironment());
  return Response.json(snapshot, {
    status: snapshot.status === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" },
  });
}
