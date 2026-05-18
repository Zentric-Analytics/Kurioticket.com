import { AdminPageShell, EmptyState } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { getPrisma } from "@/lib/prisma";

export const metadata = { title: "Admin Redirects" };

export default async function AdminRedirectsPage() {
  const redirects = await getPrisma().redirectLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <AdminPageShell title="Redirects" description="Future Kayak-style outbound booking handoff attempts and provider redirect logs.">
      {redirects.length === 0 ? <EmptyState message="Redirect logging is not active yet." /> : (
        <Card className="overflow-x-auto p-0"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-muted"><tr><th className="p-3">Route</th><th className="p-3">Provider</th><th className="p-3">Source page</th><th className="p-3">Destination domain</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead><tbody>{redirects.map((redirect) => <tr key={redirect.id} className="border-t border-border"><td className="p-3 font-bold text-navy">{redirect.route || "—"}</td><td className="p-3">{redirect.provider}</td><td className="p-3">{redirect.sourcePage}</td><td className="p-3">{safeDomain(redirect.destinationUrl)}</td><td className="p-3">Recorded</td><td className="p-3">{formatDate(redirect.createdAt)}</td></tr>)}</tbody></table></Card>
      )}
    </AdminPageShell>
  );
}
function safeDomain(url: string) { try { return new URL(url).hostname; } catch { return "Invalid URL"; } }
function formatDate(date: Date) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date); }
