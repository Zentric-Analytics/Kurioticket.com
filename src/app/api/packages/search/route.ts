import { parseDealsSearchParams, validateDealsSearch } from "@/lib/deals/dealsSearchParams";
import { searchPackage } from "@/services/travel/packageOrchestrator";
import { isFeatureEnabled } from "@/lib/feature-controls/service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const requestId = request.headers.get("x-search-request-id")?.trim() || crypto.randomUUID();
  if (!(await isFeatureEnabled("DEALS_ENABLED"))) return Response.json({ error: "Package search is temporarily unavailable.", status: "unavailable", requestId }, { status: 503, headers: noStore });
  const rate = checkRateLimit(`package-search:${getClientIp(request)}`, 25, 60_000);
  if (!rate.allowed) return Response.json({ error: "Too many searches. Please pause for a moment.", requestId }, { status: 429, headers: noStore });
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON request body." }, { status: 400, headers: noStore }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Invalid package search." }, { status: 400, headers: noStore });
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (["string", "number", "boolean"].includes(typeof value)) params.set(key, String(value));
  }
  const query = parseDealsSearchParams(params);
  const errors = validateDealsSearch(query);
  if (Object.keys(errors).length) return Response.json({ error: "Package search needs more detail.", issues: errors }, { status: 400, headers: noStore });
  return Response.json(await searchPackage(query, requestId), { headers: noStore });
}
