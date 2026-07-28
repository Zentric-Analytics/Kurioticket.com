import Link from "next/link";

import { AdminDataErrorState, AdminEmptyState, AdminLinkButton, AdminPageShell } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { getPrisma } from "@/lib/prisma";
import { AdminLogsFilterToolbar } from "./AdminLogsFilterToolbar";
import { AdminLogsTable, type AdminLogTableRow } from "./AdminLogsTable";
import { ADMIN_LOG_PAGE_SIZE, buildAdminLogsHref, buildAdminLogsWhere, clampAdminLogsPage, parseAdminLogsSearchParams, type AdminLogsSearchParams } from "./page-data";

export const metadata = { title: "Admin Logs" };
type PageProps = { searchParams?: Promise<AdminLogsSearchParams> };

export default async function AdminLogsPage({ searchParams }: PageProps) {
  const filters = parseAdminLogsSearchParams(await searchParams);
  const where = buildAdminLogsWhere(filters);
  let data: AdminLogsData | null = null;
  try {
    const db = getPrisma();
    const [total, all, adminOptions, actionOptions] = await Promise.all([
      db.adminAuditLog.count({ where }), db.adminAuditLog.count(),
      db.adminAuditLog.findMany({ distinct: ["adminEmail"], select: { adminEmail: true }, orderBy: { adminEmail: "asc" } }),
      db.adminAuditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    ]);
    const { currentPage, totalPages } = clampAdminLogsPage(filters.page, total);
    const logs = total ? await db.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (currentPage - 1) * ADMIN_LOG_PAGE_SIZE, take: ADMIN_LOG_PAGE_SIZE }) : [];
    data = { logs: logs.map((log) => ({ ...log, created: formatDateTime(log.createdAt) })), total, all, currentPage, totalPages, admins: adminOptions.map(({ adminEmail }) => adminEmail), actions: actionOptions.map(({ action }) => action) };
  } catch (error) { console.error("[admin-logs:data]", error); }

  return <AdminPageShell eyebrow="" title="Admin Logs" description="Review administrative and security-sensitive actions.">
    <AdminLogsFilterToolbar filters={filters} admins={data?.admins || []} actions={data?.actions || []} />
    {!data ? <AdminDataErrorState title="Admin logs could not be loaded." message="Refresh the page or check the database connection." /> : data.logs.length === 0 ? <AdminEmptyState title={data.all === 0 ? "No admin logs recorded." : "No admin logs found."} message={data.all === 0 ? "Administrative and security-sensitive actions will appear here." : "Try another filter or clear the current filters."} action={data.all === 0 ? undefined : <AdminLinkButton href="/admin/logs">Clear filters</AdminLinkButton>} /> : <LogsResults data={data} filters={filters} />}
  </AdminPageShell>;
}

type AdminLogsData = { logs: AdminLogTableRow[]; total: number; all: number; currentPage: number; totalPages: number; admins: string[]; actions: string[] };

function LogsResults({ data, filters }: { data: AdminLogsData; filters: ReturnType<typeof parseAdminLogsSearchParams> }) {
  const first = (data.currentPage - 1) * ADMIN_LOG_PAGE_SIZE + 1;
  const last = Math.min(data.currentPage * ADMIN_LOG_PAGE_SIZE, data.total);
  return <div className="mt-1 space-y-3"><p className="text-xs text-slate-500">Showing {first}–{last} of {data.total} log entries</p><AdminLogsTable logs={data.logs} /><Pagination {...data} filters={filters} first={first} last={last} /></div>;
}

function Pagination({ currentPage, totalPages, total, first, last, filters }: { currentPage: number; totalPages: number; total: number; first: number; last: number; filters: ReturnType<typeof parseAdminLogsSearchParams> }) {
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => start + index);
  return <nav aria-label="Admin logs pagination" className="flex flex-col gap-3 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center sm:justify-between"><span>Showing {first}–{last} of {total} log entries</span><div className="flex flex-wrap gap-2"><PageLink href={currentPage > 1 ? buildAdminLogsHref(currentPage - 1, filters) : null}>Previous</PageLink>{pages.map((page) => <Link key={page} href={buildAdminLogsHref(page, filters)} aria-current={page === currentPage ? "page" : undefined} className={`focus-ring rounded-xl border px-3 py-2 ${page === currentPage ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{page}</Link>)}<PageLink href={currentPage < totalPages ? buildAdminLogsHref(currentPage + 1, filters) : null}>Next</PageLink></div></nav>;
}
function PageLink({ href, children }: { href: string | null; children: React.ReactNode }) { return href ? <Link href={href} className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">{children}</Link> : <span aria-disabled="true" className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400">{children}</span>; }
