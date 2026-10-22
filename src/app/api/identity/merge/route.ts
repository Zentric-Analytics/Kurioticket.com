import { NextResponse } from "next/server";

import { isSameOriginRequest, readVisitorToken } from "@/lib/visitor-identity";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { linkVisitorToUser } from "@/services/visitorIdentityService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const canonical = await requireWebApiSession();
  if (!canonical?.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const visitorId = await linkVisitorToUser({
    token: readVisitorToken(request),
    userId: canonical.userId,
    source: "ACCOUNT_API",
  });

  return NextResponse.json({ merged: Boolean(visitorId) });
}
