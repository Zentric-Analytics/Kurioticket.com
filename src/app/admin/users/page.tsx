import {
  AdminPageShell,
  EmptyState,
  StatusPill,
} from "@/components/admin/AdminPageShell";
import { UserStatusActions } from "@/components/admin/UserStatusActions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getPrisma } from "@/lib/prisma";
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
  const users = await getPrisma().user.findMany({
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
  });
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
      <Card className="p-4">
        <form
          className="grid gap-3 md:grid-cols-[1fr_160px_180px_auto]"
          action="/admin/users"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by email or name"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <select
            name="role"
            defaultValue={role}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="ALL">All roles</option>
            <option value="USER">User</option>
            <option value="SUPPORT">Support</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DELETED">Deleted</option>
          </select>
          <Button type="submit">Filter</Button>
        </form>
      </Card>
      {sortedUsers.length === 0 ? (
        <div className="mt-4">
          <EmptyState message="No users match these filters." />
        </div>
      ) : (
        <Card className="mt-4 overflow-x-auto p-0">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="p-3">User ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => {
                const isProtectedAdmin = user.email
                  ? adminEmails.has(user.email.toLowerCase().trim())
                  : false;

                return (
                  <tr
                    key={user.id}
                    className="border-t border-border align-top"
                  >
                    <td className="p-3 font-mono text-xs text-muted">
                      {user.id}
                    </td>
                    <td className="p-3 font-semibold text-navy">
                      {user.name || "—"}
                    </td>
                    <td className="p-3">{user.email || "—"}</td>
                    <td className="p-3">
                      <div className="grid gap-1">
                        <StatusPill
                          tone={user.role === "ADMIN" ? "good" : "neutral"}
                        >
                          {user.role}
                        </StatusPill>
                        {isProtectedAdmin ? (
                          <span className="text-xs font-semibold text-muted">
                            Protected admin
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3">
                      <StatusPill
                        tone={
                          user.status === "ACTIVE"
                            ? "good"
                            : user.status === "SUSPENDED"
                              ? "warn"
                              : "bad"
                        }
                      >
                        {user.status}
                      </StatusPill>
                    </td>
                    <td className="p-3">{formatDate(user.createdAt)}</td>
                    <td className="p-3">{formatDate(user.updatedAt)}</td>
                    <td className="p-3">
                      <UserStatusActions
                        userId={user.id}
                        email={user.email}
                        role={user.role}
                        status={user.status}
                        isSelf={user.id === session.user.id}
                        isProtectedAdmin={isProtectedAdmin}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
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
