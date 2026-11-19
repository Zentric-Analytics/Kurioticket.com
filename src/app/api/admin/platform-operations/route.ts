import { requireAdminApiSession } from "@/lib/admin";
import { readPlatformOperations } from "@/services/platformOperationsService";
import { parsePlatformOperationsHours } from "@/services/platformOperationsContract";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if ("response" in auth && auth.response) { auth.response.headers.set("Cache-Control", "private, no-store"); return auth.response; }
  const params = new URL(request.url).searchParams;
  const period = params.get("period") === "today" ? "today" : "rolling";
  if (params.has("period") && (params.getAll("period").length !== 1 || params.get("period") !== "today")) {
    return Response.json({ error: "Unsupported reporting period." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
  const sanitized = new URLSearchParams(params);
  sanitized.delete("period");
  const hours = parsePlatformOperationsHours(sanitized);
  if (hours === null)
    return Response.json({ error: "Use hours between 1 and 720; environment is server-owned." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  return Response.json(await readPlatformOperations(hours, period), { headers: { "Cache-Control": "private, no-store" } });
}
