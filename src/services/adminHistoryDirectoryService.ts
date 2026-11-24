import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { historyDirectorySql } from "@/lib/adminHistoryDirectorySql";
import { validActivityIdentity } from "@/lib/adminIdentityActivity";
import { HISTORY_DIRECTORY_PAGE_SIZE, type HistoryDirectoryQuery, type HistoryDirectoryRow, type HistorySection } from "@/lib/adminHistoryDirectory";

type StoredRow = { kind: string | null; id: string | null; name: string | null; email: string | null; count: bigint | null; lastSeenAt: Date | null; guestSource: string | null; total: bigint };
export type HistoryDirectoryResult = { status: "ok"; rows: HistoryDirectoryRow[]; total: number } | { status: "unavailable" };

/** Read-only, bounded list. Authorization is required at each route. */
export async function loadAdminHistoryDirectory(section: HistorySection, query: HistoryDirectoryQuery, now: Date): Promise<HistoryDirectoryResult> {
  try {
    const db = getOptionalPrisma();
    if (!db) return { status: "unavailable" };
    const stored = await db.$queryRaw<StoredRow[]>(historyDirectorySql(section, query, getPublicEnvironment(), now));
    const total = Number(stored[0]?.total);
    if (!Number.isSafeInteger(total) || total < 0 || stored.length > HISTORY_DIRECTORY_PAGE_SIZE) throw new Error("Invalid history total");
    const rows: HistoryDirectoryRow[] = [];
    for (const row of stored) {
      if (Number(row.total) !== total) throw new Error("Inconsistent history total");
      if (row.id === null && row.kind === null) continue;
      const count = Number(row.count);
      if (!row.id || !row.kind || !validActivityIdentity(row.kind, row.id)
        || (row.kind === "guest" && row.guestSource !== "consented" && !(section === "devices" && row.guestSource === "operational"))
        || typeof row.name !== "string" || (row.email !== null && typeof row.email !== "string")
        || !Number.isSafeInteger(count) || count < 1 || !(row.lastSeenAt instanceof Date) || !Number.isFinite(+row.lastSeenAt))
        throw new Error("Invalid history row");
      rows.push({ kind: row.kind, id: row.id, name: row.name, email: row.email, count, lastSeenAt: row.lastSeenAt,
        ...(row.guestSource === "consented" || row.guestSource === "operational" ? { guestSource: row.guestSource } : {}) });
    }
    if (rows.length !== Math.max(0, Math.min(HISTORY_DIRECTORY_PAGE_SIZE, total - (query.page - 1) * HISTORY_DIRECTORY_PAGE_SIZE)))
      throw new Error("Incomplete history page");
    return { status: "ok", rows, total };
  } catch {
    return { status: "unavailable" };
  }
}
