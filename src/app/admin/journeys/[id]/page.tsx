import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminEmptyState, AdminPageShell } from "@/components/admin/AdminPageShell";
import { JourneyEventHistory } from "@/components/admin/JourneyEventHistory";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { formatViewerTimestamp } from "@/lib/adminLocalTime";
import { decodeActivityJourneyReturn } from "@/lib/adminActivityJourneyNavigation";
import { journeyCalendarTimeZone, journeyDetailCalendarWindow } from "@/lib/adminJourneyDateRange";
import { resetStaleJourneyDateCursor } from "@/lib/adminJourneyDateCursor";
import { adminJourneys } from "@/services/adminJourneyService";

export const metadata = { title: "Admin Journey Detail" };

export default async function AdminJourneyDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const timeZone = await getAdminViewerTimeZone();
  const supplied = await searchParams;
  const now = new Date();
  const calendarTimeZone = journeyCalendarTimeZone(supplied, timeZone);
  const raw = calendarTimeZone ? resetStaleJourneyDateCursor(supplied, now, calendarTimeZone, id) : supplied;
  const fixed = calendarTimeZone ? journeyDetailCalendarWindow(raw, now, calendarTimeZone) : {};
  const backendRaw = { ...raw }; delete backendRaw.range; delete backendRaw.activityReturn; delete backendRaw.asOf;
  const input: Record<string, unknown> = { ...backendRaw, ...fixed, limit: one(raw.limit) || "50" };
  const result = await adminJourneys.detail(id, input, calendarTimeZone);
  if (result.status === "not_found") notFound();

  return (
    <>
      <SearchWorkspaceBackLink href={returnHref(raw)} label={decodeActivityJourneyReturn(raw.activityReturn)?.split("?")[0].endsWith("/journeys") ? "Back to Journey History" : decodeActivityJourneyReturn(raw.activityReturn) ? "Back to Activity" : "Journeys"} />
      <AdminPageShell title="Journey detail" hideHeader>
      {result.status === "ok" ? (
        <div className="min-w-0 space-y-6 bg-white py-3 text-[#020617]">
          <section aria-labelledby="journey-details-heading" className="min-w-0 border-b border-[#D8E1EC] pb-5">
            <h2 id="journey-details-heading" className="mb-4 text-[15px] font-semibold text-[#020617]">Journey details</h2>
            <dl className="grid min-w-0 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Journey ID" value={result.data.journey.id} />
              <Field label="Identity" value={result.data.journey.identity.kind} />
              <Field label="User ID" value={result.data.journey.identity.userId || "—"} />
              <Field label="Visitor ID" value={result.data.journey.identity.visitorId} />
              <Field label="Started" value={formatViewerTimestamp(result.data.journey.startedAt, timeZone)} />
              <Field label="First event in window" value={formatViewerTimestamp(result.data.journey.firstEventAt, timeZone)} />
              <Field label="Last event in window" value={formatViewerTimestamp(result.data.journey.lastEventAt, timeZone)} />
              <Field label="Products" value={result.data.journey.products.join(", ") || "—"} />
              <Field label="Providers" value={result.data.journey.providers.join(", ") || "—"} />
              <Field label="Recorded searches" value={String(result.data.journey.searchCount)} />
              <Field label="Journey events count" value={String(result.data.journey.eventCount)} />
              <Field label="Environment" value={result.data.scope.environment} />
            </dl>
          </section>
          <JourneyEventHistory events={result.data.events} timeZone={timeZone} />
          {result.data.nextCursor ? <div className="flex justify-end"><Link href={cursorHref(id, raw, result.data.nextCursor)} className="inline-flex h-9 items-center rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]">Next events</Link></div> : null}
        </div>
      ) : (
        <AdminEmptyState title={result.status === "invalid" ? "Invalid journey request" : result.status === "forbidden" ? "Admin access required" : "Journey data unavailable"} message={"issues" in result ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The journey reader could not return this record."} />
      )}
      </AdminPageShell>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-[12px] font-normal text-[#64748B]">{label}</dt><dd className="mt-1 text-[13px] font-medium leading-5 text-[#020617] [overflow-wrap:anywhere]">{value}</dd></div>;
}
function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function cursorHref(id: string, raw: Record<string, string | string[] | undefined>, cursor: string) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && value && key !== "cursor") p.set(key, value);
  p.set("cursor", cursor); p.set("limit", one(raw.limit) || "50");
  return "/admin/journeys/" + id + "?" + p.toString();
}

function returnHref(raw: Record<string, string | string[] | undefined>) {
  const activityReturn = decodeActivityJourneyReturn(raw.activityReturn);
  if (activityReturn) return activityReturn;
  // Always return to the filtered cohort, never to an arbitrary supplied URL.
  const p = new URLSearchParams();
  for (const key of ["range", "from", "to", "environment", "identity", "product", "provider", "stage", "userId", "visitorId"]) {
    const value = raw[key];
    if (typeof value === "string" && value.length <= 256 && value) p.set(key, value);
  }
  return "/admin/journeys" + (p.size ? "?" + p.toString() : "");
}
