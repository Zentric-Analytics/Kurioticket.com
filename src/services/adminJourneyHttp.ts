import type { AdminJourneyResult } from "./adminJourneyContract";
import type { AdminJourneyService } from "./adminJourneyCore";

function response(result: AdminJourneyResult<unknown>) {
  const status = { ok: 200, invalid: 400, forbidden: 403, not_found: 404, unavailable: 503 }[result.status];
  return Response.json(result, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" } });
}

export function createAdminJourneyHttpHandlers(service: AdminJourneyService) {
  return {
    list: async (request: Request) => response(await service.list(new URL(request.url).searchParams)),
    summary: async (request: Request) => response(await service.summary(new URL(request.url).searchParams)),
    detail: async (request: Request, context: { params: Promise<{ id: string }> }) => {
      const { id } = await context.params;
      return response(await service.detail(id, new URL(request.url).searchParams));
    },
  };
}
