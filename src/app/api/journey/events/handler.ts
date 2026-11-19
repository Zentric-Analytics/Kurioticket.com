import { NextResponse } from "next/server";
import { z } from "zod";
import { readBoundedJsonBody } from "@/lib/bounded-json-body";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { clientJourneyEventTypes, isJourneySourcePath, type JourneyEventReceipt } from "@/lib/search-journey";
import { isSameOriginRequest } from "@/lib/visitor-identity";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import { recordClientJourneyEvent } from "@/services/searchJourneyService";

const clientEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(clientJourneyEventTypes),
  requestId: z.string().uuid(),
  provider: z.string().trim().min(1).max(100).regex(/^[^\u0000-\u001f\u007f]+$/).optional(),
  sourcePage: z.string().max(240).refine(isJourneySourcePath).optional(),
}).strict();

type Dependencies = {
  identity: typeof resolveRequestActivityIdentity;
  record: typeof recordClientJourneyEvent;
  rateLimit: typeof checkRateLimit;
  pause: (milliseconds: number) => Promise<void>;
};
const defaults: Dependencies = {
  identity: resolveRequestActivityIdentity,
  record: recordClientJourneyEvent,
  rateLimit: checkRateLimit,
  pause: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
};
function response(body: JourneyEventReceipt | { error: string }, status = 202) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function createJourneyEventHandler(dependencies: Dependencies = defaults) {
  return async function POST(request: Request) {
    if (!isSameOriginRequest(request)) return response({ error: "Invalid request origin." }, 403);
    const rate = dependencies.rateLimit(`journey-event:${getClientIp(request)}`, 60, 60_000);
    if (!rate.allowed) {
      const limited = response({ error: "Too many requests. Please try again shortly." }, 429);
      limited.headers.set("Retry-After", String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))));
      return limited;
    }

    const parsed = clientEventSchema.safeParse(await readBoundedJsonBody(request, 2048).catch(() => null));
    if (!parsed.success) return response({ error: "Invalid journey event." }, 400);
    try {
      const identity = await dependencies.identity(request);
      if (!identity.visitorId) return response({ accepted: false });
      let receipt = await dependencies.record({ ...parsed.data, ...identity });
      if (receipt.retryable) {
        // Bridge the usual after()-history race here without delaying a travel
        // response or retaining unverified event payloads in a server queue.
        await dependencies.pause(120);
        const currentIdentity = await dependencies.identity(request);
        if (!currentIdentity.visitorId || currentIdentity.visitorId !== identity.visitorId
          || currentIdentity.userId !== identity.userId) return response({ accepted: false });
        receipt = await dependencies.record({ ...parsed.data, ...currentIdentity });
      }
      return response(receipt);
    } catch {
      // Failure to establish a valid consented identity is never permission to retry tracking.
      return response({ accepted: false });
    }
  };
}
