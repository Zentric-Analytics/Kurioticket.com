import { createHash, randomInt } from "node:crypto";
import { promises as dns } from "node:dns";
import bcrypt from "bcryptjs";

import { getBaseUrl } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import {
  isStrictEmailAddress,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation";
import { trackAnalyticsEvent } from "@/services/analyticsService";
import { EmailDeliveryError, passwordResetEmail, sendTransactionalEmail } from "@/services/emailService";

export class DuplicateEmailError extends Error {
  constructor() {
    super(
      "An account with this email already exists.",
    );

    this.name =
      "DuplicateEmailError";
  }
}

export class InvalidEmailError extends Error {
  constructor() {
    super(
      "Enter a valid email address.",
    );

    this.name =
      "InvalidEmailError";
  }
}

const passwordResetTtlMinutes = 10;

export function logAuthEvent(event: string, metadata: Record<string, unknown> = {}) {
  console.info(`[auth:${event}]`, metadata);
}

export async function createPasswordUser(
  input: {
    name: string;
    email: string;
    password: string;
  },
) {
  const parsed =
    signupSchema.safeParse(
      input,
    );

  if (!parsed.success) {
    console.error(
      "[signup:service-validation]",
      parsed.error.flatten()
        .fieldErrors,
    );

    throw new Error(
      "Invalid signup input.",
    );
  }

  const { email, password } =
    parsed.data;

  // Preserve strict validation from codex
  if (
    !isStrictEmailAddress(
      email,
    )
  ) {
    console.error(
      "[signup:service-email-validation]",
      { email },
    );

    throw new InvalidEmailError();
  }

  // Preserve MX/domain validation from codex
  if (
    !(await hasValidEmailHost(
      email,
    ))
  ) {
    console.error(
      "[signup:service-email-host-validation]",
      {
        domain:
          email.split(
            "@",
          )[1],
      },
    );

    throw new InvalidEmailError();
  }

  const name =
    parsed.data.name.trim();

  const existing =
    await getPrisma().user.findUnique(
      {
        where: {
          email,
        },
      },
    );

  if (existing) {
    throw new DuplicateEmailError();
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      12,
    );

  try {
    const user =
      await getPrisma().user.create(
        {
          data: {
            name,
            email,
            passwordHash,
          },
        },
      );

    await trackAnalyticsEvent(
      {
        userId: user.id,
        type: "SIGNUP",
        name: "password_signup",
      },
    );

    logAuthEvent("signup-created", { email: user.email, userId: user.id });

    return user;
  } catch (error) {
    if (
      isUniqueEmailError(
        error,
      )
    ) {
      throw new DuplicateEmailError();
    }

    throw error;
  }
}

function isUniqueEmailError(
  error: unknown,
) {
  return (
    error instanceof Error &&
    /Unique constraint failed|P2002|unique/i.test(
      error.message,
    ) &&
    /email/i.test(
      error.message,
    )
  );
}

async function hasValidEmailHost(
  email: string,
) {
  const domain =
    email.split("@")[1];

  if (!domain) {
    return false;
  }

  try {
    const records =
      await withTimeout(
        dns.resolveMx(
          domain,
        ),
        3000,
      );

    return records.some(
      (record) =>
        record.exchange &&
        record.exchange
          .trim()
          .length > 0,
    );
  } catch {
    return false;
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
) {
  return Promise.race([
    promise,

    new Promise<T>(
      (_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                "Email host validation timed out.",
              ),
            ),
          timeoutMs,
        );
      },
    ),
  ]);
}

export async function sendPasswordResetCode(emailInput: string) {
  const email = emailInput.toLowerCase().trim();
  logAuthEvent("forgot-password-requested", { email });

  const user = await getPrisma().user.findUnique({
    where: { email },
    select: { email: true, name: true, passwordHash: true, status: true },
  });

  if (!user || !user.passwordHash || user.status !== "ACTIVE") {
    return false;
  }

  const code = randomInt(100000, 1000000).toString();
  const token = hashPasswordResetCode(email, code);
  const identifier = getPasswordResetIdentifier(email);
  const expires = new Date(Date.now() + passwordResetTtlMinutes * 60 * 1000);

  await getPrisma().verificationToken.deleteMany({ where: { identifier } });
  await getPrisma().verificationToken.create({
    data: { identifier, token, expires },
  });

  try {
    await sendTransactionalEmail({
      to: email,
      subject: "Curioticket password reset code",
      html: passwordResetEmail({
        code,
        name: user.name,
        expiresInMinutes: passwordResetTtlMinutes,
        resetUrl: `${getBaseUrl()}/auth/reset-password?email=${encodeURIComponent(email)}`,
      }),
      idempotencyKey: `password-reset-${email}-${token.slice(0, 16)}`,
      requireConfigured: true,
    });
  } catch (error) {
    logAuthEvent("password-reset-failed", {
      email,
      reason: "email-send",
      message: error instanceof Error ? error.message : String(error),
      status: error instanceof EmailDeliveryError ? error.statusCode : undefined,
    });

    throw error;
  }

  logAuthEvent("reset-email-sent", { email });
  return true;
}

export async function resetPasswordWithCode(input: { email: string; code: string; password: string }) {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    logAuthEvent("password-reset-failed", { reason: "invalid-input" });
    return false;
  }

  const { email, code, password } = parsed.data;
  const identifier = getPasswordResetIdentifier(email);
  const token = hashPasswordResetCode(email, code);
  const verificationToken = await getPrisma().verificationToken.findUnique({
    where: {
      identifier_token: { identifier, token },
    },
  });

  if (!verificationToken || verificationToken.expires <= new Date()) {
    logAuthEvent("password-reset-failed", {
      email,
      reason: verificationToken ? "expired" : "not-found",
    });

    if (verificationToken) {
      await getPrisma().verificationToken.deleteMany({ where: { identifier, token } });
    }

    return false;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const updateResult = await getPrisma().user.updateMany({
    where: { email, status: "ACTIVE" },
    data: { passwordHash },
  });

  await getPrisma().verificationToken.deleteMany({ where: { identifier } });

  if (updateResult.count < 1) {
    logAuthEvent("password-reset-failed", { email, reason: "user-not-found" });
    return false;
  }

  logAuthEvent("password-reset-succeeded", { email });
  return true;
}

function getPasswordResetIdentifier(email: string) {
  return `password-reset:${email}`;
}

function hashPasswordResetCode(email: string, code: string) {
  return createHash("sha256").update(`${email.toLowerCase().trim()}:${code}`).digest("hex");
}
