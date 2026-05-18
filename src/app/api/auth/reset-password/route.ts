import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import {
  AuthRateLimitError,
  checkAuthRateLimit,
} from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";
import {
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error(
      "[reset-password:invalid-json]",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to reset password right now.",
      },
      { status: 400 }
    );
  }

  const parsed =
    resetPasswordSchema.safeParse(body);

  const email = parsed.success
    ? parsed.data.email
    : undefined;

  try {
    checkAuthRateLimit({
      action: "reset-password",
      email,
      request,
      limit: 8,
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
      {
        error:
          "Please enter a valid password and try again.",
      },
      { status: 400 }
    );
  }

  try {
    const rawToken = String(
      parsed.data.token || ""
    );

    const password =
      parsed.data.password;

    const confirmPassword =
      parsed.data.confirmPassword;

    if (
      password !==
      confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            "Passwords do not match.",
        },
        { status: 400 }
      );
    }

    const passwordCheck =
      signupSchema.shape.password.safeParse(
        password
      );

    if (
      !passwordCheck.success
    ) {
      return NextResponse.json(
        {
          error:
            "Password must meet minimum requirements.",
        },
        { status: 400 }
      );
    }

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    const prisma =
      getPrisma();

    const resetToken =
      await prisma.verificationToken.findUnique(
        {
          where: {
            token:
              hashedToken,
          },
        }
      );

    const isInvalid =
      !resetToken ||
      !resetToken.identifier.startsWith(
        "password-reset:"
      ) ||
      resetToken.expires <=
        new Date();

    if (isInvalid) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or has expired.",
        },
        { status: 400 }
      );
    }

    const userEmail =
      resetToken.identifier.replace(
        "password-reset:",
        ""
      );

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    await prisma.user.update({
      where: {
        email: userEmail,
      },
      data: {
        passwordHash,
      },
    });

    await prisma.verificationToken.deleteMany(
      {
        where: {
          identifier:
            resetToken.identifier,
        },
      }
    );

    return NextResponse.json({
      ok: true,
      message:
        "Password reset successfully.",
    });
  } catch (error) {
    console.error(
      "[reset-password:error]",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to reset password right now.",
      },
      { status: 503 }
    );
  }
}