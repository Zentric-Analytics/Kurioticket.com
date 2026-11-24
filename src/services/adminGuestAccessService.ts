import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { guestAccessHistorySql } from "@/lib/adminGuestAccessSql";
import { DEVICE_HISTORY_PAGE_SIZE, type DeviceHistoryQuery } from "@/lib/adminDeviceHistory";
import { recordedDevicePlatformLabels, type RecordedDevicePlatform } from "@/lib/adminDevicePlatform";
import { safeGuestDeviceDescription } from "@/lib/guestAccessObservation";
import { validActivityIdentity } from "@/lib/adminIdentityActivity";

export type GuestAccessRecord = {
  id: string; source: "consented" | "operational"; evidence: "page" | "search" | "handoff";
  platform: string; deviceLabel: string | null; browser: string | null; os: string | null; locationLabel: string | null; at: Date;
};
type Stored = { guestId: string | null; guestSource: string | null; recordId: string | null; evidence: string | null; platform: string | null;
  deviceLabel: string | null; browser: string | null; os: string | null; locationLabel: string | null; at: Date | null;
  total: bigint; firstSeenAt: Date | null; lastSeenAt: Date | null };
export type GuestAccessHistoryResult = { status: "ok"; records: GuestAccessRecord[]; total: number; firstSeenAt: Date | null; lastSeenAt: Date | null } | { status: "unavailable" | "not_found" };

export async function loadAdminGuestAccessHistory(id: string, query: DeviceHistoryQuery): Promise<GuestAccessHistoryResult> {
  if (!validActivityIdentity("guest", id)) return { status: "not_found" };
  try {
    const db = getOptionalPrisma();
    if (!db) return { status: "unavailable" };
    const stored = await db.$queryRaw<Stored[]>(guestAccessHistorySql(id, query, getPublicEnvironment(), new Date()));
    const total = Number(stored[0]?.total);
    if (!Number.isSafeInteger(total) || total < 0 || stored.length > DEVICE_HISTORY_PAGE_SIZE) throw new Error("Invalid guest access history");
    const firstSeenAt = stored[0].firstSeenAt, lastSeenAt = stored[0].lastSeenAt;
    if (total > 0 && (!(firstSeenAt instanceof Date) || !(lastSeenAt instanceof Date))) throw new Error("Invalid observation dates");
    const records: GuestAccessRecord[] = [];
    for (const row of stored) {
      if (Number(row.total) !== total) throw new Error("Invalid guest access total");
      if (row.recordId === null) continue;
      if (row.guestId !== id || (row.guestSource !== "consented" && row.guestSource !== "operational")
        || (row.evidence !== "page" && row.evidence !== "search" && row.evidence !== "handoff")
        || (row.guestSource === "consented") !== (row.evidence === "page")
        || !(row.at instanceof Date) || !Number.isFinite(+row.at)) throw new Error("Invalid guest observation");
      const platform = row.platform && Object.prototype.hasOwnProperty.call(recordedDevicePlatformLabels, row.platform)
        ? recordedDevicePlatformLabels[row.platform as RecordedDevicePlatform] : "Unknown";
      const optional = row.guestSource === "consented";
      records.push({ id: row.recordId, source: row.guestSource, evidence: row.evidence, platform, at: row.at,
        deviceLabel: optional ? safeGuestDeviceDescription(row.deviceLabel, "deviceLabel") : null,
        browser: optional ? safeGuestDeviceDescription(row.browser, "browser") : null,
        os: optional ? safeGuestDeviceDescription(row.os, "os") : null,
        locationLabel: optional ? safeGuestDeviceDescription(row.locationLabel, "locationLabel") : null });
    }
    if (records.length !== Math.max(0, Math.min(DEVICE_HISTORY_PAGE_SIZE, total - (query.page - 1) * DEVICE_HISTORY_PAGE_SIZE)))
      throw new Error("Incomplete guest history page");
    return { status: "ok", records, total, firstSeenAt, lastSeenAt };
  } catch {
    return { status: "unavailable" };
  }
}
