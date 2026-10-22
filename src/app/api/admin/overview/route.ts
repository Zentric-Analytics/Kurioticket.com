import { getAdminOverview } from "@/services/adminOverviewService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const result = await getAdminOverview(new URL(request.url).searchParams);
  const status = { ok: 200, invalid: 400, forbidden: 403, unavailable: 503 }[result.status];
  return Response.json(result, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" },
  });
}
