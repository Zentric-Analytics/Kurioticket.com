import {
  AdminButton,
  AdminFilterBar,
  AdminInput,
  AdminPageShell,
  AdminSelect,
  AdminDataTable,
  EmptyState,
  StatusPill,
} from "@/components/admin/AdminPageShell";
import { UserStatusActions } from "@/components/admin/UserStatusActions";
import { withOptionalDb } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminEmails } from "@/lib/env";

export const metadata = { title: "Admin Users" };

type PageProps = {
  searchParams?: Promise<{ q?: string; role?: string; status?: string }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await requireAdminSession("/admin/users");
  const params = await searchParams;
  const q = params?.q?.trim() || "";
  const requestedRole = params?.role || "ALL";
  const role = ["ALL", "USER", "SUPPORT", "ADMIN"].includes(requestedRole)
    ? requestedRole
    : "ALL";
  const status = params?.status || "ALL";
  const where = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(role !== "ALL" ? { role: role as never } : {}),
    ...(status !== "ALL" ? { status: status as never } : {}),
  };
  const users = await withOptionalDb((db) => db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  }), []);
  const adminEmails = new Set(getAdminEmails());
  const sortedUsers = [...users].sort((a, b) => {
    const aProtected = a.email
      ? adminEmails.has(a.email.toLowerCase().trim())
      : false;
    const bProtected = b.email
      ? adminEmails.has(b.email.toLowerCase().trim())
      : false;

    if (aProtected !== bProtected) {
      return aProtected ? -1 : 1;
    }

    return 0;
  });

  return (
    <AdminPageShell
      title="Users"
      description="View users, filter account status and role, and safely suspend, reactivate, or soft-delete accounts."
    >
      <AdminFilterBar action="/admin/users">
          <AdminInput
            name="q"
            defaultValue={q}
            placeholder="Search by email or name"
          />
          <AdminSelect
            name="role"
            defaultValue={role}
          >
            <option value="ALL">All roles</option>
            <option value="USER">User</option>
            <option value="SUPPORT">Support</option>
            <option value="ADMIN">Admin</option>
          </AdminSelect>
          <AdminSelect
            name="status"
            defaultValue={status}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DELETED">Deleted</option>
          </AdminSelect>
          <AdminButton type="submit">Filter</AdminButton>
      </AdminFilterBar>
      {sortedUsers.length === 0 ? (
        <div className="mt-4">
          <EmptyState message="No users match these filters." />
        </div>
      ) : (
        <div className="mt-4">
          <AdminDataTable
            caption="Admin users"
            minWidth="1080px"
            columns={["User", "Email", "Role", "Status", "Created", "Updated", { key: "actions", label: "Actions", align: "right" }]}
            rows={sortedUsers.map((user) => {
              const isProtectedAdmin = user.email
                ? adminEmails.has(user.email.toLowerCase().trim())
                : false;

              return {
                id: user.id,
                cells: [
                  <div key="user" className="min-w-0 space-y-1">
                    <p className="truncate font-semibold text-slate-950">{user.name || "Unnamed user"}</p>
                    <p className="truncate font-mono text-xs text-slate-500">{user.id}</p>
                  </div>,
                  <span key="email" className="block max-w-64 truncate">{user.email || "—"}</span>,
                  <div key="role" className="grid justify-start gap-1">
                    <StatusPill tone={user.role === "ADMIN" ? "good" : user.role === "SUPPORT" ? "info" : "neutral"}>{user.role}</StatusPill>
                    {isProtectedAdmin ? <span className="text-xs font-semibold text-slate-500">Protected admin</span> : null}
                  </div>,
                  <StatusPill key="status" tone={user.status === "ACTIVE" ? "good" : user.status === "SUSPENDED" ? "warn" : "bad"}>{user.status}</StatusPill>,
                  formatDate(user.createdAt),
                  formatDate(user.updatedAt),
                  <UserStatusActions
                    key="actions"
                    userId={user.id}
                    email={user.email}
                    role={user.role}
                    status={user.status}
                    isSelf={user.id === session.user.id}
                    isProtectedAdmin={isProtectedAdmin}
                  />,
                ],
              };
            })}
          />
        </div>
      )}
    </AdminPageShell>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
