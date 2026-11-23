import type { AdminAuditResult } from "./adminAuditReadContract";

export function adminAuditReadResponse(result: AdminAuditResult<unknown>) {
  const status = { ok: 200, invalid: 400, forbidden: 403, unavailable: 503 }[result.status];
  return Response.json(result, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" },
  });
}
