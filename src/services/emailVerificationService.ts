import { createHash, randomInt } from "node:crypto";
import { getBaseUrl } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import {
  EmailDeliveryError,
  loginVerificationCodeEmail,
  sendTransactionalEmail,
  verificationCodeEmail,
} from "@/services/emailService";

const verificationCodeTtlMinutes = 10;
const resendCooldownMs = 60 * 1000;
const resendCooldowns = new Map<string, number>();

export class EmailVerificationError extends Error {
  constructor(
    message = "Unable to verify email right now."
  ) {
    super(message);
    this.name =
      "EmailVerificationError";
  }
}

export class EmailVerificationCooldownError extends Error {
  retryAfterSeconds: number;

  constructor(
    retryAfterSeconds: number
  ) {
    super(
      "Please wait before requesting another verification code."
    );

    this.name =
      "EmailVerificationCooldownError";

    this.retryAfterSeconds =
      retryAfterSeconds;
  }
}

export function getEmailVerificationRedirect(
  email: string
) {
  return `/auth/verify-email?email=${encodeURIComponent(
    email.toLowerCase().trim()
  )}`;
}

export async function sendEmailVerificationCode(
  input: {
    email: string;
    name?: string | null;
    action?: string;
    enforceCooldown?: boolean;
  }
) {
  const email =
    input.email.toLowerCase().trim();

  const code = randomInt(
    100000,
    1000000
  ).toString();

  if (input.enforceCooldown) {
    enforceResendCooldown(email);
  }

  const token =
    hashVerificationCode(
      email,
      code
    );

  const expires = new Date(
    Date.now() +
      verificationCodeTtlMinutes *
        60 *
        1000
  );

  const identifier =
    getVerificationIdentifier(
      email
    );

  const prisma = getPrisma();

  await prisma.verificationToken.deleteMany(
    {
      where: { identifier },
    }
  );

  await prisma.verificationToken.create(
    {
      data: {
        identifier,
        token,
        expires,
      },
    }
  );

  try {
    await sendTransactionalEmail({
      to: email,
      subject:
        "Curioticket verification code",
      html:
        verificationCodeEmail(
          {
            code,
            name: input.name,
            expiresInMinutes:
              verificationCodeTtlMinutes,
            verifyUrl: `${getBaseUrl()}${getEmailVerificationRedirect(
              email
            )}`,
          }
        ),
      idempotencyKey: `email-verification-${email}-${token.slice(
        0,
        16
      )}`,
      requireConfigured: true,
    });

    if (input.enforceCooldown) {
      resendCooldowns.set(
        email,
        Date.now()
      );
    }

    console.info(
      "[email-verification:sent]",
      {
        action:
          input.action ||
          "email-verification",
        email,
      }
    );
  } catch (error) {
    console.error(
      "[email-verification:failed]",
      {
        action:
          input.action ||
          "email-verification",
        email,
        message:
          error instanceof Error
            ? error.message
            : String(error),
        status:
          error instanceof
          EmailDeliveryError
            ? error.statusCode
            : undefined,
      }
    );

    throw new EmailVerificationError(
      "Unable to send verification code right now."
    );
  }
}

export async function verifyEmailCode(
  input: {
    email: string;
    code: string;
  }
) {
  const email =
    input.email.toLowerCase().trim();

  const code =
    input.code.trim();

  if (!/^\d{6}$/.test(code)) {
    console.warn(
      "[auth:verification-failed]",
      {
        email,
        reason:
          "invalid-format",
      }
    );

    return false;
  }

  const prisma = getPrisma();

  const identifier =
    getVerificationIdentifier(
      email
    );

  const token =
    hashVerificationCode(
      email,
      code
    );

  const verificationToken =
    await prisma.verificationToken.findUnique(
      {
        where: {
          identifier_token:
            {
              identifier,
              token,
            },
        },
      }
    );

  if (
    !verificationToken ||
    verificationToken.expires <=
      new Date()
  ) {
    console.warn(
      "[auth:verification-failed]",
      {
        email,
        reason:
          verificationToken
            ? "expired"
            : "not-found",
      }
    );

    if (verificationToken) {
      await prisma.verificationToken.deleteMany(
        {
          where: {
            identifier,
            token,
          },
        }
      );
    }

    return false;
  }

  const updateResult =
    await prisma.user.updateMany(
      {
        where: {
          email,
        },
        data: {
          emailVerified:
            new Date(),
        },
      }
    );

  await prisma.verificationToken.deleteMany(
    {
      where: {
        identifier,
      },
    }
  );

  const verified =
    updateResult.count > 0;

  if (verified) {
    console.info(
      "[auth:verification-succeeded]",
      { email }
    );
  } else {
    console.warn(
      "[auth:verification-failed]",
      {
        email,
        reason:
          "user-not-found",
      }
    );
  }

  return verified;
}

export async function sendLoginVerificationCode(
  input: {
    email: string;
    name?: string | null;
  }
) {
  const email =
    input.email.toLowerCase().trim();

  const code = randomInt(
    100000,
    1000000
  ).toString();

  const token =
    hashVerificationCode(
      email,
      code
    );

  const expires = new Date(
    Date.now() +
      verificationCodeTtlMinutes *
        60 *
        1000
  );

  const identifier =
    getLoginVerificationIdentifier(
      email
    );

  const prisma = getPrisma();

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
        token,
        expires,
      },
    }
  );

  try {
    await sendTransactionalEmail({
      to: email,
      subject:
        "Curioticket login verification code",
      html:
        loginVerificationCodeEmail(
          {
            code,
            name: input.name,
            expiresInMinutes:
              verificationCodeTtlMinutes,
          }
        ),
      idempotencyKey: `login-verification-${email}-${token.slice(
        0,
        16
      )}`,
      requireConfigured: true,
    });

    console.info(
      "[login-verification:sent]",
      { email }
    );
  } catch (error) {
    console.error(
      "[login-verification:failed]",
      {
        email,
        message:
          error instanceof Error
            ? error.message
            : String(error),
        status:
          error instanceof
          EmailDeliveryError
            ? error.statusCode
            : undefined,
      }
    );

    throw new EmailVerificationError(
      "Unable to send login verification code right now."
    );
  }
}

export async function verifyLoginCode(
  input: {
    email: string;
    code: string;
  }
) {
  const email =
    input.email.toLowerCase().trim();

  const code =
    input.code.trim();

  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const prisma = getPrisma();

  const identifier =
    getLoginVerificationIdentifier(
      email
    );

  const token =
    hashVerificationCode(
      email,
      code
    );

  const verificationToken =
    await prisma.verificationToken.findUnique(
      {
        where: {
          identifier_token:
            {
              identifier,
              token,
            },
        },
      }
    );

  if (
    !verificationToken ||
    verificationToken.expires <=
      new Date()
  ) {
    if (verificationToken) {
      await prisma.verificationToken.deleteMany(
        {
          where: {
            identifier,
            token,
          },
        }
      );
    }

    return false;
  }

  await prisma.verificationToken.deleteMany(
    {
      where: {
        identifier,
      },
    }
  );

  return true;
}

function enforceResendCooldown(
  email: string
) {
  const lastSentAt =
    resendCooldowns.get(email);

  const now = Date.now();

  if (
    lastSentAt &&
    now - lastSentAt <
      resendCooldownMs
  ) {
    throw new EmailVerificationCooldownError(
      Math.ceil(
        (
          resendCooldownMs -
          (now - lastSentAt)
        ) / 1000
      )
    );
  }
}

function getVerificationIdentifier(
  email: string
) {
  return `email-verification:${email}`;
}

function getLoginVerificationIdentifier(
  email: string
) {
  return `login-verification:${email}`;
}

function hashVerificationCode(
  email: string,
  code: string
) {
  return createHash("sha256")
    .update(
      `${email
        .toLowerCase()
        .trim()}:${code}`
    )
    .digest("hex");
}