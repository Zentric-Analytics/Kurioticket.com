import Link from "next/link";
import { AdminPageShell, StatusPill } from "@/components/admin/AdminPageShell";
import { IdentityActivityPanel } from "@/components/admin/IdentityActivityPanel";
import { UserStatusActions } from "@/components/admin/UserStatusActions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { withOptionalDb } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminEmails } from "@/lib/env";
import { getAdminIdentityPagination } from "@/lib/adminIdentityPagination";

export const metadata = { title: "Admin Users" };
type PageProps = { searchParams?: Promise<{ q?: string; role?: string; status?: string; identity?: string; activity?: string; page?: string }> };
const date = (at: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(at);
const PAGE_SIZE = 15;

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await requireAdminSession("/admin/users");
  const params = await searchParams;
  const q = (params?.q || "").trim().slice(0, 120);
  const role = ["ALL", "USER", "SUPPORT", "ADMIN"].includes(params?.role || "") ? params!.role! : "ALL";
  const status = ["ALL", "ACTIVE", "SUSPENDED", "DELETED", "PENDING_DELETION"].includes(params?.status || "") ? params!.status! : "ALL";
  const identity = ["ALL", "REGISTERED", "GUEST"].includes(params?.identity || "") ? params!.identity! : "ALL";
  const where = {
    ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }, { id: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(role !== "ALL" ? { role: role as never } : {}),
    ...(status !== "ALL" ? { status: status as never } : {}),
  };
  // The existing User model remains the authority for registered accounts.
  // Guests remain distinct records and only consent-eligible, unlinked guests are listed.
  const guestWhere = { consentStatus: "GRANTED" as const, trackingDisabledAt: null, currentUserId: null, identityLinks: { none: {} }, ...(q ? { id: { contains: q, mode: "insensitive" as const } } : {}) };
  const showUsers = identity !== "GUEST";
  const showGuests = identity !== "REGISTERED" && role === "ALL" && status === "ALL";
  const stats = await withOptionalDb(async db => {
    const [totalUsers, activeUsers, suspendedUsers, guests, filteredUsers, filteredGuests] = await Promise.all([
      db.user.count(), db.user.count({ where: { status: "ACTIVE" } }), db.user.count({ where: { status: "SUSPENDED" } }),
      db.visitor.count({ where: { consentStatus: "GRANTED", trackingDisabledAt: null, currentUserId: null, identityLinks: { none: {} } } }),
      showUsers ? db.user.count({ where }) : Promise.resolve(0),
      showGuests ? db.visitor.count({ where: guestWhere }) : Promise.resolve(0),
    ]);
    return { totalUsers, activeUsers, suspendedUsers, guests, filteredUsers, filteredGuests };
  }, { totalUsers: 0, activeUsers: 0, suspendedUsers: 0, guests: 0, filteredUsers: 0, filteredGuests: 0 });
  const { page, count, userOffset, guestOffset, userTake, guestsTake } = getAdminIdentityPagination(
    params?.page, stats.filteredUsers, stats.filteredGuests, PAGE_SIZE,
  );
  const result = await withOptionalDb(async db => {
    const [users, guests] = await Promise.all([
      showUsers && userTake ? db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: userOffset, take: userTake, select: { id: true, name: true, email: true, role: true, status: true, createdAt: true } }) : Promise.resolve([]),
      showGuests && guestsTake ? db.visitor.findMany({ where: guestWhere, orderBy: { firstSeenAt: "desc" }, skip: guestOffset, take: guestsTake, select: { id: true, firstSeenAt: true, lastSeenAt: true } }) : Promise.resolve([]),
    ]);
    return { users, guests };
  }, { users: [], guests: [] });
  const protectedEmails = new Set(getAdminEmails());
  const link = (nextPage: number) => "/admin/users?" + new URLSearchParams({ ...(q ? { q } : {}), role, status, identity, page: String(nextPage) }).toString();
  return (
    <AdminPageShell title="Users" description="Review registered accounts and consent-eligible guest identities. Open recorded activity without changing account controls.">
      <div className="grid gap-3 md:grid-cols-3">
        {[["Registered users", stats.totalUsers], ["Active accounts", stats.activeUsers], ["Guest identities", stats.guests]].map(([label, value]) => <Card key={String(label)} className="p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{Number(value).toLocaleString()}</p></Card>)}
      </div>
      <Card className="mt-4 p-4">
        <form action="/admin/users" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_140px_150px_auto]">
          <input name="q" defaultValue={q} placeholder="Name, email, user ID or guest ID" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          <select name="identity" defaultValue={identity} aria-label="Identity type" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="ALL">All identities</option><option value="REGISTERED">Registered</option><option value="GUEST">Guests</option></select>
          <select name="role" defaultValue={role} aria-label="Account role" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="ALL">All roles</option><option value="USER">User</option><option value="SUPPORT">Support</option><option value="ADMIN">Admin</option></select>
          <select name="status" defaultValue={status} aria-label="Account status" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="PENDING_DELETION">Pending deletion</option><option value="DELETED">Deleted</option></select>
          <Button type="submit">Filter</Button>
        </form>
      </Card>
      <Card className="mt-4 overflow-hidden p-0">
        <div className="flex justify-between border-b border-slate-100 px-4 py-3"><h2 className="font-semibold text-slate-950">Identities ({count.toLocaleString()})</h2><span className="text-xs text-slate-500">Guest identities are not registered accounts</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] table-fixed text-left text-[13px]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="w-[18%] p-3">Identity</th><th className="w-[12%] p-3">Type</th><th className="w-[22%] p-3">Email / Guest ID</th><th className="w-[10%] p-3">Status</th><th className="w-[16%] p-3">Joined / First seen</th><th className="w-[10%] p-3">View</th><th className="w-[12%] p-3">Account actions</th></tr></thead>
            <tbody>
              {result.users.map(user => {
                const isProtectedAdmin = Boolean(user.email && protectedEmails.has(user.email.toLowerCase().trim()));
                return <tr key={user.id} className="border-t border-slate-100 align-middle">
                  <td className="p-3"><p className="truncate font-semibold text-slate-950" title={user.name || "Unnamed user"}>{user.name || "Unnamed user"}</p><p className="mt-1 max-w-[190px] truncate font-mono text-xs text-slate-500" title={user.id}>{user.id}</p></td>
                  <td className="p-3"><span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-xs">Registered · {user.role}</span></td>
                  <td className="p-3 text-slate-700"><span className="block truncate" title={user.email || undefined}>{user.email || "—"}</span></td>
                  <td className="p-3"><StatusPill tone={user.status === "ACTIVE" ? "good" : user.status === "SUSPENDED" ? "warn" : "bad"}>{user.status}</StatusPill></td>
                  <td className="whitespace-nowrap p-3 text-slate-600">{date(user.createdAt)}</td>
                  <td className="whitespace-nowrap p-3"><Link className="inline-flex whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-slate-50" href={link(page) + "&activity=user:" + user.id}>View Activity</Link></td>
                  <td className="whitespace-nowrap p-3"><UserStatusActions userId={user.id} email={user.email} role={user.role} status={user.status} isSelf={user.id === session.user.id} isProtectedAdmin={isProtectedAdmin} /></td>
                </tr>;
              })}
              {result.guests.map(guest => <tr key={guest.id} className="border-t border-slate-100 align-middle"><td className="p-3 font-semibold">Guest visitor</td><td className="p-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs">Guest</span></td><td className="max-w-[280px] truncate p-3 font-mono text-xs text-slate-500" title={guest.id}>{guest.id}</td><td className="p-3 text-slate-500">Anonymous</td><td className="whitespace-nowrap p-3 text-slate-600">{date(guest.firstSeenAt)}</td><td className="p-3"><Link className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-slate-50" href={link(page) + "&activity=guest:" + guest.id}>View Activity</Link></td><td className="p-3 text-xs text-slate-500">Not an account</td></tr>)}
              {!result.users.length && !result.guests.length ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">No identities match these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm"><span className="text-slate-500">Page {page} of {Math.max(1, Math.ceil(count / PAGE_SIZE))}</span><div className="flex gap-2">{page > 1 ? <Link className="rounded-lg border px-3 py-2" href={link(page - 1)}>Previous</Link> : null}{page * PAGE_SIZE < count ? <Link className="rounded-lg border px-3 py-2" href={link(page + 1)}>Next</Link> : null}</div></div>
      </Card>
      {params?.activity ? <IdentityActivityPanel selection={params.activity} /> : null}
    </AdminPageShell>
  );
}
