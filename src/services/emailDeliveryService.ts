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
          sent_at = COALESCE(sent_at, NOW()),
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
          last_error = ${input.message},
          last_error_code = ${input.statusCode || null},
          updated_at = NOW()
      WHERE id = ${input.deliveryId}
    `;
  });
}

async function withEmailDeliveryDb<T>(operation: (db: NonNullable<ReturnType<typeof getOptionalPrisma>>) => Promise<T>, fallback: T) {
  const db = getOptionalPrisma();
  if (!db) return fallback;

  try {
    return await operation(db);
  } catch (error) {
    console.error("[email-delivery:db-error]", error);
    return fallback;
  }
}
