import { randomUUID } from "node:crypto";
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
  | "newsletter_unsubscribe"
  | "price_alert"
  | "notification"
  | "admin_test";

type JsonMetadata = Record<string, unknown>;
type EmailDeliveryRow = { id: string; status: EmailDeliveryStatus };

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
    const id = randomUUID();
    const toEmail = input.toEmail.toLowerCase().trim();
    const metadata = JSON.stringify(input.metadata || {});

    if (input.idempotencyKey) {
      const rows = await db.$queryRaw<EmailDeliveryRow[]>`
        INSERT INTO email_deliveries (id, to_email, from_email, subject, template, idempotency_key, status, metadata)
        VALUES (${id}, ${toEmail}, ${input.fromEmail}, ${input.subject}, ${input.template}, ${input.idempotencyKey}, 'QUEUED', ${metadata}::jsonb)
        ON CONFLICT (idempotency_key) DO UPDATE SET
          to_email = EXCLUDED.to_email,
          from_email = EXCLUDED.from_email,
          subject = EXCLUDED.subject,
          template = EXCLUDED.template,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id, status
      `;

      return rows[0]?.id || null;
    }

    const rows = await db.$queryRaw<EmailDeliveryRow[]>`
      INSERT INTO email_deliveries (id, to_email, from_email, subject, template, status, metadata)
      VALUES (${id}, ${toEmail}, ${input.fromEmail}, ${input.subject}, ${input.template}, 'QUEUED', ${metadata}::jsonb)
      RETURNING id, status
    `;

    return rows[0]?.id || null;
  }, null);
}

export async function markEmailDeliverySent(input: {
  deliveryId?: string | null;
  providerMessageId?: string | null;
}) {
  if (!input.deliveryId) return;

  await withEmailDeliveryDb(async (db) => {
    await db.$executeRaw`
      UPDATE email_deliveries
      SET provider_message_id = ${input.providerMessageId || null},
          status = 'SENT',
          attempts = attempts + 1,
          sent_at = NOW(),
          last_error = NULL,
          last_error_status = NULL,
          updated_at = NOW()
      WHERE id = ${input.deliveryId}
    `;
  });
}

export async function markEmailDeliveryFailed(input: {
  deliveryId?: string | null;
  message: string;
  statusCode?: number | null;
}) {
  if (!input.deliveryId) return;

  await withEmailDeliveryDb(async (db) => {
    await db.$executeRaw`
      UPDATE email_deliveries
      SET status = 'FAILED',
          attempts = attempts + 1,
          last_error = ${input.message.slice(0, 1000)},
          last_error_status = ${input.statusCode || null},
          updated_at = NOW()
      WHERE id = ${input.deliveryId}
    `;
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
      const existing = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM email_events WHERE provider_event_id = ${input.providerEventId} LIMIT 1
      `;

      if (existing.length) return;
    }

    const delivery = input.providerMessageId
      ? (
          await db.$queryRaw<EmailDeliveryRow[]>`
            SELECT id, status FROM email_deliveries WHERE provider_message_id = ${input.providerMessageId} LIMIT 1
          `
        )[0]
      : null;

    await db.$executeRaw`
      INSERT INTO email_events (id, delivery_id, provider_event_id, provider_message_id, type, payload, occurred_at)
      VALUES (
        ${randomUUID()},
        ${delivery?.id || null},
        ${input.providerEventId || null},
        ${input.providerMessageId || null},
        ${input.type},
        ${JSON.stringify(input.payload)}::jsonb,
        ${input.occurredAt || null}
      )
    `;

    const nextStatus = mapResendEventToStatus(input.type);
    if (delivery && nextStatus && shouldApplyStatus(delivery.status, nextStatus)) {
      await updateDeliveryStatus(db, delivery.id, nextStatus);
    }

    if (input.toEmail && ["email.bounced", "email.complained", "email.suppressed"].includes(input.type)) {
      await db.$executeRaw`
        INSERT INTO email_suppressions (id, email, reason, provider_message_id, last_event_type)
        VALUES (${randomUUID()}, ${input.toEmail.toLowerCase().trim()}, ${input.type}, ${input.providerMessageId || null}, ${input.type})
        ON CONFLICT (email) DO UPDATE SET
          reason = EXCLUDED.reason,
          provider_message_id = EXCLUDED.provider_message_id,
          last_event_type = EXCLUDED.last_event_type,
          updated_at = NOW()
      `;
    }
  });
}

export async function getEmailDeliveryHealthSnapshot() {
  return withEmailDeliveryDb(async (db) => {
    const [summary] = await db.$queryRaw<{
      last_24_hours: bigint;
      failures: bigint;
      delayed: bigint;
      suppressed: bigint;
    }[]>`
      SELECT
        (SELECT COUNT(*) FROM email_deliveries WHERE created_at >= NOW() - INTERVAL '24 hours') AS last_24_hours,
        (SELECT COUNT(*) FROM email_deliveries WHERE created_at >= NOW() - INTERVAL '24 hours' AND status IN ('FAILED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED')) AS failures,
        (SELECT COUNT(*) FROM email_deliveries WHERE created_at >= NOW() - INTERVAL '24 hours' AND status = 'DELIVERY_DELAYED') AS delayed,
        (SELECT COUNT(*) FROM email_suppressions) AS suppressed
    `;

    const latest = await db.$queryRaw<Array<{
      id: string;
      template: string;
      to_email: string;
      subject: string;
      status: EmailDeliveryStatus;
      provider_message_id: string | null;
      last_error: string | null;
      created_at: Date;
      sent_at: Date | null;
      delivered_at: Date | null;
    }>>`
      SELECT id, template, to_email, subject, status, provider_message_id, last_error, created_at, sent_at, delivered_at
      FROM email_deliveries
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return {
      last24Hours: Number(summary?.last_24_hours || 0),
      failures: Number(summary?.failures || 0),
      delayed: Number(summary?.delayed || 0),
      suppressed: Number(summary?.suppressed || 0),
      latest: latest.map((row) => ({
        id: row.id,
        template: row.template,
        toEmail: maskEmail(row.to_email),
        subject: row.subject,
        status: row.status,
        providerMessageId: row.provider_message_id,
        lastError: row.last_error,
        createdAt: row.created_at,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
      })),
    };
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

async function updateDeliveryStatus(
  db: NonNullable<ReturnType<typeof getOptionalPrisma>>,
  deliveryId: string,
  status: EmailDeliveryStatus,
) {
  const timestampColumn = getTimestampColumn(status);
  if (timestampColumn) {
    await db.$executeRawUnsafe(
      `UPDATE email_deliveries SET status = $1, ${timestampColumn} = NOW(), updated_at = NOW() WHERE id = $2`,
      status,
      deliveryId,
    );
    return;
  }

  await db.$executeRaw`
    UPDATE email_deliveries SET status = ${status}, updated_at = NOW() WHERE id = ${deliveryId}
  `;
}

function getTimestampColumn(status: EmailDeliveryStatus) {
  switch (status) {
    case "DELIVERED":
      return "delivered_at";
    case "BOUNCED":
      return "bounced_at";
    case "COMPLAINED":
      return "complained_at";
    case "OPENED":
      return "opened_at";
    case "CLICKED":
      return "clicked_at";
    default:
      return "";
  }
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "hidden";
  return `${local.slice(0, 2)}***@${domain}`;
}

async function withEmailDeliveryDb<T>(
  task: (db: NonNullable<ReturnType<typeof getOptionalPrisma>>) => Promise<T>,
  fallback?: T,
) {
  const db = getOptionalPrisma();
  if (!db) return fallback as T;

  try {
    return await task(db);
  } catch (error) {
    console.error("[email:delivery-db]", error);
    return fallback as T;
  }
}
