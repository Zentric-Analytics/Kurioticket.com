import { withOptionalDb } from "@/lib/prisma";
import { sendOptionalEmail, sendTransactionalEmail } from "@/services/emailService";
import type { OptionalEmailCategory } from "@/services/emailPreferencesService";

type SendTransactionalNotificationEmail = typeof sendTransactionalEmail;
type SendOptionalNotificationEmail = typeof sendOptionalEmail;

let sendTransactionalNotificationEmailForTesting: SendTransactionalNotificationEmail | null = null;
let sendOptionalNotificationEmailForTesting: SendOptionalNotificationEmail | null = null;

export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  type?: "PRICE_ALERT" | "SUPPORT_UPDATE" | "SYSTEM" | "TRAVEL_INSIGHT";
  channel?: "EMAIL" | "IN_APP";
  toEmail?: string;
  optionalEmailCategory?: OptionalEmailCategory;
}) {
  await withOptionalDb(
    async (db) => {
      await db.notification.create({
        data: {
          userId: input.userId,
          type: input.type || "SYSTEM",
          channel: input.channel || "IN_APP",
          title: input.title,
          body: input.body,
        },
      });
      return true;
    },
    false,
  );

  if (input.channel === "EMAIL" && input.toEmail) {
    const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h1>${input.title}</h1><p>${input.body}</p></div>`;

    const optionalEmailCategory = input.optionalEmailCategory || getDefaultOptionalEmailCategory(input.type);

    if (optionalEmailCategory) {
      await getSendOptionalNotificationEmail()({
        userId: input.userId,
        category: optionalEmailCategory,
        to: input.toEmail,
        subject: input.title,
        html,
        template: "notification",
        metadata: { notificationType: input.type || "SYSTEM" },
      });
      return;
    }

    await getSendTransactionalNotificationEmail()({
      to: input.toEmail,
      subject: input.title,
      html,
    });
  }
}

function getDefaultOptionalEmailCategory(type: "PRICE_ALERT" | "SUPPORT_UPDATE" | "SYSTEM" | "TRAVEL_INSIGHT" | undefined): OptionalEmailCategory | null {
  if (type === "PRICE_ALERT") return "priceAlerts";
  if (type === "TRAVEL_INSIGHT") return "travelInspiration";
  return null;
}

function getSendTransactionalNotificationEmail() {
  return sendTransactionalNotificationEmailForTesting ?? sendTransactionalEmail;
}

function getSendOptionalNotificationEmail() {
  return sendOptionalNotificationEmailForTesting ?? sendOptionalEmail;
}

export const __notificationServiceTest = {
  setSendTransactionalEmailForTesting(sendEmail: SendTransactionalNotificationEmail | null) {
    sendTransactionalNotificationEmailForTesting = sendEmail;
  },
  setSendOptionalEmailForTesting(sendEmail: SendOptionalNotificationEmail | null) {
    sendOptionalNotificationEmailForTesting = sendEmail;
  },
};
