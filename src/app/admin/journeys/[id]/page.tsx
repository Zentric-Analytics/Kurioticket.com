import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDataTable, AdminEmptyState, AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { adminJourneys } from "@/services/adminJourneyService";

export const metadata = { title: "Admin Journey Detail" };

export default async function AdminJourneyDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const raw = await searchParams;
  const input: Record<string, unknown> = { ...raw, limit: one(raw.limit) || "50" };
  const result = await adminJourneys.detail(id, input);
  if (result.status === "not_found") notFound();

  return (
    <AdminPageShell title="Journey detail" description="Chronological view of eligible recorded journey events. Missing stages are not inferred as abandonment, and a provider handoff is not a booking confirmation." actions={<Link href="/admin/journeys" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Back to journeys</Link>}>
      {result.status === "ok" ? (
        <div className="space-y-4">
          <AdminSectionCard className="p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              <Field label="Events" value={String(result.data.journey.eventCount)} />
              <Field label="Environment" value={result.data.scope.environment} />
            </div>
          </AdminSectionCard>
          <AdminDataTable
            columns={["Time", "Stage", "Product", "Provider", "Search", "Handoff", "Source"]}
            rows={result.data.events.map((event) => ({
              id: event.id,
              cells: [
                formatDateTime(new Date(event.createdAt)),
                <AdminStatusBadge key="type" tone={event.type === "PROVIDER_HANDOFF_STARTED" ? "good" : "info"}>{event.type.replaceAll("_", " ")}</AdminStatusBadge>,
                event.product || "—",
                event.provider || "—",
                event.search ? <div key="search"><p className="font-semibold text-slate-950">{event.search.origin || "—"}{event.search.destination ? " → " + event.search.destination : ""}</p><p className="text-xs text-slate-500">{event.search.status} · {event.search.resultCount} results</p></div> : "—",
                event.handoff ? <div key="handoff"><p className="font-semibold text-slate-950">{event.handoff.provider}</p><p className="text-xs text-slate-500">{event.handoff.destinationDomain || "—"} · {event.handoff.searchCorrelation === "exact" ? "exact search link" : "search link unavailable"}</p></div> : "—",
                event.sourcePage || "—",
              ],
            }))}
          />
          {result.data.nextCursor ? <div className="flex justify-end"><Link href={cursorHref(id, raw, result.data.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Next events</Link></div> : null}
        </div>
      ) : (
        <AdminEmptyState title={result.status === "invalid" ? "Invalid journey request" : result.status === "forbidden" ? "Admin access required" : "Journey data unavailable"} message={"issues" in result ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The journey reader could not return this record."} />
      )}
    </AdminPageShell>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div></div>;
}
function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function cursorHref(id: string, raw: Record<string, string | string[] | undefined>, cursor: string) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && value && key !== "cursor") p.set(key, value);
  p.set("cursor", cursor); p.set("limit", one(raw.limit) || "50");
  return "/admin/journeys/" + id + "?" + p.toString();
}
