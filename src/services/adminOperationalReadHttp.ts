import type { AdminOperationalResult } from "./adminOperationalReadContract";

export function adminOperationalReadResponse(result: AdminOperationalResult<unknown>) {
  const status = { ok: 200, invalid: 400, forbidden: 403, not_found: 404, unavailable: 503 }[result.status];
  return Response.json(result, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Authorization",
    },
  });
}
