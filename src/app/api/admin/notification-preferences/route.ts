import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiSession } from "@/lib/admin";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { readAdminNotificationPreferences, updateAdminNotificationPreferences } from "@/services/adminNotificationPreferencesService";

export const runtime = "nodejs";

const mutationSchema = z.object({
  showAcknowledgedWarnings: z.boolean(),
  reason: z.string().trim().max(500).optional(),
}).strict();

export async function GET() {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const snapshot = await readAdminNotificationPreferences(auth.session.user.id);
  if (!snapshot.available) return NextResponse.json({ error: "Notification settings are unavailable." }, { status: 503 });
  return NextResponse.json({ showAcknowledgedWarnings: snapshot.showAcknowledgedWarnings });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  try {
    checkAuthRateLimit({
      action: "admin-notification-preference",
      email: auth.session.user.email || undefined,
      request,
      limit: 20,
      windowMs: 15 * 60_000,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json({ error: "Too many settings changes. Try again later." }, {
        status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) },
      });
    }
    throw error;
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = mutationSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification setting." }, { status: 400 });

  try {
    const saved = await updateAdminNotificationPreferences({
      adminUserId: auth.session.user.id,
      adminEmail: auth.session.user.email || "",
      ...parsed.data,
    });
    return NextResponse.json(saved);
  } catch (error) {
    console.error("[admin-notification-preferences:write-failed]", error);
    return NextResponse.json({ error: "Unable to save notification settings. No change was applied." }, { status: 503 });
  }
}
