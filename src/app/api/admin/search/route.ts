import { requireAdminApiSession } from "@/lib/admin";
import { normalizeAdminSearch } from "@/lib/adminSearch";
import { getAdminSearchResults } from "@/lib/adminSearchResults";

export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if ("response" in auth) return auth.response;
  const q = normalizeAdminSearch(new URL(request.url).searchParams.get("q") || "");
  const headers = { "Cache-Control": "private, no-store" };
  try {
    return Response.json(await getAdminSearchResults(q), { headers });
  } catch {
    return Response.json({ error: "Search is temporarily unavailable. Please try again." }, { status: 503, headers });
  }
}
