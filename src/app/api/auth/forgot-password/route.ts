import crypto from "node:crypto";
import { NextResponse } from "next/server";

import {
  AuthRateLimitError,
  checkAuthRateLimit,
} from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";
import { sendTransactionalEmail } from "@/services/emailService";

export const runtime = "nodejs";

const genericResponse = {
  ok: true,
  message:
    "If an account exists for that email, a password reset link has been sent.",
};

export async function POST(
  request: Request
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error(
      "[forgot-password:invalid-json]",
      error
    );

    return NextResponse.json(
      genericResponse
    );
  }

  const parsed =
    forgotPasswordSchema.safeParse(
      body
    );

  const email = parsed.success
    ? parsed.data.email
    : undefined;

  try {
    checkAuthRateLimit({
      action: "forgot-password",
      email,
      request,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
  } catch (error) {
    if (
      error instanceof
      AuthRateLimitError
    ) {
      return NextResponse.json(
        {
          error:
            "Too many password reset attempts. Please wait and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              error.retryAfterSeconds
            ),
          },
        }
      );
    }

    throw error;
  }

  if (!parsed.success) {
    return NextResponse.json(
      genericResponse
    );
  }

  try {
    const normalizedEmail =
      parsed.data.email.toLowerCase();

    const prisma =
      getPrisma();

    const user =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    // Prevent account enumeration
    if (!user) {
      return NextResponse.json(
        genericResponse
      );
    }

    const rawToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    const identifier = `password-reset:${normalizedEmail}`;

    const expires =
      new Date(
        Date.now() +
          30 * 60 * 1000
      );

    await prisma.verificationToken.deleteMany(
      {
        where: {
          identifier,
        },
      }
    );

    await prisma.verificationToken.create(
      {
        data: {
          identifier,
          token:
            hashedToken,
          expires,
        },
      }
    );

    const baseUrl =
      process.env
        .NEXTAUTH_URL ||
      "http://localhost:3000";

    const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(
      rawToken
    )}`;

    await sendTransactionalEmail({
      to: normalizedEmail,
      subject:
        "Reset your CurioTicket password",
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 600px; margin: auto;">
          <h1>Reset your password</h1>

          <p>
            We received a request to reset your CurioTicket password.
          </p>

          <p>
            Click the secure button below to create a new password.
            This link expires in 30 minutes.
          </p>

          <p style="margin: 32px 0;">
            <a
              href="${resetUrl}"
              style="
                background:#0f172a;
                color:#ffffff;
                padding:14px 24px;
                border-radius:8px;
                text-decoration:none;
                display:inline-block;
                font-weight:600;
              "
            >
              Reset Password
            </a>
          </p>

          <p>
            If you did not request this,
            you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error(
      "[forgot-password:error]",
      error
    );
  }

  return NextResponse.json(
    genericResponse
  );
}