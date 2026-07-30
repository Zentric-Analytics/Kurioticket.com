import { AdminDataTable, AdminEmptyState, AdminPageShell } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { withOptionalDb } from "@/lib/prisma";

export const metadata = { title: "Admin Redirects" };

export default async function AdminRedirectsPage() {
  const redirects = await withOptionalDb((db) => db.redirectLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }), []);

  return (
    <AdminPageShell title="Redirects" description="Outbound provider handoff attempts and provider redirect logs, when real logs exist.">
      {redirects.length === 0 ? (
        <AdminEmptyState title="No redirect logs" message="Redirect logging is not active yet or no outbound handoffs have been recorded." />
      ) : (
        <AdminDataTable
          columns={["Route", "Provider", "Source page", "Destination domain", "Status", "Created"]}
          rows={redirects.map((redirect) => ({
            id: redirect.id,
            cells: [
              <span key="route" className="font-black text-slate-950">{redirect.route || "—"}</span>,
              redirect.provider,
              redirect.sourcePage,
              safeDomain(redirect.destinationUrl),
              "Recorded",
              formatDateTime(redirect.createdAt),
            ],
          }))}
        />
      )}
    </AdminPageShell>
  );
}

function safeDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "Invalid URL";
  }
}
