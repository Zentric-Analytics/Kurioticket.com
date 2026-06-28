import { getOptionalPrisma } from "@/lib/prisma";

export type EmailDeliveryStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "DELIVERY_DELAYED"
  | "BOUNCED"
  | "COMPLAINED"
  | "FAILED"
  | "SUPPRESSED"
  | "OPENED"
  | "CLICKED";

export type EmailTemplateKey =
  | "email_verification"
  | "login_verification"
  | "password_reset"
  | "support_ticket"
  | "newsletter_welcome"
  | "price_alert"
  | "notification"
  | "admin_test";

type JsonMetadata = Record<string, unknown>;

const terminalStatusRank: Record<EmailDeliveryStatus, number> = {
  QUEUED: 0,
  SENT: 1,
  DELIVERY_DELAYED: 2,
  DELIVERED: 3,
  OPENED: 4,
  CLICKED: 5,
  FAILED: 6,
  BOUNCED: 7,
  SUPPRESSED: 8,
  COMPLAINED: 9,
};

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function createEmailDeliveryRecord(input: {
  toEmail: string;
  fromEmail: string;
  subject: string;
  template: EmailTemplateKey;
  idempotencyKey?: string;
  metadata?: JsonMetadata;
}) {
  return withEmailDeliveryDb(async (db) => {
    const baseData = {
      toEmail: input.toEmail.toLowerCase().trim(),
      fromEmail: input.fromEmail,
      subject: input.subject,
      template: input.template,
      idempotencyKey: input.idempotencyKey || undefined,
      status: "QUEUED" as const,
      metadata: (input.metadata || {}) as never,
    };

    if (input.idempotencyKey) {
      const delivery = await db.emailDelivery.upsert({
        where: { idempotencyKey: input.idempotencyKey },
        create: baseData,
        update: {
          toEmail: baseData.toEmail,
          fromEmail: baseData.fromEmail,
          subject: baseData.subject,
          template: baseData.template,
          metadata: baseData.metadata,
        },
        select: { id: true },
      });

      return delivery.id;
    }

    const delivery = await db.emailDelivery.create({
      data: baseData,
      select: { id: true },
    });

    return delivery.id;
  }, null);
}

export async function markEmailDeliverySent(input: {
  deliveryId?: string | null;
  providerMessageId?: string | null;
}) {
  if (!input.deliveryId) return;

  await withEmailDeliveryDb(async (db) => {
    await db.emailDelivery.update({
      where: { id: input.deliveryId },
      data: {
        providerMessageId: input.providerMessageId || undefined,
        status: "SENT",
        attempts: { increment: 1 },
        sentAt: new Date(),
        lastError: null,
        lastErrorStatus: null,
      },
      select: { id: true },
    });
  });
}

export async function markEmailDeliveryFailed(input: {
  deliveryId?: string | null;
  message: string;
  statusCode?: number | null;
}) {
  if (!input.deliveryId) return;

  await withEmailDeliveryDb(async (db) => {
    await db.emailDelivery.update({
      where: { id: input.deliveryId },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastError: input.message.slice(0, 1000),
        lastErrorStatus: input.statusCode || null,
      },
      select: { id: true },
    });
  });
}

export async function recordProviderEmailEvent(input: {
  providerEventId?: string | null;
  providerMessageId?: string | null;
  type: string;
  payload: JsonMetadata;
  occurredAt?: Date | null;
  toEmail?: string | null;
}) {
  await withEmailDeliveryDb(async (db) => {
    if (input.providerEventId) {
      const existing = await db.emailEvent.findUnique({
        where: { providerEventId: input.providerEventId },
        select: { id: true },
      });

      if (existing) return;
    }

    const delivery = input.providerMessageId
      ? await db.emailDelivery.findUnique({
          where: { providerMessageId: input.providerMessageId },
          select: { id: true, status: true },
        })
      : null;

    await db.emailEvent.create({
      data: {
        deliveryId: delivery?.id,
        providerEventId: input.providerEventId || undefined,
        providerMessageId: input.providerMessageId || undefined,
        type: input.type,
        payload: input.payload as never,
        occurredAt: input.occurredAt || undefined,
      },
      select: { id: true },
    });

    const nextStatus = mapResendEventToStatus(input.type);
    if (delivery && nextStatus && shouldApplyStatus(delivery.status as EmailDeliveryStatus, nextStatus)) {
      await db.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: nextStatus,
          ...getTimestampUpdate(nextStatus),
        },
        select: { id: true },
      });
    }

    if (input.toEmail && ["email.bounced", "email.complained", "email.suppressed"].includes(input.type)) {
      await db.emailSuppression.upsert({
        where: { email: input.toEmail.toLowerCase().trim() },
        create: {
          email: input.toEmail.toLowerCase().trim(),
          reason: input.type,
          providerMessageId: input.providerMessageId || undefined,
          lastEventType: input.type,
        },
        update: {
          reason: input.type,
          providerMessageId: input.providerMessageId || undefined,
          lastEventType: input.type,
        },
        select: { id: true },
      });
    }
  });
}

export async function getEmailDeliveryHealthSnapshot() {
  return withEmailDeliveryDb(async (db) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [last24Hours, failures, delayed, suppressed, latest] = await Promise.all([
      db.emailDelivery.count({ where: { createdAt: { gte: since } } }),
      db.emailDelivery.count({ where: { createdAt: { gte: since }, status: { in: ["FAILED", "BOUNCED", "COMPLAINED", "SUPPRESSED"] } } }),
      db.emailDelivery.count({ where: { createdAt: { gte: since }, status: "DELIVERY_DELAYED" } }),
      db.emailSuppression.count(),
      db.emailDelivery.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          template: true,
          toEmail: true,
          subject: true,
          status: true,
          providerMessageId: true,
          lastError: true,
          createdAt: true,
          sentAt: true,
          deliveredAt: true,
        },
      }),
    ]);

    return { last24Hours, failures, delayed, suppressed, latest };
  }, {
    last24Hours: 0,
    failures: 0,
    delayed: 0,
    suppressed: 0,
    latest: [],
  });
}

function mapResendEventToStatus(type: string): EmailDeliveryStatus | null {
  switch (type) {
    case "email.sent":
      return "SENT";
    case "email.delivered":
      return "DELIVERED";
    case "email.delivery_delayed":
      return "DELIVERY_DELAYED";
    case "email.bounced":
      return "BOUNCED";
    case "email.complained":
      return "COMPLAINED";
    case "email.failed":
      return "FAILED";
    case "email.suppressed":
      return "SUPPRESSED";
    case "email.opened":
      return "OPENED";
    case "email.clicked":
      return "CLICKED";
    default:
      return null;
  }
}

function shouldApplyStatus(current: EmailDeliveryStatus, next: EmailDeliveryStatus) {
  return terminalStatusRank[next] >= terminalStatusRank[current];
}

function getTimestampUpdate(status: EmailDeliveryStatus) {
  switch (status) {
    case "DELIVERED":
      return { deliveredAt: new Date() };
    case "BOUNCED":
      return { bouncedAt: new Date() };
    case "COMPLAINED":
      return { complainedAt: new Date() };
    case "OPENED":
      return { openedAt: new Date() };
    case "CLICKED":
      return { clickedAt: new Date() };
    default:
      return {};
  }
}

async function withEmailDeliveryDb<T>(task: (db: NonNullable<ReturnType<typeof getOptionalPrisma>>) => Promise<T>, fallback?: T) {
  const db = getOptionalPrisma();
  if (!db) return fallback as T;

  try {
    return await task(db);
  } catch (error) {
    console.error("[email:delivery-db]", error);
    return fallback as T;
  }
}
