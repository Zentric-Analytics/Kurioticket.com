import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { applicationMetadata } from "@/lib/application-source";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";
import type { confirmedSavedActivityMetadata } from "@/lib/savedActivityMetadata";

type SavedAuditMetadata = ReturnType<typeof confirmedSavedActivityMetadata>;
export type OperationalAccountAuditInput = { userId: string } & (
  | { type: "SIGNUP"; name: "password_signup" }
  | { type: "SUPPORT_TICKET"; name: "support_ticket_created"; metadata: { category: string } }
  | { type: "SAVE"; name: "saved_item_confirmed" | "saved_item_removed"; metadata: SavedAuditMetadata }
  | { type: "ALERT_CREATED"; name: "price_alert_created" | "price_alert_paused" | "price_alert_reactivated" | "price_alert_deleted";
      metadata: { product: "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE"; mode: "AUTOMATIC" | "TARGET"; alertId: string; outcome: "confirmed" } }
);

type AuditDatabase = Pick<Prisma.TransactionClient, "analyticsEvent">;

/**
 * Only confirmed, server-owned account mutations enter this writer. Keep the
 * legacy physical table for Admin and journey-reference compatibility, but
 * new audit rows have an explicit purpose and no visitor identity.
 * Never spread arbitrary caller metadata or permit page/share/journey events.
 */
export async function writeOperationalAccountAudit(db: AuditDatabase, input: OperationalAccountAuditInput) {
  if (!input.userId) return;
  let metadata: Record<string, unknown>;
  switch (input.type) {
    case "SIGNUP":
      if (input.name !== "password_signup") return;
      metadata = applicationMetadata();
      break;
    case "SUPPORT_TICKET":
      if (input.name !== "support_ticket_created") return;
      metadata = { category: input.metadata.category, ...applicationMetadata() };
      break;
    case "SAVE": {
      if (input.name !== "saved_item_confirmed" && input.name !== "saved_item_removed") return;
      const { product, savedType, savedItemId, resultId } = input.metadata;
      metadata = { product, savedType, savedItemId, ...(resultId ? { resultId } : {}),
        outcome: "confirmed", ...applicationMetadata(input.metadata) };
      break;
    }
    case "ALERT_CREATED": {
      if (!["price_alert_created", "price_alert_paused", "price_alert_reactivated", "price_alert_deleted"].includes(input.name)) return;
      const { product, mode, alertId } = input.metadata;
      metadata = { product, mode, alertId, outcome: "confirmed", ...applicationMetadata() };
      break;
    }
    default:
      return;
  }
  await db.analyticsEvent.create({ data: {
    userId: input.userId, type: input.type, name: input.name,
    metadata: withEnvironmentMetadata({ ...metadata, recordPurpose: "essential_account_audit" }) as Prisma.InputJsonValue,
  } });
}

/** Preserve best-effort history for already committed account actions. Saves
 * call the transactional writer instead, retaining atomicity. */
export function createOperationalAccountAuditRecorder(getDatabase: () => Pick<PrismaClient, "analyticsEvent"> | null) {
  return async (input: OperationalAccountAuditInput): Promise<void> => {
    try {
      const db = getDatabase();
      if (db) await writeOperationalAccountAudit(db, input);
    } catch {
      // An already committed account action must not become a false failure.
      // Never log account audit payloads or credentials.
    }
  };
}
export const recordOperationalAccountAudit = createOperationalAccountAuditRecorder(getOptionalPrisma);
