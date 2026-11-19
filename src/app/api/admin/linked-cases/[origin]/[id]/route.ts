import { readAdminLinkedCasePreview } from "@/services/adminLinkedCasePreviewService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ origin: string; id: string }> };

/** Origin is the page currently open, not an independently supplied target ID. */
export async function GET(_request: Request, { params }: RouteContext) {
  const { origin, id } = await params;
  const result = await readAdminLinkedCasePreview(origin, id);
  const status = { ok: 200, invalid: 400, forbidden: 403, not_found: 404, unavailable: 503 }[result.status];
  return Response.json(result, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Authorization",
    },
  });
}
