import { requireAdminApiSession } from "@/lib/admin";
import { readPlatformOperations } from "@/services/platformOperationsService";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if ("response" in auth) return auth.response;
  const params = new URL(request.url).searchParams;
  const hours = Number(params.get("hours") ?? 24);
  if (!Number.isInteger(hours) || hours < 1 || hours > 720 || [...params.keys()].some(key => key !== "hours"))
    return Response.json({ error: "Use hours between 1 and 720; environment is server-owned." }, { status: 400 });
  return Response.json(await readPlatformOperations(hours), { headers: { "Cache-Control": "private, no-store" } });
}
