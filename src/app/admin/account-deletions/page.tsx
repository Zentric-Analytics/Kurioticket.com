import Link from "next/link";

import { AdminDataErrorState, AdminDataTable, AdminEmptyState, AdminLinkButton, AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { getPrisma } from "@/lib/prisma";
import { AccountDeletionFilterToolbar } from "./AccountDeletionFilterToolbar";
import { ACCOUNT_DELETION_PAGE_SIZE, accountDeletionFilters, buildAccountDeletionHref, buildAccountDeletionWhere, getVisibleAccountDeletionPages, parseAccountDeletionSearchParams, type AccountDeletionFilter, type AccountDeletionSearchParams } from "./page-data";

export const metadata = { title: "Admin Account Deletions" };
type PageProps = { searchParams?: Promise<AccountDeletionSearchParams> };
type DeletionRequestStatus = "PENDING" | "CANCELLED" | "READY_FOR_REVIEW" | "COMPLETED";

function getStatusLabel(status: DeletionRequestStatus, userStatus: string) {
  if (status === "CANCELLED") return userStatus === "ACTIVE" ? "Reactivated" : "Cancelled";
  if (status === "READY_FOR_REVIEW") return "Ready for review";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusTone(status: DeletionRequestStatus) {
  if (status === "PENDING") return "warn";
  if (status === "CANCELLED") return "good";
  if (status === "READY_FOR_REVIEW") return "bad";
  return "neutral";
}

export default async function AdminAccountDeletionsPage({ searchParams }: PageProps) {
  const filters = parseAccountDeletionSearchParams(await searchParams);
  const where = buildAccountDeletionWhere(filters);
  let data: Awaited<ReturnType<typeof loadAccountDeletionData>> | null = null;
  try {
    data = await loadAccountDeletionData(where, filters);
  } catch (error) {
    console.error("[admin-account-deletions:data]", error);
  }

  return (
    <AdminPageShell eyebrow="" title="Account Deletions" description="Manage account deletion requests and review lifecycle status.">
      <AccountDeletionFilterToolbar key={`${filters.q}:${filters.status}`} q={filters.q} status={filters.status} />
      {!data ? (
        <AdminDataErrorState title="Account deletion requests could not be loaded." message="Refresh the page or check the database connection." />
      ) : (
        <div className="space-y-3">
          <LifecycleTabs activeFilter={filters.status} q={filters.q} counts={data.counts} />
          {data.requests.length === 0 ? (
            <AdminEmptyState
              title={data.totalRequests === 0 ? "No deletion requests" : "No requests in this view"}
              message={data.totalRequests === 0 ? "Account deletion requests will appear here after users submit them." : "Try another status filter to review other deletion request lifecycle states."}
              action={data.totalRequests === 0 ? undefined : <AdminLinkButton href="/admin/account-deletions">Clear filters</AdminLinkButton>}
            />
          ) : (
            <RequestsTable data={data} filters={filters} />
          )}
        </div>
      )}
    </AdminPageShell>
  );
}

async function loadAccountDeletionData(where: ReturnType<typeof buildAccountDeletionWhere>, filters: ReturnType<typeof parseAccountDeletionSearchParams>) {
  const db = getPrisma();
  const [totalRequests, totalMatchingRequests, ...filterCounts] = await Promise.all([
    db.accountDeletionRequest.count(),
    db.accountDeletionRequest.count({ where }),
    ...accountDeletionFilters.map((filter) => db.accountDeletionRequest.count({ where: buildAccountDeletionWhere({ q: filters.q, status: filter.key }) })),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalMatchingRequests / ACCOUNT_DELETION_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const requests = totalMatchingRequests === 0 ? [] : await db.accountDeletionRequest.findMany({
    where,
    orderBy: [{ requestedAt: "desc" }],
    skip: (currentPage - 1) * ACCOUNT_DELETION_PAGE_SIZE,
    take: ACCOUNT_DELETION_PAGE_SIZE,
    include: { user: { select: { email: true, role: true, status: true } } },
  });
  const counts = Object.fromEntries(accountDeletionFilters.map((filter, index) => [filter.key, filterCounts[index]])) as Record<AccountDeletionFilter, number>;
  return { requests, totalRequests, totalMatchingRequests, currentPage, totalPages, counts };
}

function LifecycleTabs({ activeFilter, q, counts }: { activeFilter: AccountDeletionFilter; q: string; counts: Record<AccountDeletionFilter, number> }) {
  return <nav className="-mx-1 overflow-x-auto px-1 pb-1" aria-label="Account deletion lifecycle status"><div className="flex w-max gap-2">{accountDeletionFilters.map((filter) => {
    const active = filter.key === activeFilter;
    return <Link key={filter.key} href={buildAccountDeletionHref(1, { q, status: filter.key })} className={`focus-ring inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition ${active ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"}`} aria-current={active ? "page" : undefined}>{filter.label}<span className={`inline-flex min-w-5 justify-center rounded-full px-1.5 py-0.5 text-[11px] leading-none ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{counts[filter.key]}</span></Link>;
  })}</div></nav>;
}

function RequestsTable({ data, filters }: { data: NonNullable<Awaited<ReturnType<typeof loadAccountDeletionData>>>; filters: ReturnType<typeof parseAccountDeletionSearchParams> }) {
  const first = (data.currentPage - 1) * ACCOUNT_DELETION_PAGE_SIZE + 1;
  const last = Math.min(data.currentPage * ACCOUNT_DELETION_PAGE_SIZE, data.totalMatchingRequests);
  return <AdminDataTable caption="Account deletion requests" density="compact" minWidth="980px" columns={["Request", "User", "Status", "Requested", "Support / Admin reference", { key: "action", label: "Action", align: "right" }]} summary={<span className="text-xs text-slate-500">Showing {first}–{last} of {data.totalMatchingRequests} requests</span>} footer={<Pagination currentPage={data.currentPage} totalPages={data.totalPages} filters={filters} first={first} last={last} total={data.totalMatchingRequests} />} rows={data.requests.map((request) => ({ id: request.id, cells: [
    <div key="request" className="space-y-1"><p className="font-semibold text-slate-950">Account deletion request</p><p className="font-mono text-xs text-slate-500">Ref {shortReference(request.id)}</p></div>,
    <div key="user" className="flex min-w-0 items-center gap-3"><span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F7FA] text-xs font-black text-[#004BB8] ring-1 ring-[#DDE7F0]">{getInitials(request.email || request.user.email || "User")}</span><span className="min-w-0"><span className="block max-w-64 truncate font-semibold text-slate-950">{request.email || request.user.email || "—"}</span><span className="mt-1 flex gap-1.5"><AdminStatusBadge tone={request.user.status === "ACTIVE" ? "good" : request.user.status === "PENDING_DELETION" ? "warn" : "neutral"}>{request.user.status}</AdminStatusBadge><AdminStatusBadge tone="neutral">{request.user.role}</AdminStatusBadge></span></span></div>,
    <div key="status" className="space-y-1"><AdminStatusBadge tone={getStatusTone(request.status)}>{getStatusLabel(request.status, request.user.status)}</AdminStatusBadge>{request.status === "READY_FOR_REVIEW" ? <p className="text-xs font-semibold text-amber-700">Awaiting review</p> : null}</div>,
    formatDateTime(request.requestedAt),
    <OperationalReference key="reference" supportTicketId={request.supportTicketId} adminReference={request.adminNotificationId} />,
    <AdminLinkButton key="action" href={`/admin/account-deletions/${request.id}`} size="sm" variant="secondary" aria-label={`Review deletion request for ${request.email || request.user.email}`}>Review →</AdminLinkButton>,
  ] }))} />;
}

function OperationalReference({ supportTicketId, adminReference }: { supportTicketId: string | null; adminReference: string | null }) {
  if (supportTicketId) return <div className="space-y-1"><p className="text-xs text-slate-500">Support ticket</p><Link className="font-mono text-xs font-semibold text-[#004BB8] hover:underline" href={`/admin/support/${supportTicketId}`}>{shortReference(supportTicketId)}</Link></div>;
  if (adminReference) return <div className="space-y-1"><p className="text-xs text-slate-500">Admin reference</p><p className="font-mono text-xs font-semibold text-slate-700">{shortReference(adminReference)}</p></div>;
  return <span className="text-xs text-slate-500">System-generated request</span>;
}

function Pagination({ currentPage, totalPages, filters, first, last, total }: { currentPage: number; totalPages: number; filters: { q: string; status: AccountDeletionFilter }; first: number; last: number; total: number }) {
  const previous = currentPage > 1 ? buildAccountDeletionHref(currentPage - 1, filters) : null;
  const next = currentPage < totalPages ? buildAccountDeletionHref(currentPage + 1, filters) : null;
  return <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center sm:justify-between" aria-label="Account deletion requests pagination"><span>Showing {first}–{last} of {total} requests</span><div className="flex flex-wrap gap-2"><PageControl href={previous}>Previous</PageControl>{getVisibleAccountDeletionPages(currentPage, totalPages).map((page) => <Link key={page} className={`focus-ring rounded-xl border px-3 py-2 ${page === currentPage ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-200 bg-white text-slate-700"}`} href={buildAccountDeletionHref(page, filters)} aria-current={page === currentPage ? "page" : undefined}>{page}</Link>)}<PageControl href={next}>Next</PageControl></div></nav>;
}

function PageControl({ href, children }: { href: string | null; children: React.ReactNode }) { return href ? <Link className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700" href={href}>{children}</Link> : <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400" aria-disabled="true">{children}</span>; }
function shortReference(reference: string) { return reference.length > 12 ? `${reference.slice(0, 8)}…${reference.slice(-4)}` : reference; }
function getInitials(email: string) { return (email.split("@")[0] || "User").slice(0, 2).toUpperCase(); }
