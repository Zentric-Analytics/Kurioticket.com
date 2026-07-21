import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { touchUserSessionActivity } from "@/lib/sessionActivity";

export const runtime = "nodejs";

const revokeSessionSchema = z.object({
  sessionId: z.string().min(1),
});

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const payload = revokeSessionSchema.parse(await request.json());
    const currentActivityId = await touchUserSessionActivity({ userId, request });

    if (payload.sessionId === currentActivityId) {
      return NextResponse.json({ error: "Use Sign out to end this device. The current session record was not removed." }, { status: 400 });
    }

    const updated = await getPrisma().userSessionActivity.updateMany({
      where: { id: payload.sessionId, userId },
      data: { revokedAt: new Date() },
    });

    if (!updated.count) {
      return NextResponse.json({ error: "Session record not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, revocationMode: "record-only" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Choose a valid session record." }, { status: 400 });
    }

    console.error("[account-security-sessions:revoke]", error);
    return NextResponse.json({ error: "Unable to remove device record." }, { status: 500 });
  }
}
