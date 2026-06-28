import { NextResponse } from "next/server";

import {
  AuthRateLimitError,
  checkAuthRateLimit,
} from "@/lib/auth-rate-limit";

import {
  DatabaseUnavailableError,
  getPrisma,
} from "@/lib/prisma";

import { signupSchema } from "@/lib/validation";

import {
  DuplicateEmailError,
  InvalidEmailError,
  createPasswordUser,
} from "@/services/authService";

import {
  EmailVerificationCooldownError,
  EmailVerificationError,
  sendEmailVerificationCode,
} from "@/services/emailVerificationService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("[signup:invalid-json]", error);

    return NextResponse.json(
      { error: "Unable to create account right now." },
      { status: 400 }
    );
  }

  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: getPublicSignupValidationError(
          parsed.error.flatten().fieldErrors
        ),
      },
      { status: 400 }
    );
  }

  let createdUserId: string | null = null;

  try {
    checkAuthRateLimit({
      action: "signup",
      email: parsed.data.email,
      request,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    const user = await createPasswordUser(parsed.data);
    createdUserId = user.id;

    await sendEmailVerificationCode({
      email: parsed.data.email,
      name: parsed.data.name,
      action: "signup",
      enforceCooldown: true,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[signup]", error);

    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        {
          error: "Too many signup attempts. Please wait and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds),
          },
        }
      );
    }

    if (error instanceof DuplicateEmailError) {
      const duplicateSignupResponse =
        await getDuplicateSignupResponse(parsed.data.email);

      if (duplicateSignupResponse) {
        return duplicateSignupResponse;
      }

      return NextResponse.json(
        {
          error: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    if (error instanceof EmailVerificationCooldownError) {
      return NextResponse.json(
        {
          error: "Too many signup attempts. Please wait and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds),
          },
        }
      );
    }

    if (error instanceof InvalidEmailError) {
      return NextResponse.json(
        {
          error: "Enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (error instanceof EmailVerificationError) {
      if (createdUserId) {
        const email = parsed.data.email.toLowerCase().trim();

        try {
          await getPrisma().verificationToken.deleteMany({
            where: {
              identifier: `email-verification:${email}`,
            },
          });

          await getPrisma().user.deleteMany({
            where: {
              id: createdUserId,
              email,
              emailVerified: null,
            },
          });
        } catch (rollbackError) {
          console.error("[signup:rollback-failed]", rollbackError);
        }
      }

      return NextResponse.json(
        {
          error:
            "Unable to send verification code right now. Please try again.",
        },
        { status: 503 }
      );
    }

    if (
      error instanceof DatabaseUnavailableError ||
      isMissingMigrationError(error)
    ) {
      return NextResponse.json(
        {
          error: "Unable to create account right now.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Unable to create account right now.",
      },
      { status: 400 }
    );
  }
}

function getPublicSignupValidationError(
  fieldErrors: Record<string, string[] | undefined>
) {
  if (fieldErrors.email?.length) {
    return "Enter a valid email address.";
  }

  if (fieldErrors.password?.length) {
    return "Password must meet minimum requirements.";
  }

  return "Unable to create account right now.";
}

function isMissingMigrationError(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error);

  return /table .* does not exist|relation .* does not exist|database .* does not exist/i.test(
    message
  );
}

async function getDuplicateSignupResponse(emailInput: string) {
  const email = emailInput.toLowerCase().trim();
  const duplicateSignupWindowMs = 60 * 1000;
  const duplicateSignupWindowStart = new Date(
    Date.now() - duplicateSignupWindowMs
  );

  const existingUser = await getPrisma().user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  if (
    !existingUser ||
    existingUser.emailVerified ||
    !existingUser.passwordHash ||
    existingUser.createdAt < duplicateSignupWindowStart
  ) {
    return null;
  }

  console.info("[signup:duplicate-unverified-continue]", {
    email,
    userId: existingUser.id,
  });

  return NextResponse.json(
    {
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
      },
    },
    { status: 200 }
  );
}
