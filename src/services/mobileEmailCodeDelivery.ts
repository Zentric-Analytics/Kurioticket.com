import { createHash, randomInt } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/env";
import { sendTransactionalEmail, verificationCodeEmail } from "./emailService";
import {
  MOBILE_EMAIL_CODE_TTL_MS,
  reserveMobileEmailSend,
  type ResendState,
} from "./mobileEmailResendPolicy";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function sendMobileEmailCode(input: {
  userId: string;
  identifier: string;
  purpose: "current" | "new";
  email: string;
  name: string | null;
}, dependencies = { db: getPrisma(), send: sendTransactionalEmail }) {
  const { db } = dependencies;
  const limitId =
    "mobile-email-resend:" + hash(input.userId + ":" + input.purpose);
  const reserve = () =>
    db.$transaction(
      async (tx) => {
        const now = Date.now();
        const row = await tx.verificationToken.findFirst({
          where: { identifier: limitId, expires: { gt: new Date(now) } },
        });
        const state = reserveMobileEmailSend(
          row ? (JSON.parse(row.token) as ResendState) : null,
          now,
        );
        const previous = await tx.verificationToken.findFirst({
          where: { identifier: input.identifier },
        });
        let code: string, token: string;
        do {
          code = randomInt(100000, 1000000).toString();
          token = hash(input.identifier + ":" + code);
        } while (token === previous?.token);
        // Replacement and resend reservation are atomic, including concurrent requests.
        await tx.verificationToken.deleteMany({
          where: { identifier: { in: [limitId, input.identifier] } },
        });
        await tx.verificationToken.create({
          data: {
            identifier: limitId,
            token: JSON.stringify(state),
            expires: new Date(now + 24 * 60 * 60_000),
          },
        });
        await tx.verificationToken.create({
          data: {
            identifier: input.identifier,
            token,
            expires: new Date(now + MOBILE_EMAIL_CODE_TTL_MS),
          },
        });
        return { code, token, state };
      },
      { isolationLevel: "Serializable" },
    );
  const reservation = await (async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await reserve();
      } catch (error) {
        if (
          attempt >= 2 ||
          !(
            typeof error === "object" &&
            error &&
            "code" in error &&
            error.code === "P2034"
          )
        )
          throw error;
      }
    }
  })();
  try {
    await dependencies.send({
      to: input.email,
      subject:
        input.purpose === "current"
          ? "Verify your current Kurioticket email address"
          : "Confirm your new Kurioticket email address",
      html: verificationCodeEmail({
        code: reservation.code,
        name: input.name,
        expiresInMinutes: 5,
        verifyUrl: getBaseUrl() + "/personal-information",
      }),
      requireConfigured: true,
      idempotencyKey: input.identifier + ":" + reservation.token.slice(0, 16),
    });
  } catch (error) {
    await db.verificationToken.deleteMany({
      where: { identifier: input.identifier, token: reservation.token },
    });
    throw error;
  }
  return {
    cooldownSeconds: reservation.state.lockedUntil ? 60 : 30,
    resendLimitReached: !!reservation.state.lockedUntil,
  };
}
