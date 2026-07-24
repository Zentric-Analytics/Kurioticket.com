import Link from "next/link";
import { Plus, Search } from "lucide-react";
import {
  AdminButton,
  AdminFilterBar,
  AdminInput,
  AdminPageShell,
  AdminSelect,
  AdminDataTable,
  AdminDataErrorState,
  AdminEmptyState,
  AdminLinkButton,
  StatusPill,
} from "@/components/admin/AdminPageShell";
import { UserStatusActions } from "@/components/admin/UserStatusActions";
import { getPrisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminEmails } from "@/lib/env";

import {
  buildUserWhere,
  buildUsersPaginationHref,
  clampUserPage,
  parseUserSearchParams,
  USER_PAGE_SIZE,
  type UserRoleFilter,
  type UserSearchParams,
  type UserStatusFilter,
  usersTableColumns,
} from "./page-data";

export const metadata = { title: "Admin Users" };

type PageProps = { searchParams?: Promise<UserSearchParams> };

type UserSummaryCounts = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  adminSupportStaff: number;
};

type LoadedUsersData = {
  users: Array<{ id: string; name: string | null; email: string | null; role: string; status: string; createdAt: Date }>;
  totalMatchingUsers: number;
  summary: UserSummaryCounts;
  currentPage: number;
  totalPages: number;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await requireAdminSession("/admin/users");
  const params = await searchParams;
  const filters = parseUserSearchParams(params);
  const where = buildUserWhere(filters);

  let data: LoadedUsersData | null = null;

  try {
    const db = getPrisma();
    const [totalMatchingUsers, totalUsers, activeUsers, suspendedUsers, adminSupportStaff] = await Promise.all([
      db.user.count({ where }),
      db.user.count(),
      db.user.count({ where: { status: "ACTIVE" } }),
      db.user.count({ where: { status: "SUSPENDED" } }),
      db.user.count({ where: { role: { in: ["ADMIN", "SUPPORT"] } } }),
    ]);
    const { currentPage, totalPages } = clampUserPage(filters.page, totalMatchingUsers);
    const users = totalMatchingUsers === 0
      ? []
      : await db.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (currentPage - 1) * USER_PAGE_SIZE,
          take: USER_PAGE_SIZE,
          select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
        });
    data = { users, totalMatchingUsers, summary: { totalUsers, activeUsers, suspendedUsers, adminSupportStaff }, currentPage, totalPages };
  } catch (error) {
    console.error("[admin-users:data]", error);
  }

  return (
    <AdminPageShell title="Users" description="View users, filter account status and role, and safely suspend, reactivate, or soft-delete accounts.">
      {data ? <UsersSummary summary={data.summary} /> : null}
      <AdminFilterBar action="/admin/users" className="overflow-visible p-3">
        <label className="relative md:col-span-2">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <AdminInput name="q" defaultValue={filters.q} placeholder="Search users..." aria-label="Search users" className="pl-9" />
        </label>
        <label>
          <span className="sr-only">Role</span>
          <AdminSelect name="role" defaultValue={filters.role} aria-label="Role">
            <option value="ALL">All roles</option><option value="USER">User</option><option value="SUPPORT">Support</option><option value="ADMIN">Admin</option>
          </AdminSelect>
        </label>
        <label>
          <span className="sr-only">Status</span>
          <AdminSelect name="status" defaultValue={filters.status} aria-label="Status">
            <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DELETED">Deleted</option>
          </AdminSelect>
        </label>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <AdminButton type="submit">Filter</AdminButton>
          <AdminLinkButton href="/admin/users" variant="ghost">Clear filters</AdminLinkButton>
        </div>
        <div className="md:ml-auto">
          <AdminButton type="button" variant="secondary" disabled title="Coming soon" className="w-full md:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Invite User · Coming soon
          </AdminButton>
        </div>
      </AdminFilterBar>
      {!data ? (
        <AdminDataErrorState title="Users could not be loaded." message="Refresh the page or check the database connection." />
      ) : data.users.length === 0 ? (
        <div className="mt-4">
          <AdminEmptyState message={data.summary.totalUsers === 0 ? "No users have been created yet." : "No users match these filters."} action={data.summary.totalUsers === 0 ? undefined : <AdminLinkButton href="/admin/users">Clear filters</AdminLinkButton>} />
        </div>
      ) : <UsersTable data={data} sessionUserId={session.user.id} filters={filters} />}
    </AdminPageShell>
  );
}

function UsersSummary({ summary }: { summary: UserSummaryCounts }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <CompactUserStat label="Total users" value={summary.totalUsers} />
      <CompactUserStat label="Active users" value={summary.activeUsers} tone="good" />
      <CompactUserStat label="Suspended users" value={summary.suspendedUsers} tone="warn" />
      <CompactUserStat label="Admin & support staff" value={summary.adminSupportStaff} tone="info" />
    </div>
  );
}

function CompactUserStat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "good" | "warn" | "info" | "neutral" }) {
  const dotClass = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    info: "bg-[#004BB8]",
    neutral: "bg-slate-300",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      </div>
      <p className="mt-1 text-xl font-extrabold leading-7 text-slate-950">{value}</p>
    </div>
  );
}

function UsersTable({ data, sessionUserId, filters }: { data: LoadedUsersData; sessionUserId: string; filters: ReturnType<typeof parseUserSearchParams> }) {
  // Protected admin priority is preserved for ADMIN_EMAILS without rendering duplicate Protected admin text.
  const adminEmails = new Set(getAdminEmails());
  const sortedUsers = [...data.users].sort((a, b) => {
    const aProtected = a.email ? adminEmails.has(a.email.toLowerCase().trim()) : false;
    const bProtected = b.email ? adminEmails.has(b.email.toLowerCase().trim()) : false;
    if (aProtected !== bProtected) return aProtected ? -1 : 1;
    return 0;
  });
  const firstResult = (data.currentPage - 1) * USER_PAGE_SIZE + 1;
  const lastResult = Math.min(data.currentPage * USER_PAGE_SIZE, data.totalMatchingUsers);

  return (
    <div className="mt-3">
      <AdminDataTable
        caption="Admin users"
        minWidth="800px"
        columns={usersTableColumns}
        summary={`Showing ${firstResult}–${lastResult} of ${data.totalMatchingUsers} users`}
        footer={<Pagination currentPage={data.currentPage} totalPages={data.totalPages} filters={filters} firstResult={firstResult} lastResult={lastResult} totalMatchingUsers={data.totalMatchingUsers} />}
        rows={sortedUsers.map((user) => {
          const isProtectedAdmin = user.email ? adminEmails.has(user.email.toLowerCase().trim()) : false;
          return {
            id: user.id,
            cells: [
              <div key="user" className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F7FA] text-xs font-black text-[#004BB8] ring-1 ring-[#DDE7F0]">{getUserInitials(user.name, user.email)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-950">{user.name || "Unnamed user"}</span>
                  <span className="block truncate text-xs font-medium text-slate-500">{user.email || "—"}</span>
                </span>
              </div>,
              <StatusPill key="role" tone={user.role === "ADMIN" ? "good" : user.role === "SUPPORT" ? "info" : "neutral"}>{user.role}</StatusPill>,
              <StatusPill key="status" tone={user.status === "ACTIVE" ? "good" : user.status === "SUSPENDED" ? "warn" : "bad"}>{user.status}</StatusPill>,
              formatDate(user.createdAt),
              <UserStatusActions key="actions" userId={user.id} email={user.email} role={user.role} status={user.status} isSelf={user.id === sessionUserId} isProtectedAdmin={isProtectedAdmin} />,
            ],
          };
        })}
      />
    </div>
  );
}

function Pagination({ currentPage, totalPages, filters, firstResult, lastResult, totalMatchingUsers }: { currentPage: number; totalPages: number; filters: { q: string; role: UserRoleFilter; status: UserStatusFilter }; firstResult: number; lastResult: number; totalMatchingUsers: number }) {
  const previous = currentPage > 1 ? buildUsersPaginationHref(currentPage - 1, filters) : null;
  const next = currentPage < totalPages ? buildUsersPaginationHref(currentPage + 1, filters) : null;
  const pageNumbers = getVisiblePageNumbers(currentPage, totalPages);
  return (
    <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center sm:justify-between" aria-label="Users pagination">
      <span>Showing {firstResult}–{lastResult} of {totalMatchingUsers} users</span>
      <div className="flex flex-wrap gap-2">
        {previous ? <Link className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700" href={previous}>Previous</Link> : <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400" aria-disabled="true">Previous</span>}
        {pageNumbers.map((page) => (
          <Link key={page} className={`focus-ring rounded-xl border px-3 py-2 ${page === currentPage ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-200 bg-white text-slate-700"}`} href={buildUsersPaginationHref(page, filters)} aria-current={page === currentPage ? "page" : undefined}>{page}</Link>
        ))}
        {next ? <Link className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700" href={next}>Next</Link> : <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400" aria-disabled="true">Next</span>}
      </div>
    </nav>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getUserInitials(name: string | null, email: string | null) {
  const source = (name || email || "User").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  return Array.from({ length: Math.min(3, totalPages) }, (_, index) => start + index);
}
