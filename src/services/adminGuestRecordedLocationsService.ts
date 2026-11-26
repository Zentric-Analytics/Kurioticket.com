import "server-only";

import { withOptionalDb } from "@/lib/prisma";
import { guestLatestRecordedLocationsSql } from "@/lib/adminGuestAccessSql";
import { validActivityIdentity } from "@/lib/adminIdentityActivity";
import { recordedGuestLocationSummary, type RecordedGuestLocation } from "@/lib/guestAccessObservation";
import type { DeviceHistoryQuery } from "@/lib/adminDeviceHistory";
import type { PublicEnvironment } from "@/lib/stagingSafety";

type GuestSource = "consented" | "operational";
type Row = { guestId: string; guestSource: GuestSource; evidence: string; locationLabel: string | null;
  recordedCountryCode: string | null; at: Date };

export function guestRecordedLocationKey(id: string, source: GuestSource) {
  return source + ":" + id;
}

/** Optional, batched read only. This never creates identity associations or
 * searches another person's records. Failure must not hide Users counts/history. */
export async function loadAdminGuestRecordedLocations(
  ids: readonly string[], query: DeviceHistoryQuery, environment: PublicEnvironment,
  now: Date, timeZone = "UTC",
): Promise<Map<string, RecordedGuestLocation>> {
  const unique = [...new Set(ids.filter(id => validActivityIdentity("guest", id)))];
  if (!unique.length) return new Map();
  return withOptionalDb(async db => {
    const locations = new Map<string, RecordedGuestLocation>();
    for (let offset = 0; offset < unique.length; offset += 1000) {
      const batch = unique.slice(offset, offset + 1000);
      const allowed = new Set(batch);
      const rows = await db.$queryRaw<Row[]>(guestLatestRecordedLocationsSql(batch, query, environment, now, timeZone));
      if (rows.length > batch.length * 2) throw new Error("Invalid guest location summary");
      for (const row of rows) {
        if (!allowed.has(row.guestId) || (row.guestSource !== "consented" && row.guestSource !== "operational")) continue;
        const value = recordedGuestLocationSummary(row, now);
        if (value) locations.set(guestRecordedLocationKey(row.guestId, row.guestSource), value);
      }
    }
    return locations;
  }, new Map<string, RecordedGuestLocation>());
}
