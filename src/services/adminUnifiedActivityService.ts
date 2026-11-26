import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { ACTIVITY_PAGE_SIZE, activityWindow, decodeActivityCursor, encodeActivityCursor, type ActivityCursor, type ActivityFilters } from "@/lib/adminIdentityActivity";
import { type ActivityRow, type IdentityKind } from "@/lib/adminIdentityJourney";
import { guestAccessRecordsSql, accessDatePredicate } from "@/lib/adminGuestAccessSql";
import { loadAdminIdentityActivity, type ActivityReadResult } from "@/services/adminIdentityActivityService";

type DeviceRow = { id: string; at: Date; detail: string; label: string };
const pageSize = ACTIVITY_PAGE_SIZE;
function deviceSeek(cursor: ActivityCursor | undefined) {
  if (!cursor) return Prisma.empty;
  const at = new Date(cursor.at);
  // d sorts before all of the existing event sources at the same instant.
  return cursor.id.startsWith("d-")
    ? Prisma.sql`AND ("at" < ${at} OR ("at" = ${at} AND "id" > ${cursor.id}))`
    : Prisma.sql`AND "at" < ${at}`;
}
export function mergeUnifiedActivityPage(events: ActivityRow[], access: ActivityRow[], hasMoreEvents: boolean) {
  const rows = [...events, ...access].sort((a,b) => +b.at - +a.at || a.id.localeCompare(b.id));
  return { rows: rows.slice(0, pageSize), hasMore: rows.length > pageSize || hasMoreEvents };
}

/** Reuse the existing consent- and environment-scoped reader for every travel,
 * account and page event. Access observations are projected independently;
 * they never enter funnel totals or create a search/journey event. */
export async function loadAdminUnifiedActivity(kind: IdentityKind, id: string, filters: ActivityFilters, cursorInput: string | undefined, now: Date): Promise<ActivityReadResult> {
  const environment = getPublicEnvironment();
  const cursor = decodeActivityCursor(cursorInput, kind, id, filters, environment);
  if (cursor === null || filters.order === "oldest") return { status: "invalid_cursor" };
  const result = await loadAdminIdentityActivity(kind, id, filters, cursorInput);
  if (result.status !== "ok") return result;
  if ((filters.tab !== "all" && filters.tab !== "access") || filters.stage !== "all" || filters.product !== "all")
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
          WHEN 'native' THEN 'Mobile app' ELSE 'Unknown' END,
          "deviceLabel", "browser", "os", COALESCE("locationLabel", 'Location unavailable')) AS "detail"
      FROM (${guestAccessRecordsSql({range:"all",page:1}, environment, now, id, filters.timeZone ?? "UTC")}) observed
      WHERE ${accessDatePredicate(Prisma.sql`"at"`, window)}
        AND ${filters.tab === "access"}
    ` : Prisma.sql`
      SELECT 'd-' || s."id" AS "id", s."lastSeenAt" AS "at", 'Recorded device access' AS "label",
        concat_ws(' · ', CASE WHEN s."client" = 'MOBILE' AND s."platform" = 'ios' THEN 'iOS app'
          WHEN s."client" = 'MOBILE' AND s."platform" = 'android' THEN 'Android app'
          WHEN s."client" = 'MOBILE' THEN 'Mobile app'
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
    const merged = mergeUnifiedActivityPage(result.data.events, access, Boolean(result.data.nextCursor));
    const last = merged.rows.at(-1);
    return { status:"ok", data: {...result.data, events: merged.rows,
      nextCursor: merged.hasMore && last ? encodeActivityCursor(last, kind, id, filters, environment) : null }};
  } catch {
    return {status:"unavailable"};
  }
}
