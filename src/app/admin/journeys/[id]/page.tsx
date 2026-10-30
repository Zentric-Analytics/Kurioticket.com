import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminEmptyState, AdminPageShell } from "@/components/admin/AdminPageShell";
import { JourneyEventHistory } from "@/components/admin/JourneyEventHistory";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { formatDateTime } from "@/lib/admin-data";
import { decodeActivityJourneyReturn } from "@/lib/adminActivityJourneyNavigation";
import { adminJourneys } from "@/services/adminJourneyService";

export const metadata = { title: "Admin Journey Detail" };

export default async function AdminJourneyDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const raw = await searchParams;
  const { range: _range, activityReturn: _activityReturn, ...backendRaw } = raw;
  const input: Record<string, unknown> = { ...backendRaw, limit: one(raw.limit) || "50" };
  const result = await adminJourneys.detail(id, input);
  if (result.status === "not_found") notFound();

  return (
    <>
      <SearchWorkspaceBackLink href={returnHref(raw)} label={decodeActivityJourneyReturn(raw.activityReturn) ? "Back to Activity" : "Journeys"} />
      <AdminPageShell title="Journey detail" hideHeader>
      {result.status === "ok" ? (
        <div className="min-w-0 space-y-5 bg-white p-4 sm:p-5">
          <section aria-labelledby="journey-details-heading" className="min-w-0 border-b border-[#E2E8F0] pb-4">
            <h2 id="journey-details-heading" className="mb-4 text-base font-semibold text-[#0F172A]">Journey details</h2>
            <dl className="grid min-w-0 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Journey ID" value={result.data.journey.id} />
              <Field label="Identity" value={result.data.journey.identity.kind} />
              <Field label="User ID" value={result.data.journey.identity.userId || "—"} />
              <Field label="Visitor ID" value={result.data.journey.identity.visitorId} />
              <Field label="Started" value={formatDateTime(new Date(result.data.journey.startedAt))} />
              <Field label="First event in window" value={formatDateTime(new Date(result.data.journey.firstEventAt))} />
              <Field label="Last event in window" value={formatDateTime(new Date(result.data.journey.lastEventAt))} />
              <Field label="Products" value={result.data.journey.products.join(", ") || "—"} />
              <Field label="Providers" value={result.data.journey.providers.join(", ") || "—"} />
              <Field label="Recorded searches" value={String(result.data.journey.searchCount)} />
              <Field label="Journey events count" value={String(result.data.journey.eventCount)} />
              <Field label="Environment" value={result.data.scope.environment} />
            </dl>
          </section>
          <JourneyEventHistory events={result.data.events} />
          {result.data.nextCursor ? <div className="flex justify-end"><Link href={cursorHref(id, raw, result.data.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Next events</Link></div> : null}
        </div>
      ) : (
        <AdminEmptyState title={result.status === "invalid" ? "Invalid journey request" : result.status === "forbidden" ? "Admin access required" : "Journey data unavailable"} message={"issues" in result ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The journey reader could not return this record."} />
      )}
      </AdminPageShell>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-[#64748B]">{label}</dt><dd className="mt-1 text-[13px] font-medium text-[#0F172A] [overflow-wrap:anywhere]">{value}</dd></div>;
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
