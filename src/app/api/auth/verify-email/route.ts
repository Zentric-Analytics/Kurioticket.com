import { NextResponse } from "next/server";
import {
  AuthRateLimitError,
  checkAuthRateLimit,
} from "@/lib/auth-rate-limit";
import { signinSchema } from "@/lib/validation";
import {
  EmailVerificationCooldownError,
  sendEmailVerificationCode,
  verifyEmailCode,
} from "@/services/emailVerificationService";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("[verify-email:invalid-json]", error);

    return NextResponse.json(
      { error: "Unable to verify email right now." },
      { status: 400 }
    );
  }

  const input = parseVerifyEmailBody(body);

  if (!input) {
    return NextResponse.json(
      { error: "Unable to verify email right now." },
      { status: 400 }
    );
  }

  try {
    checkAuthRateLimit({
      action: "verify-email",
      email: input.email,
      request,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        {
          error:
            "Too many verification attempts. Please wait and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds),
          },
        }
      );
    }

    throw error;
  }

  const verified = await verifyEmailCode(input);

  if (!verified) {
    return NextResponse.json(
      {
        error:
          "The verification code is invalid or expired.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error(
      "[verify-email-resend:invalid-json]",
      error
    );

    return NextResponse.json({ ok: true });
  }

  const email = parseEmail(body);

  try {
    checkAuthRateLimit({
      action: "verify-email-resend",
      email: email || undefined,
      request,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Too many resend attempts. Please wait and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds),
          },
        }
      );
    }

    throw error;
  }

  if (email) {
    const user = await getPrisma().user.findUnique({
      where: { email },
      select: {
        email: true,
        emailVerified: true,
        name: true,
      },
    });

    if (user && !user.emailVerified) {
      try {
        await sendEmailVerificationCode({
          email,
          name: user.name,
          action: "verify-email-resend",
          enforceCooldown: true,
        });
      } catch (error) {
        if (error instanceof EmailVerificationCooldownError) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Please wait before requesting another verification code.",
            },
            {
              status: 429,
              headers: {
                "Retry-After": String(error.retryAfterSeconds),
              },
            }
          );
        }

        return NextResponse.json(
          {
            ok: false,
            error:
              "Unable to send verification code right now.",
          },
          { status: 503 }
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}

function parseVerifyEmailBody(body: unknown) {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const email = parseEmail(record);
  const code = String(record.code || "").trim();

  if (!email || !/^\d{6}$/.test(code)) return null;

  return { email, code };
}

function parseEmail(body: unknown) {
  if (!body || typeof body !== "object") return "";

  const email = String(
    (body as Record<string, unknown>).email || ""
  );

  const parsed =
    signinSchema.shape.email.safeParse(email);

  return parsed.success ? parsed.data : "";
}