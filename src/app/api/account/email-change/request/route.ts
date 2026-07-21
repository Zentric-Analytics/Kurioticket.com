import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authOptions } from "@/lib/auth";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation";
import {
  EmailVerificationCooldownError,
  EmailVerificationError,
  sendAccountEmailChangeCode,
} from "@/services/emailVerificationService";

export const runtime = "nodejs";

const requestEmailChangeSchema = z.object({
  newEmail: emailSchema,
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  try {
    const payload = requestEmailChangeSchema.parse(await request.json());
    const newEmail = payload.newEmail;

    checkAuthRateLimit({
      action: "account-email-change-request",
      email: session.user?.email || newEmail,
      request,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Unable to change email address." }, { status: 400 });
    }

    if (user.email?.toLowerCase().trim() === newEmail) {
      return NextResponse.json({ ok: false, error: "Enter a different email address." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (existing && existing.id !== user.id) {
      return NextResponse.json({ ok: false, error: "This email address is already in use." }, { status: 409 });
    }

    const sendResult = await sendAccountEmailChangeCode({
      userId: user.id,
      newEmail,
      name: user.name,
      enforceCooldown: true,
    });

    return NextResponse.json({ ok: true, cooldownSeconds: sendResult.cooldownSeconds });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    }

    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { ok: false, error: "Please wait 30 seconds before requesting another verification code." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }

    if (error instanceof EmailVerificationCooldownError) {
      return NextResponse.json(
        { ok: false, error: "Please wait 30 seconds before requesting another verification code." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }

    if (error instanceof EmailVerificationError) {
      return NextResponse.json({ ok: false, error: "Unable to send verification code right now." }, { status: 503 });
    }

    console.error("[account-email-change-request:post]", error);
    return NextResponse.json({ ok: false, error: "Unable to request email change." }, { status: 500 });
  }
}
