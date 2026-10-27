import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/auth-guards";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";

export const metadata = { title: "Admin Guest Search Session" };
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const displayTime = (at: Date) => new Intl.DateTimeFormat("en", {
  dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
}).format(at) + " UTC";

export default async function AdminGuestSearchSessionPage({ params }: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminSession("/admin/searches/sessions/" + encodeURIComponent(id));
  if (!SESSION_ID.test(id)) notFound();
  const environment = getPublicEnvironment();
  const db = getOptionalPrisma();
  if (!db) return <AdminPageShell title="Guest search session" hideHeader>
    <p className="px-2 py-5 text-sm text-[#6B7280]">Session records are temporarily unavailable.</p>
  </AdminPageShell>;

  // A search session is not an account or an analytics identity. Only show
  // records directly bearing this server-created reference in this environment,
  // excluding registered account activity even when a browser is shared.
  const [searches, handoffs] = await Promise.all([
    db.searchHistory.findMany({
      where: {
        userId: null,
        AND: [
          { query: { path: ["operationalSessionId"], equals: id } },
          { query: { path: ["environment"], equals: environment } },
        ],
      },
      select: { id: true, type: true, origin: true, destination: true, status: true, resultCount: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
    }),
    db.redirectLog.findMany({
      where: {
        userId: null,
        AND: [
          { metadata: { path: ["operationalSessionId"], equals: id } },
          { metadata: { path: ["environment"], equals: environment } },
        ],
      },
      select: { id: true, type: true, provider: true, route: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
    }),
  ]);
  if (!searches.length && !handoffs.length) notFound();
  return <div className="space-y-4">
    <Link href={"/admin/searches/activity?environment=" + environment} className="text-[13px] font-medium text-[#004BB8] hover:underline">Back to Search activity</Link>
    <AdminPageShell title="Guest search session" hideHeader>
      <div className="space-y-5 px-2 text-[#374151]">
        <div className="border-b border-[#E5E7EB] pb-4">
          <h1 className="text-[18px] font-semibold text-[#111827]">Guest search session</h1>
          <p className="mt-1 text-[12px] text-[#6B7280]">This is a temporary operational session, not a verified person or a registered account.</p>
          <p className="mt-2 break-all text-[11px] text-[#6B7280]">Session ID: {id} · {environment}</p>
          <p className="mt-2 text-[12px]">Up to 100 recent searches and 100 handoffs are shown.</p>
        </div>
        <section className="space-y-2">
          <h2 className="text-[14px] font-semibold text-[#111827]">Searches ({searches.length})</h2>
          {searches.length ? searches.map(search => <Link key={search.id}
            href={"/admin/searches/" + encodeURIComponent(search.id) + "?environment=" + environment}
            className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E5E7EB] py-3 text-[13px] hover:bg-[#FAFAFA]">
            <span className="min-w-0"><strong>{search.type}</strong> · {[search.origin, search.destination].filter(Boolean).join(" → ") || "Search"} · {search.status} · {search.resultCount} results</span>
            <span className="text-[11px] text-[#6B7280]">{displayTime(search.createdAt)}</span>
          </Link>) : <p className="text-[12px] text-[#6B7280]">No linked searches found.</p>}
        </section>
        <section className="space-y-2">
          <h2 className="text-[14px] font-semibold text-[#111827]">Provider handoffs ({handoffs.length})</h2>
          {handoffs.length ? handoffs.map(handoff => <div key={handoff.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E5E7EB] py-3 text-[13px]">
            <span>{handoff.type} · {handoff.provider} · {handoff.route || "Provider handoff"}</span>
            <span className="text-[11px] text-[#6B7280]">{displayTime(handoff.createdAt)}</span>
          </div>) : <p className="text-[12px] text-[#6B7280]">No linked provider handoffs found.</p>}
        </section>
      </div>
    </AdminPageShell>
  </div>;
}
