import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import {
  createVisitorToken,
  isSameOriginRequest,
  readVisitorToken,
  visitorCookieName,
  visitorCookieOptions,
} from "@/lib/visitor-identity";
import {
  registerAnalyticsVisitor,
  withdrawAnalyticsConsent,
} from "@/services/visitorIdentityService";

export const runtime = "nodejs";

const consentSchema = z.object({
  analytics: z.literal(true),
  policyVersion: z.string().trim().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rate = checkRateLimit(`visitor-consent:${ip}`, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const parsed = consentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Analytics consent is required to enable visitor tracking." }, { status: 400 });
  }

  const existingToken = readVisitorToken(request);
  const token = existingToken ?? createVisitorToken();
  const visitor = await registerAnalyticsVisitor({
    token,
    policyVersion: parsed.data.policyVersion,
  });

  if (!visitor) {
    return NextResponse.json({ error: "Visitor tracking is temporarily unavailable." }, { status: 503 });
  }

  const response = NextResponse.json({ analyticsTracking: "enabled" }, { status: existingToken ? 200 : 201 });
  response.cookies.set(visitorCookieName, token, visitorCookieOptions());
  return response;
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const token = readVisitorToken(request);
  await withdrawAnalyticsConsent(token);

  const response = NextResponse.json({ analyticsTracking: "disabled" });
  response.cookies.set(visitorCookieName, "", { ...visitorCookieOptions(), maxAge: 0 });
  return response;
}
