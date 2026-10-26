import { NextResponse } from "next/server";

import { getRequestIp, requireAdminApiSession } from "@/lib/admin";
import { validActivityIdentity } from "@/lib/adminIdentityActivity";
import { getPrisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/visitor-identity";
import { disableGuestTrackingAsAdmin } from "@/services/adminGuestManagement";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

/** Admin-only: disable this guest's analytics tracking without deleting records. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  if (!validActivityIdentity("guest", id)) return json({ error: "Guest not found." }, 404);
  if (!isSameOriginRequest(request)) return json({ error: "Invalid request origin." }, 403);

  try {
    const result = await getPrisma().$transaction(tx => disableGuestTrackingAsAdmin(
      tx,
      id,
      {
        userId: auth.session.user.id,
        email: auth.session.user.email || "unknown-admin",
        ipAddress: getRequestIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      },
    ));
    if (result === "not_found") return json({ error: "Guest not found." }, 404);
    if (result === "not_eligible") return json({
      error: "Guest identity is no longer eligible for independent management. Refresh the Users directory.",
    }, 409);
    if (result === "already_disabled") return json({
      error: "Tracking has already been disabled for this guest identity.",
    }, 409);

    return json({
      message: "Tracking disabled for this visitor ID. Recorded history is retained.",
      tracking: "disabled",
    });
  } catch {
    return json({ error: "Guest tracking could not be updated. Please try again." }, 503);
  }
}
