import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authOptions } from "@/lib/auth";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation";
import {
  consumeAccountEmailChangeCode,
  getAccountEmailChangeIdentifier,
  verifyAccountEmailChangeCode,
} from "@/services/emailVerificationService";

export const runtime = "nodejs";

const confirmEmailChangeSchema = z.object({
  newEmail: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  try {
    const payload = confirmEmailChangeSchema.parse(await request.json());
    const newEmail = payload.newEmail;

    checkAuthRateLimit({
      action: "account-email-change-confirm",
      email: session.user?.email || newEmail,
      request,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Unable to change email address." }, { status: 400 });
    }

    if (user.email?.toLowerCase().trim() === newEmail) {
      return NextResponse.json({ ok: false, error: "Enter a different email address." }, { status: 400 });
    }

    const codeVerification = await verifyAccountEmailChangeCode({
      userId: user.id,
      newEmail,
      code: payload.code,
    });

    if (codeVerification === "expired") {
      return NextResponse.json({ ok: false, error: "The verification code has expired. Please request a new one." }, { status: 400 });
    }

    if (codeVerification !== "valid") {
      return NextResponse.json({ ok: false, error: "The verification code is invalid or expired." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (existing && existing.id !== user.id) {
      await consumeAccountEmailChangeCode({ userId: user.id, newEmail });
      return NextResponse.json({ ok: false, error: "This email address is already in use." }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { email: newEmail, emailVerified: new Date() },
        select: { id: true },
      });

      await tx.verificationToken.deleteMany({
        where: { identifier: getAccountEmailChangeIdentifier(user.id, newEmail) },
      });
    });

    return NextResponse.json({ ok: true, email: newEmail });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    }

    if (error instanceof ZodError) {
      const invalidCode = error.issues.some((issue) => issue.path.includes("code"));
      return NextResponse.json(
        { ok: false, error: invalidCode ? "The verification code is invalid or expired." : "Enter a valid email address." },
        { status: 400 },
      );
    }

    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { ok: false, error: "Too many verification attempts. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }

    if (isUniqueEmailError(error)) {
      return NextResponse.json({ ok: false, error: "This email address is already in use." }, { status: 409 });
    }

    console.error("[account-email-change-confirm:post]", error);
    return NextResponse.json({ ok: false, error: "Unable to change email address." }, { status: 500 });
  }
}


function isUniqueEmailError(error: unknown) {
  return error instanceof Error && /Unique constraint failed|P2002|unique/i.test(error.message) && /email/i.test(error.message);
}
