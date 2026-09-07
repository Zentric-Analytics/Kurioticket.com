import { sendMobileEmailCode } from "@/services/mobileEmailCodeDelivery";
import { createHash } from "node:crypto";
import {
  sendCurrentEmailCode,
  verifyCurrentEmailCode,
  hasEmailOwnershipProof,
  claimEmailOwnershipProof,
} from "@/services/mobileEmailOwnershipService";
import { getMobileSession, mobileSessionFingerprint } from "@/lib/mobile-auth";
import { getPrisma } from "@/lib/prisma";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import {
  claimAccountEmailChangeCode,
  getAccountEmailChangeIdentifier,
  verifyAccountEmailChangeCode,
} from "@/services/emailVerificationService";
import { recordAccountEventSafely } from "@/services/accountNotificationService";
import { sendTransactionalEmail } from "@/services/emailService";
import type { EmailChangeDependencies } from "./mobileEmailChange";

class StaleEmailChange extends Error {}

export const mobileEmailChangeDependencies: EmailChangeDependencies = {
  authenticate: async (request) => {
    const session = await getMobileSession(request);
    return session?.user.status === "ACTIVE"
      ? {
          id: session.user.id,
          sessionKey: mobileSessionFingerprint(
            request.headers.get("authorization") || "",
          ),
        }
      : null;
  },
  user: (id) =>
    getPrisma().user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, status: true },
    }),
  owner: (email) =>
    getPrisma().user.findUnique({ where: { email }, select: { id: true } }),
  rateLimit: (request, email, mode) =>
    checkAuthRateLimit({
      request,
      email,
      action: `account-email-change-${mode}`,
      limit: mode.endsWith("request") ? 120 : 10,
      windowMs: 15 * 60_000,
    }),
  sendCurrentCode: sendCurrentEmailCode,
  verifyCurrentCode: verifyCurrentEmailCode,
  hasOwnershipProof: hasEmailOwnershipProof,
  sendCode: (input) =>
    sendMobileEmailCode({
      userId: input.userId,
      identifier: getAccountEmailChangeIdentifier(input.userId, input.newEmail),
      purpose: "new",
      email: input.newEmail,
      name: input.name,
    }),
  verifyCode: verifyAccountEmailChangeCode,
  commit: async (input) => {
    try {
      return await getPrisma().$transaction(async (tx) => {
        if (
          !(await claimEmailOwnershipProof(
            tx,
            {
              userId: input.userId,
              email: input.previousEmail,
              sessionKey: input.sessionKey,
            },
            input.ownershipProof,
          ))
        )
          throw new StaleEmailChange();
        if (!(await claimAccountEmailChangeCode(tx, input)))
          throw new StaleEmailChange();
        const changed = await tx.user.updateMany({
          where: {
            id: input.userId,
            email: input.previousEmail,
            status: "ACTIVE",
          },
          data: { email: input.newEmail, emailVerified: new Date() },
        });
        if (changed.count !== 1) throw new StaleEmailChange();
        return true;
      });
    } catch (error) {
      if (error instanceof StaleEmailChange) return false;
      throw error;
    }
  },
  notify: async (user, newEmail) => {
    const transitionId = createHash("sha256")
      .update(`${user.email || "none"}->${newEmail}`)
      .digest("hex")
      .slice(0, 24);
    const eventKey = `account:email-changed:${user.id}:${transitionId}`;
    await recordAccountEventSafely({
      userId: user.id,
      email: newEmail,
      eventKey,
      type: "ACCOUNT_UPDATE",
      title: "Email address changed",
      body: "Your registered Kurioticket email address was changed. If this wasn’t you, secure your account and contact Support immediately.",
      actionPath: "/personal-information",
    });
    if (user.email)
      await sendTransactionalEmail({
        to: user.email,
        subject: "Your Kurioticket email address changed",
        html: "<h1>Email address changed</h1><p>The email address on your Kurioticket account was changed. If you did not make this change, contact Kurioticket Support immediately.</p>",
        template: "notification",
        idempotencyKey: `${eventKey}:previous-email`,
        metadata: {
          eventKey,
          notificationType: "ACCOUNT_UPDATE",
          audience: "previous-email",
        },
      });
  },
};
