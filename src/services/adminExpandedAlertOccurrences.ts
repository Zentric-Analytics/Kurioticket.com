import { createHash } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client";
import type { AdminAlertCandidate } from "./adminAlertCore";

export type OccurrenceDatabase = Pick<PrismaClient, "$transaction">;
const action = "ADMIN_ALERT_EXPANDED_STATE";
const targetType = "AdminOperationalCondition";

/** Reuse the existing audit-backed monitoring pattern without schema changes.
 * Serialize occurrence transitions across server processes; otherwise two bell
 * requests could create different tokens for the same continuous incident.
 */
export async function persistExpandedAlertOccurrences(database: OccurrenceDatabase | null, environment: "staging" | "production", candidates: readonly AdminAlertCandidate[], states: Record<string, boolean>, now = new Date()): Promise<AdminAlertCandidate[]> {
  if (Object.keys(states).length === 0) return [...candidates];
  try {
    if (!database) throw new Error("Monitoring store unavailable.");
    const tokens = await database.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`admin-expanded-alerts:${environment}`}))`;
      const result = new Map<string, string>();
      for (const [key, active] of Object.entries(states)) {
        const previous = await tx.adminAuditLog.findFirst({ where: { action, targetType, targetId: key }, select: { metadata: true, createdAt: true }, orderBy: { createdAt: "desc" } });
        const metadata = (previous?.metadata ?? {}) as { state?: unknown; occurrenceToken?: unknown };
        if (!active) {
          if (metadata.state === "ACTIVE") await tx.adminAuditLog.create({ data: { adminEmail: "system-alert-monitor", action, targetType, targetId: key, metadata: { state: "CLEAR" } } });
          continue;
        }
        if (metadata.state === "ACTIVE" && typeof metadata.occurrenceToken === "string") {
          result.set(key, metadata.occurrenceToken);
          continue;
        }
        const token = createHash("sha256").update(`${key}:${previous?.createdAt.toISOString() ?? "initial"}:${now.toISOString()}`).digest("hex").slice(0, 24);
        result.set(key, token);
        await tx.adminAuditLog.create({ data: { adminEmail: "system-alert-monitor", action, targetType, targetId: key, metadata: { state: "ACTIVE", occurrenceToken: token } } });
      }
      return result;
    }, { isolationLevel: "ReadCommitted" });
    return candidates.map(candidate => ({ ...candidate, signalToken: `${tokens.get(candidate.key)}:${candidate.severity}` }));
  } catch {
    // Keep verified problems visible when state storage fails. As in existing
    // telemetry-outage handling, an unpersisted observation cannot promise a
    // durable acknowledgement across fresh snapshots/recovered incidents.
    return candidates.map(candidate => ({ ...candidate, signalToken: `unpersisted:${candidate.key}:${candidate.severity}:${now.toISOString()}` }));
  }
}
