import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "Choose a different password.",
  });

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const payload = passwordChangeSchema.parse(await request.json());

    checkAuthRateLimit({
      action: "change-password",
      email: session.user?.email || undefined,
      request,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unable to update password." }, { status: 400 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Use password reset to create a password for this account." },
        { status: 409 },
      );
    }

    if (!payload.currentPassword) {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }

    const currentPasswordIsValid = await bcrypt.compare(payload.currentPassword, user.passwordHash);

    if (!currentPasswordIsValid) {
      return NextResponse.json({ error: "Unable to update password." }, { status: 400 });
    }

    const newPasswordHash = await bcrypt.hash(payload.newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
      select: { id: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Please check the password details and try again." }, { status: 400 });
    }

    if (error instanceof AuthRateLimitError) {
      return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 });
    }

    console.error("[account-security-password:patch]", error);
    return NextResponse.json({ error: "Unable to update password." }, { status: 500 });
  }
}
