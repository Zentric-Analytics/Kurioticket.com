import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { ACTIVITY_PAGE_SIZE, activityWindow, decodeActivityCursor, encodeActivityCursor, type ActivityCursor, type ActivityFilters } from "@/lib/adminIdentityActivity";
import type { IdentityKind } from "@/lib/adminIdentityJourney";
import { mergeUnifiedActivityPage } from "@/lib/adminUnifiedActivityPage";
import { guestAccessRecordsSql, accessDatePredicate } from "@/lib/adminGuestAccessSql";
import { loadAdminIdentityActivity, type ActivityReadResult } from "@/services/adminIdentityActivityService";
import { canReadAdminAudit } from "@/services/adminAuditReadService";

import { recordedGuestAccessLocation, safeGuestDeviceDescription } from "@/lib/guestAccessObservation";

type DeviceRow = {
  id: string; at: Date; detail: string; label: string;
  guestId?: string; guestSource?: string; evidence?: string;
  deviceLabel?: string | null; browser?: string | null;
  os?: string | null; locationLabel?: string | null; recordedCountryCode?: string | null;
};
const pageSize = ACTIVITY_PAGE_SIZE;
function deviceSeek(cursor: ActivityCursor | undefined) {
  if (!cursor) return Prisma.empty;
  const at = new Date(cursor.at);
  // d sorts before all of the existing event sources at the same instant.
  return cursor.id.startsWith("d-")
    ? Prisma.sql`AND ("at" < ${at} OR ("at" = ${at} AND "id" > ${cursor.id}))`
    : Prisma.sql`AND "at" < ${at}`;
}


/** Reuse the existing consent- and environment-scoped reader for every travel,
 * account and page event. Access observations are projected independently;
 * they never enter funnel totals or create a search/journey event. */
export async function loadAdminUnifiedActivity(kind: IdentityKind, id: string, filters: ActivityFilters, cursorInput: string | undefined, now: Date): Promise<ActivityReadResult> {
  const environment = getPublicEnvironment();
  const cursor = decodeActivityCursor(cursorInput, kind, id, filters, environment);
  if (cursor === null || filters.order === "oldest") return { status: "invalid_cursor" };
  const result = await loadAdminIdentityActivity(kind, id, filters, cursorInput, "page", undefined, canReadAdminAudit);
  if (result.status !== "ok") return result;
  // Device sessions and derived guest access evidence are observations, not
  // additional customer actions. Both identity types show them only in Access.
  if (filters.tab !== "access" || filters.stage !== "all" || filters.product !== "all" || filters.interface)
    return result;
  try {
    const db = getOptionalPrisma();
    if (!db) return { status: "unavailable" };
    const window = { ...activityWindow(filters), lte: now };
    const q = filters.q.toLowerCase();
    // Guest access observations derived from a page/search/handoff are already
    // represented in the main activity list. Show that access evidence in the
    // Access tab without treating it as a second customer action.
    const guestAccess = kind === "guest" ? Prisma.sql`
      SELECT 'd-' || replace("recordId", ':', '-') AS "id", "at",
        CASE "evidence" WHEN 'page' THEN 'Page access observation'
          WHEN 'search' THEN 'Search access observation' ELSE 'Handoff access observation' END AS "label",
        concat_ws(' · ', CASE "platform" WHEN 'desktop' THEN 'Desktop web' WHEN 'mobile' THEN 'Mobile web'
          WHEN 'ios' THEN 'iOS app' WHEN 'android' THEN 'Android app' WHEN 'web' THEN 'Website'
          WHEN 'native' THEN 'Mobile app' ELSE 'Unknown' END) AS "detail",
        "guestId", "guestSource", "evidence",
        "deviceLabel", "browser", "os", "locationLabel", "recordedCountryCode"
      FROM (${guestAccessRecordsSql({range:"all",page:1}, environment, now, id, filters.timeZone ?? "UTC")}) observed
      WHERE ${accessDatePredicate(Prisma.sql`"at"`, window)}
        AND ${filters.tab === "access"}
    ` : Prisma.sql`
      SELECT 'd-' || s."id" AS "id", s."lastSeenAt" AS "at", 'Recorded device access' AS "label",
        concat_ws(' · ', CASE WHEN s."client" = 'MOBILE' AND s."platform" = 'ios' THEN 'iOS app'
          WHEN s."client" = 'MOBILE' AND s."platform" = 'android' THEN 'Android app'
          WHEN s."client" = 'MOBILE' THEN 'Mobile app'
          WHEN s."client" <> 'WEB' THEN 'Unknown'
          WHEN s."deviceLabel" = 'Mobile device' OR strpos(s."deviceLabel", 'iPhone') > 0 OR strpos(s."deviceLabel", 'iPad') > 0 OR strpos(s."deviceLabel", 'Android') > 0 THEN 'Mobile web'
          WHEN s."deviceLabel" = 'Desktop device' OR strpos(s."deviceLabel", 'computer') > 0 OR right(s."deviceLabel", 3) = 'Mac' THEN 'Desktop web'
          ELSE 'Website' END,
          s."deviceLabel", s."browser", s."os", COALESCE(s."locationLabel", 'Location unavailable')) AS "detail"
      FROM "AccountSession" s WHERE s."userId" = ${id}
        AND ${accessDatePredicate(Prisma.sql`s."lastSeenAt"`, window)}
    `;
    const access = await db.$queryRaw<DeviceRow[]>(Prisma.sql`
      SELECT * FROM (${guestAccess}) access_rows
      WHERE TRUE ${deviceSeek(cursor)}
        ${q ? Prisma.sql`AND strpos(lower("label" || ' ' || "detail"), ${q}) > 0` : Prisma.empty}
      ORDER BY "at" DESC, "id" ASC
      LIMIT ${pageSize + 1}
    `);
    if (access.some(row => !/^d-[a-z0-9_-]{6,100}$/i.test(row.id) || !(row.at instanceof Date) || !Number.isFinite(+row.at))) return {status:"unavailable"};
    if (kind === "guest" && access.some(row =>
      row.guestId !== id ||
      !["consented", "operational"].includes(row.guestSource ?? "") ||
      !["page", "search", "handoff"].includes(row.evidence ?? "") ||
      (row.guestSource === "consented") !== (row.evidence === "page")
    )) return {status:"unavailable"};

    const safeAccess = access.map(row => {
      const detail = kind === "guest" ? [
        row.detail,
        safeGuestDeviceDescription(row.deviceLabel, "deviceLabel"),
        safeGuestDeviceDescription(row.browser, "browser"),
        safeGuestDeviceDescription(row.os, "os"),
        recordedGuestAccessLocation(row) ?? "Location unavailable",
      ].filter(Boolean).join(" · ") : row.detail;
      return {id: row.id, at: row.at, label: row.label, detail};
    });

    const merged = mergeUnifiedActivityPage(result.data.events, safeAccess, Boolean(result.data.nextCursor), pageSize);
    const last = merged.rows.at(-1);
    return { status:"ok", data: {...result.data, events: merged.rows,
      nextCursor: merged.hasMore && last ? encodeActivityCursor(last, kind, id, filters, environment) : null }};
  } catch {
    return {status:"unavailable"};
  }
}
