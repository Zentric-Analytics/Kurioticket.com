import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, readVisitorToken } from "@/lib/visitor-identity";
import { resolveConsentedVisitorId } from "@/services/visitorIdentityService";
import {
  clientJourneyEventTypes,
  recordClientJourneyEvent,
} from "@/services/searchJourneyService";

export const runtime = "nodejs";

const clientEventSchema = z.object({
  eventId: z.string().trim().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(clientJourneyEventTypes),
  requestId: z.string().trim().min(1).max(100),
  provider: z.string().trim().min(1).max(100).optional(),
  sourcePage: z.string().trim().startsWith("/").max(240).optional(),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const rate = checkRateLimit(`journey-event:${getClientIp(request)}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const parsed = clientEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid journey event." }, { status: 400 });
  }

  const visitorId = await resolveConsentedVisitorId(readVisitorToken(request));
  const accepted = await recordClientJourneyEvent({
    visitorId,
    ...parsed.data,
  });

  return NextResponse.json({ accepted }, { status: 202 });
}
