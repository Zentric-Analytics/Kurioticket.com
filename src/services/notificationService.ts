import { withOptionalDb } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/services/emailService";

export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  type?: "PRICE_ALERT" | "SUPPORT_UPDATE" | "SUBSCRIPTION" | "SYSTEM" | "TRAVEL_INSIGHT";
  channel?: "EMAIL" | "IN_APP";
  toEmail?: string;
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
    await sendTransactionalEmail({
      to: input.toEmail,
      subject: input.title,
      html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h1>${input.title}</h1><p>${input.body}</p></div>`,
    });
  }
}
