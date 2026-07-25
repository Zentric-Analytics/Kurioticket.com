import Link from "next/link";
import { AdminDataTable, AdminEmptyState, AdminLinkButton, AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { withOptionalDb } from "@/lib/prisma";
import { SupportFilterToolbar } from "./SupportFilterToolbar";
import { buildSupportHref, getVisibleSupportPages, parseSupportSearchParams, SUPPORT_PAGE_SIZE, type SupportSearchParams } from "./page-data";

export const metadata = { title: "Admin Support" };
type PageProps = { searchParams?: Promise<SupportSearchParams> };

export default async function AdminSupportPage({ searchParams }: PageProps) {
  const filters = parseSupportSearchParams(await searchParams);
  const tickets = await withOptionalDb(
    (db) => db.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { email: true, name: true } } } }),
    [],
  );
  const deletionRequests = await withOptionalDb(
    (db) => db.accountDeletionRequest.findMany({
      where: { supportTicketId: { in: tickets.map((ticket) => ticket.id) } },
      select: { id: true, supportTicketId: true },
    }),
    [],
  );
  const deletionRequestByTicketId = new Map(deletionRequests.map((request) => [request.supportTicketId, request.id]));
  const categories = [...new Set(tickets.map((ticket) => ticket.category))].sort();
  const query = filters.q.toLocaleLowerCase();
  const matchingTickets = tickets.filter((ticket) =>
    (!query || [ticket.subject, ticket.user?.name, ticket.user?.email, ticket.email].some((value) => value?.toLocaleLowerCase().includes(query)))
    && (filters.category === "ALL" || ticket.category === filters.category)
    && (filters.status === "ALL" || ticket.status === filters.status));
  const totalPages = Math.max(1, Math.ceil(matchingTickets.length / SUPPORT_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const visibleTickets = matchingTickets.slice((currentPage - 1) * SUPPORT_PAGE_SIZE, currentPage * SUPPORT_PAGE_SIZE);
  const firstResult = matchingTickets.length ? (currentPage - 1) * SUPPORT_PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(currentPage * SUPPORT_PAGE_SIZE, matchingTickets.length);
  const showPriorityColumn = tickets.some((ticket) => ticket.priority !== "NORMAL");

  return (
    <AdminPageShell eyebrow="" title="Support" description="Support ticket management for Kurioticket users and guests.">
      <SupportFilterToolbar key={`${filters.q}:${filters.category}:${filters.status}`} q={filters.q} category={filters.category} status={filters.status} categories={categories} />
      {visibleTickets.length === 0 ? (
        <AdminEmptyState title="No support tickets" message={tickets.length ? "No support tickets match these filters." : "Support tickets will appear here when real users or guests submit support requests."} action={tickets.length ? <AdminLinkButton href="/admin/support">Clear filters</AdminLinkButton> : undefined} />
      ) : (
        <div className="mt-3">
          <AdminDataTable
            caption="Support tickets"
            density="compact"
            minWidth={showPriorityColumn ? "960px" : "880px"}
            columns={["Ticket", "User", "Category", "Status", ...(showPriorityColumn ? ["Priority"] : []), "Created", { key: "action", label: "Action", align: "right" }]}
            summary={<span className="text-xs text-slate-500">Showing {firstResult}–{lastResult} of {matchingTickets.length} tickets</span>}
            footer={<Pagination currentPage={currentPage} totalPages={totalPages} filters={filters} firstResult={firstResult} lastResult={lastResult} total={matchingTickets.length} />}
            rows={visibleTickets.map((ticket) => ({
              id: ticket.id,
              cells: [
                <p key="ticket" className="max-w-xs truncate font-semibold text-slate-950">{ticket.subject}</p>,
                <div key="user" className="flex min-w-0 items-center gap-3"><span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F7FA] text-xs font-black text-[#004BB8] ring-1 ring-[#DDE7F0]">{getInitials(ticket.user?.name, ticket.user?.email || ticket.email)}</span><span className="min-w-0"><span className="block truncate font-semibold text-slate-950">{ticket.user?.name || "Guest"}</span><span className="block truncate text-xs font-medium text-slate-500">{ticket.user?.email || ticket.email}</span></span></div>,
                <span key="category" className="block"><span className="block">{ticket.category}</span>{!showPriorityColumn ? <span className="mt-1 block text-xs text-slate-500">{ticket.priority}</span> : null}</span>,
                <AdminStatusBadge key="status" tone={ticket.status === "OPEN" ? "warn" : ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "good" : "info"}>{ticket.status}</AdminStatusBadge>,
                ...(showPriorityColumn ? [ticket.priority] : []),
                formatDateTime(ticket.createdAt),
                (() => { const requestId = ticket.category === "account_deletion" ? deletionRequestByTicketId.get(ticket.id) : null; return <AdminLinkButton key="action" href={requestId ? `/admin/account-deletions/${requestId}` : `/admin/support/${ticket.id}`} size="sm" variant="secondary" aria-label={`${requestId ? "View account deletion request" : "Open support ticket"} ${ticket.subject}`}>{requestId ? "View request →" : "Open →"}</AdminLinkButton>; })(),
              ],
            }))}
          />
        </div>
      )}
    </AdminPageShell>
  );
}

function Pagination({ currentPage, totalPages, filters, firstResult, lastResult, total }: { currentPage: number; totalPages: number; filters: ReturnType<typeof parseSupportSearchParams>; firstResult: number; lastResult: number; total: number }) {
  const previous = currentPage > 1 ? buildSupportHref(currentPage - 1, filters) : null;
  const next = currentPage < totalPages ? buildSupportHref(currentPage + 1, filters) : null;
  return <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center sm:justify-between" aria-label="Support tickets pagination"><span>Showing {firstResult}–{lastResult} of {total} tickets</span><div className="flex flex-wrap gap-2"><PageControl href={previous}>Previous</PageControl>{getVisibleSupportPages(currentPage, totalPages).map((page) => <Link key={page} className={`focus-ring rounded-xl border px-3 py-2 ${page === currentPage ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-200 bg-white text-slate-700"}`} href={buildSupportHref(page, filters)} aria-current={page === currentPage ? "page" : undefined}>{page}</Link>)}<PageControl href={next}>Next</PageControl></div></nav>;
}

function PageControl({ href, children }: { href: string | null; children: React.ReactNode }) {
  return href ? <Link className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700" href={href}>{children}</Link> : <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400" aria-disabled="true">{children}</span>;
}

function getInitials(name: string | null | undefined, email: string) {
  const parts = (name || email || "Guest").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2)).toUpperCase();
}
