import { NextResponse } from "next/server";
import { z } from "zod";
import { readBoundedJsonBody } from "@/lib/bounded-json-body";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { clientJourneyDecisionTypes, clientJourneyEventTypes, isJourneySourcePath, isJourneySearchEditField, journeyDecisionSourceProduct, journeyFilterGroups, journeySortModes, journeySortChoices, journeyFilterSelectionGroups, type JourneyEventReceipt } from "@/lib/search-journey";
import { isNativeVisitorRequest, isSameOriginRequest } from "@/lib/visitor-identity";
import { customerObservedPlatform } from "@/lib/activityTrackingContract";
import { resolveObservedActivityIdentity } from "@/services/requestActivityIdentity";
import { recordClientJourneyEvent } from "@/services/searchJourneyService";

const clientEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(clientJourneyEventTypes),
  requestId: z.string().uuid(),
  provider: z.string().trim().min(1).max(100).regex(/^[^\u0000-\u001f\u007f]+$/).optional(),
  /** Optional for old clients. Required for newly differentiated flight stages. */
  offerId: z.string().min(1).max(128).regex(/^[A-Za-z0-9._:+~=-]+$/).optional(),
  sourcePage: z.string().max(240).refine(isJourneySourcePath).optional(),
  filterGroup: z.enum(journeyFilterGroups).optional(),
  sortMode: z.enum(journeySortModes).optional(),
  sortChoice: z.enum(journeySortChoices).optional(),
  editFields: z.array(z.string().refine(isJourneySearchEditField)).min(1).max(7).optional(),
  observedResult: z.object({
    label: z.string().trim().min(1).max(120).regex(/^[^\u0000-\u001f\u007f<>]+$/),
    provider: z.string().trim().min(1).max(100).regex(/^[^\u0000-\u001f\u007f<>]+$/),
    amount: z.number().finite().positive().max(1_000_000_000),
    currency: z.string().regex(/^[A-Z]{3}$/),
    priceBasis: z.enum(["total", "per_night", "per_day"]),
    totalAmount: z.number().finite().positive().max(1_000_000_000).optional(),
  }).strict().optional(),
  filterSelections: z.array(z.object({
    group: z.enum(journeyFilterSelectionGroups),
    option: z.string().trim().min(1).max(72).regex(/^[\p{L}\p{N} ._:+\-']+$/u),
  }).strict()).max(20).optional(),
}).strict().superRefine((event, ctx) => {
  const isDecision = (clientJourneyDecisionTypes as readonly string[]).includes(event.type);
  if (isDecision && !journeyDecisionSourceProduct(event.sourcePage)) {
    ctx.addIssue({ code: "custom", path: ["sourcePage"], message: "A normalized travel results screen is required." });
  }
  if ((event.type === "RESULT_DETAILS_OPENED" || event.type === "RATE_DETAILS_OPENED") && !event.offerId) {
    ctx.addIssue({ code: "custom", path: ["offerId"], message: "Result reference required." });
  }
  if (event.type === "SEARCH_FILTER_APPLIED" ? !event.filterGroup : Boolean(event.filterGroup)) {
    ctx.addIssue({ code: "custom", path: ["filterGroup"], message: "Filter group must match the applied-filter action." });
  }
  if (event.observedResult && !["RESULT_DETAILS_OPENED", "RATE_DETAILS_OPENED", "FLIGHT_DETAILS_VIEWED"].includes(event.type)) {
    ctx.addIssue({ code: "custom", path: ["observedResult"], message: "Result evidence requires an actual details opening." });
  }
  if (event.type !== "SEARCH_FILTER_APPLIED" && event.filterSelections !== undefined) {
    ctx.addIssue({ code: "custom", path: ["filterSelections"], message: "Selections belong only to applied filters." });
  }
  if (event.type === "SEARCH_SORT_CHANGED" ? !event.sortMode : Boolean(event.sortMode)) {
    ctx.addIssue({ code: "custom", path: ["sortMode"], message: "Sort mode must match the sort action." });
  }
  if (event.type !== "SEARCH_SORT_CHANGED" && event.sortChoice) {
    ctx.addIssue({ code: "custom", path: ["sortChoice"], message: "Sort choice is only valid for a sort action." });
  }
  if (event.editFields && (event.type !== "SEARCH_EDIT_APPLIED" || new Set(event.editFields).size !== event.editFields.length)) {
    ctx.addIssue({ code: "custom", path: ["editFields"], message: "Distinct approved edit fields require a submitted search edit." });
  }
  if ((event.type === "FLIGHT_DETAILS_VIEWED" || event.type === "PROVIDER_DEAL_SELECTED") && !event.offerId) {
    ctx.addIssue({ code: "custom", path: ["offerId"], message: "Offer reference required." });
  }
});

type Dependencies = {
  identity: typeof resolveObservedActivityIdentity;
  record: typeof recordClientJourneyEvent;
  rateLimit: typeof checkRateLimit;
  pause: (milliseconds: number) => Promise<void>;
};
const defaults: Dependencies = {
  identity: resolveObservedActivityIdentity,
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
      const native = isNativeVisitorRequest(request);
      const identity = await dependencies.identity(request);
      if (!identity.visitorId) return response({ accepted: false });
      const platform = customerObservedPlatform(request, native, identity.applicationSource);
      let receipt = await dependencies.record({ ...parsed.data, ...identity, platform });
      if (receipt.retryable) {
        // Bridge the usual after()-history race here without delaying a travel
        // response or retaining unverified event payloads in a server queue.
        await dependencies.pause(120);
        const currentIdentity = await dependencies.identity(request);
        if (!currentIdentity.visitorId || currentIdentity.visitorId !== identity.visitorId
          || currentIdentity.userId !== identity.userId) return response({ accepted: false });
        receipt = await dependencies.record({ ...parsed.data, ...currentIdentity, platform: customerObservedPlatform(request, native, currentIdentity.applicationSource) });
      }
      return response(receipt);
    } catch {
      // Failure to establish a valid consented identity is never permission to retry tracking.
      return response({ accepted: false });
    }
  };
}
