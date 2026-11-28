import { requireAdminApiSession } from "@/lib/admin";
import { onlinePresenceWindowSeconds } from "@/lib/onlinePresence";
import { readActiveBotTotal } from "@/services/adminLiveBots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" };

export async function GET() {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const now = new Date();
  const windowSeconds = onlinePresenceWindowSeconds;
  const base = { observedAt: now.toISOString(), windowSeconds };
  const total = await readActiveBotTotal(now);
  return total === null
    ? Response.json({ ...base, status: "unavailable" }, { status: 503, headers })
    : Response.json({ ...base, status: "ok", total }, { headers });
}
