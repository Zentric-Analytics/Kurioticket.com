import { requireAdminApiSession } from "@/lib/admin";
import { onlinePresenceWindowSeconds } from "@/lib/onlinePresence";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" };

export async function GET() {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const now = new Date();
  const windowSeconds = onlinePresenceWindowSeconds;
  const cutoff = new Date(now.getTime() - windowSeconds * 1000);
  const base = { observedAt: now.toISOString(), windowSeconds };
  const unavailable = () => Response.json({ ...base, status: "unavailable" }, { status: 503, headers });
  try {
    const db = getOptionalPrisma();
    if (!db) return unavailable();
    // A bot may have both verified and declared registry cohorts. Count the
    // canonical recorded name once, not activity rows or verification cohorts.
    // Unnamed automation cannot substantiate an identified bot count.
    const [row] = await db.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(DISTINCT UPPER(COALESCE(
        NULLIF(BTRIM(a."declaredName"), ''), NULLIF(BTRIM(b."name"), '')
      ))) AS total
      FROM "BotActivity" a
      JOIN "BotRegistry" b ON b.id = a."botId" AND b.environment = a.environment
      WHERE a.environment = ${getPublicEnvironment()}
        AND a.timestamp > ${cutoff} AND a.timestamp <= ${now}
    `;
    const total = Number(row?.total);
    if (!Number.isSafeInteger(total) || total < 0) return unavailable();
    return Response.json({ ...base, status: "ok", total }, { headers });
  } catch {
    return unavailable();
  }
}
