import { getOptionalPrisma } from "@/lib/prisma";

export type ReconciledEmailDeliveryState = "accepted" | "retryable" | "terminal" | "missing";

const ACCEPTED_STATUSES = new Set(["SENT", "DELIVERED", "DELIVERY_DELAYED", "OPENED", "CLICKED"]);
const RETRYABLE_STATUSES = new Set(["QUEUED", "FAILED"]);
const TERMINAL_STATUSES = new Set(["BOUNCED", "COMPLAINED", "SUPPRESSED"]);

export async function getEmailDeliveryReconciliationState(idempotencyKey: string): Promise<ReconciledEmailDeliveryState> {
  const db = getOptionalPrisma();
  if (!db) return "missing";
  const rows = await db.$queryRaw<Array<{ status: string }>>`
    SELECT status
    FROM email_deliveries
    WHERE idempotency_key = ${idempotencyKey}
    LIMIT 1
  `;
  const status = String(rows[0]?.status || "").toUpperCase();
  if (!status) return "missing";
  if (ACCEPTED_STATUSES.has(status)) return "accepted";
  if (RETRYABLE_STATUSES.has(status)) return "retryable";
  if (TERMINAL_STATUSES.has(status)) return "terminal";
  return "retryable";
}
