import { requireAdminApiSession } from "@/lib/admin";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { readAdminOnlineUsers } from "@/services/adminOnlineUsersService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const referrer = request.headers.get("sec-fetch-site") === "same-origin"
    ? request.headers.get("referer") ?? undefined : undefined;
  const result = await readAdminOnlineUsers(getPublicEnvironment(), new Date(), referrer);
  return Response.json(result, {
    status: result.status === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" },
  });
}
