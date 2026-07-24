import Link from "next/link";
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
  AdminMetricCard,
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
      <AdminFilterBar action="/admin/users" className="overflow-hidden">
        <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
          Search
          <AdminInput name="q" defaultValue={filters.q} placeholder="Search by name or email" aria-label="Search" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Role
          <AdminSelect name="role" defaultValue={filters.role} aria-label="Role">
            <option value="ALL">All roles</option><option value="USER">User</option><option value="SUPPORT">Support</option><option value="ADMIN">Admin</option>
          </AdminSelect>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Status
          <AdminSelect name="status" defaultValue={filters.status} aria-label="Status">
            <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DELETED">Deleted</option>
          </AdminSelect>
        </label>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:self-end">
          <AdminButton type="submit">Filter</AdminButton>
          <AdminLinkButton href="/admin/users" variant="secondary">Clear filters</AdminLinkButton>
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
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><AdminMetricCard label="Total users" value={summary.totalUsers} /><AdminMetricCard label="Active users" value={summary.activeUsers} tone="good" /><AdminMetricCard label="Suspended users" value={summary.suspendedUsers} tone="warn" /><AdminMetricCard label="Admin & support staff" value={summary.adminSupportStaff} tone="info" /></div>;
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
    <div className="mt-4">
      <AdminDataTable
        caption="Admin users"
        minWidth="800px"
        columns={usersTableColumns}
        summary={`Showing ${firstResult}–${lastResult} of ${data.totalMatchingUsers} users`}
        footer={data.totalPages > 1 ? <Pagination currentPage={data.currentPage} totalPages={data.totalPages} filters={filters} /> : null}
        rows={sortedUsers.map((user) => {
          const isProtectedAdmin = user.email ? adminEmails.has(user.email.toLowerCase().trim()) : false;
          return {
            id: user.id,
            cells: [
              <div key="user" className="min-w-0 space-y-1">
                <p className="truncate font-semibold text-slate-950">{user.name || "Unnamed user"}</p>
                <p className="truncate text-xs font-medium text-slate-500">{user.email || "—"}</p>
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

function Pagination({ currentPage, totalPages, filters }: { currentPage: number; totalPages: number; filters: { q: string; role: UserRoleFilter; status: UserStatusFilter } }) {
  const previous = currentPage > 1 ? buildUsersPaginationHref(currentPage - 1, filters) : null;
  const next = currentPage < totalPages ? buildUsersPaginationHref(currentPage + 1, filters) : null;
  return (
    <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center sm:justify-between" aria-label="Users pagination">
      <span>Page {currentPage} of {totalPages}</span>
      <div className="flex gap-2">
        {previous ? <Link className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700" href={previous}>Previous</Link> : <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400" aria-disabled="true">Previous</span>}
        {next ? <Link className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700" href={next}>Next</Link> : <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400" aria-disabled="true">Next</span>}
      </div>
    </nav>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
