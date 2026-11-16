import { requireAdminApiSession } from "@/lib/admin";
import { readPlatformOperations } from "@/services/platformOperationsService";
import { parsePlatformOperationsHours } from "@/services/platformOperationsContract";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if ("response" in auth && auth.response) { auth.response.headers.set("Cache-Control", "private, no-store"); return auth.response; }
  const params = new URL(request.url).searchParams;
  const hours = parsePlatformOperationsHours(params);
  if (hours === null)
    return Response.json({ error: "Use hours between 1 and 720; environment is server-owned." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  return Response.json(await readPlatformOperations(hours), { headers: { "Cache-Control": "private, no-store" } });
}
