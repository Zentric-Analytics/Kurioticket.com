import Link from "next/link";
import { withOptionalDb } from "@/lib/prisma";

type ActivityRow = { id: string; label: string; detail: string; at: Date };

const date = (at: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(at);

/** Server-rendered, admin-only through the enclosing /admin layout. Never expose raw analytics metadata. */
export async function IdentityActivityPanel({ selection }: { selection: string }) {
  const match = /^(user|guest):([a-z0-9_-]{6,80})$/i.exec(selection);
  if (!match) return null;
  const [, kind, id] = match;
  const data = await withOptionalDb(async db => {
    if (kind === "user") {
      const user = await db.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, status: true, role: true, createdAt: true },
      });
      if (!user) return null;
      // Explicit account attribution stays authoritative. Include anonymous
      // activity only for a still-consenting visitor linked exclusively here.
      const activityWhere = {
        OR: [
          { userId: id },
          { userId: null, visitor: { is: {
            currentUserId: id,
            consentStatus: "GRANTED" as const,
            trackingDisabledAt: null,
            identityLinks: { some: { userId: id }, none: { userId: { not: id } } },
          } } },
        ],
      };
      const [searches, handoffs] = await Promise.all([
        db.searchHistory.findMany({ where: activityWhere, select: { id: true, type: true, origin: true, destination: true, status: true, createdAt: true }, take: 30, orderBy: { createdAt: "desc" } }),
        db.redirectLog.findMany({ where: activityWhere, select: { id: true, provider: true, route: true, createdAt: true }, take: 30, orderBy: { createdAt: "desc" } }),
      ]);
      const events: ActivityRow[] = [
        ...searches.map(s => ({ id: "s-" + s.id, label: s.type + " search", detail: [s.origin, s.destination].filter(Boolean).join(" → ") + " · " + s.status, at: s.createdAt })),
        ...handoffs.map(h => ({ id: "r-" + h.id, label: "Provider handoff", detail: [h.provider, h.route].filter(Boolean).join(" · "), at: h.createdAt })),
      ];
      return { title: user.name || user.email || "Registered user", subtitle: user.email || user.id, type: "Registered", status: user.status, since: user.createdAt, events: events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30) };
    }
    const visitor = await db.visitor.findFirst({
      where: { id, consentStatus: "GRANTED", trackingDisabledAt: null, currentUserId: null, identityLinks: { none: {} } },
      select: { id: true, firstSeenAt: true, lastSeenAt: true },
    });
    if (!visitor) return null;
    const [searches, handoffs, analytics] = await Promise.all([
      db.searchHistory.findMany({ where: { visitorId: id, userId: null }, select: { id: true, type: true, origin: true, destination: true, status: true, createdAt: true }, take: 30, orderBy: { createdAt: "desc" } }),
      db.redirectLog.findMany({ where: { visitorId: id, userId: null }, select: { id: true, provider: true, route: true, createdAt: true }, take: 30, orderBy: { createdAt: "desc" } }),
      db.analyticsEvent.findMany({ where: { visitorId: id, userId: null, type: { notIn: ["SEARCH", "REDIRECT"] } }, select: { id: true, type: true, name: true, createdAt: true }, take: 30, orderBy: { createdAt: "desc" } }),
    ]);
    const events: ActivityRow[] = [
      ...searches.map(s => ({ id: "s-" + s.id, label: s.type + " search", detail: [s.origin, s.destination].filter(Boolean).join(" → ") + " · " + s.status, at: s.createdAt })),
      ...handoffs.map(h => ({ id: "r-" + h.id, label: "Provider handoff", detail: [h.provider, h.route].filter(Boolean).join(" · "), at: h.createdAt })),
      ...analytics.map(e => ({ id: "e-" + e.id, label: e.type.replaceAll("_", " "), detail: e.name, at: e.createdAt })),
    ];
    return { title: "Guest visitor", subtitle: "Guest ID: " + visitor.id, type: "Guest", status: "Anonymous", since: visitor.firstSeenAt, events: events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30) };
  }, null);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/20" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Identity activity" className="h-full w-full max-w-[470px] overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">User Activity</h2>
            <p className="mt-1 text-xs text-slate-500">Recorded searches and provider events</p>
          </div>
          <Link href="/admin/users" aria-label="Close activity" className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Close</Link>
        </div>
        {!data ? <p className="mt-6 text-sm text-slate-600">No permitted identity record found.</p> : (
          <>
            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{data.title}</h3><span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{data.type}</span></div>
              <p className="mt-2 break-all text-sm text-slate-500">{data.subtitle}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">Status</dt><dd className="font-medium">{data.status}</dd></div><div><dt className="text-xs text-slate-500">First recorded</dt><dd>{date(data.since)}</dd></div></dl>
            </div>
            <div className="mt-6 flex items-center justify-between"><h3 className="font-semibold text-slate-950">Activity Timeline</h3><span className="text-xs text-slate-500">Latest {data.events.length} records</span></div>
            {data.events.length === 0 ? <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No recorded activity is available for this identity.</p> : (
              <ol className="mt-3 divide-y divide-slate-100">
                {data.events.map(event => <li key={event.id} className="py-3"><div className="flex justify-between gap-3"><span className="text-sm font-medium text-slate-900">{event.label}</span><time className="shrink-0 text-xs text-slate-500">{date(event.at)}</time></div><p className="mt-1 text-sm text-slate-600">{event.detail || "No additional details recorded"}</p></li>)}
              </ol>
            )}
            <p className="mt-4 text-xs leading-5 text-slate-500">Events are shown only when recorded. A provider handoff is not proof of a completed booking. Guest records require granted tracking consent.</p>
          </>
        )}
      </section>
    </div>
  );
}
