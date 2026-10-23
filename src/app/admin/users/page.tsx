import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { AdminIdentityTable, type IdentityRow } from "@/components/admin/AdminIdentityTable";
import { Button } from "@/components/ui/Button";
import { withOptionalDb } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminEmails } from "@/lib/env";
import { getAdminIdentityPagination } from "@/lib/adminIdentityPagination";
import { adminIdentityPageSql, escapePrismaContainsQuery, parseAdminIdentitySort, type AdminIdentityReference } from "@/lib/adminIdentityDirectory";

export const metadata = { title: "Admin Users" };
type PageProps = { searchParams?: Promise<{ q?: string; role?: string; status?: string; identity?: string; activity?: string; page?: string; sort?: string }> };
// Fixed maximum per page; shorter results show every matching identity.
const PAGE_SIZE = 100;

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await requireAdminSession("/admin/users");
  const params = await searchParams;
  const q = (params?.q || "").trim().slice(0, 120);
  const prismaQuery = escapePrismaContainsQuery(q);
  const role = ["ALL", "USER", "SUPPORT", "ADMIN"].includes(params?.role || "") ? params!.role! : "ALL";
  const status = ["ALL", "ACTIVE", "SUSPENDED", "DELETED", "PENDING_DELETION"].includes(params?.status || "") ? params!.status! : "ALL";
  const identity = ["ALL", "REGISTERED", "GUEST"].includes(params?.identity || "") ? params!.identity! : "ALL";
  const sort = parseAdminIdentitySort(params?.sort);
  // Existing bookmarked drawer URLs remain functional; only the presentation changes.
  const legacy = /^(user|guest):([a-z0-9_-]{6,80})$/i.exec(params?.activity || "");
  if (legacy) {
    const directory = new URLSearchParams({
      ...(q ? { q } : {}), role, status, identity, sort,
      ...(params?.page && /^\d{1,7}$/.test(params.page) ? { page: params.page } : {}),
    }).toString();
    redirect("/admin/users/" + legacy[1].toLowerCase() + "/" + encodeURIComponent(legacy[2])
      + "/activity?directory=" + encodeURIComponent(directory));
  }
  const where = {
    ...(q ? { OR: [{ email: { contains: prismaQuery, mode: "insensitive" as const } }, { name: { contains: prismaQuery, mode: "insensitive" as const } }, { id: { contains: prismaQuery, mode: "insensitive" as const } }] } : {}),
    ...(role !== "ALL" ? { role: role as never } : {}),
    ...(status !== "ALL" ? { status: status as never } : {}),
  };
  // The existing User model remains the authority for registered accounts.
  // Guests remain distinct records and only consent-eligible, unlinked guests are listed.
  const guestWhere = { consentStatus: "GRANTED" as const, trackingDisabledAt: null, currentUserId: null, identityLinks: { none: {} }, ...(q ? { id: { contains: prismaQuery, mode: "insensitive" as const } } : {}) };
  const showUsers = identity !== "GUEST";
  const showGuests = identity !== "REGISTERED" && role === "ALL" && status === "ALL";
  // This is a directory, not a second Overview dashboard. Count only the
  // identities needed for filtering and pagination; Overview owns the KPIs.
  const stats = await withOptionalDb(async db => {
    const [filteredUsers, filteredGuests] = await Promise.all([
      showUsers ? db.user.count({ where }) : Promise.resolve(0),
      showGuests ? db.visitor.count({ where: guestWhere }) : Promise.resolve(0),
    ]);
    return { filteredUsers, filteredGuests };
  }, { filteredUsers: 0, filteredGuests: 0 });
  const { page, count } = getAdminIdentityPagination(
    params?.page, stats.filteredUsers, stats.filteredGuests, PAGE_SIZE,
  );
  // Paginate the *combined* chronological list; do not group users before guests.
  const result = await withOptionalDb(async db => {
    const sql = adminIdentityPageSql({
      query: q, role, status, showUsers, showGuests, sort,
      limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
    });
    if (!sql) return { rows: [] as IdentityRow[] };
    const identities = await db.$queryRaw<AdminIdentityReference[]>(sql);
    const userIds = identities.filter(item => item.kind === "user").map(item => item.id);
    const guestIds = identities.filter(item => item.kind === "guest").map(item => item.id);
    const [users, guests] = await Promise.all([
      userIds.length ? db.user.findMany({
        where: { ...where, id: { in: userIds } },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      }) : Promise.resolve([]),
      guestIds.length ? db.visitor.findMany({
        where: { ...guestWhere, id: { in: guestIds } },
        select: { id: true, firstSeenAt: true, lastSeenAt: true },
      }) : Promise.resolve([]),
    ]);
    const userMap = new Map(users.map(user => [user.id, user]));
    const guestMap = new Map(guests.map(guest => [guest.id, guest]));
    const rows = identities.flatMap<IdentityRow>(identity => {
      if (identity.kind === "user") {
        const record = userMap.get(identity.id);
        return record ? [{ kind: "user" as const, record }] : [];
      }
      if (identity.kind === "guest") {
        const record = guestMap.get(identity.id);
        return record ? [{ kind: "guest" as const, record }] : [];
      }
      return [];
    });
    return { rows };
  }, { rows: [] as IdentityRow[] });
  const protectedEmails = new Set(getAdminEmails());
  const link = (nextPage: number) => "/admin/users?" + new URLSearchParams({ ...(q ? { q } : {}), role, status, identity, sort, page: String(nextPage) }).toString();
  return (
    <div className="w-full min-w-0 bg-white">
      <h1 className="sr-only">Users</h1>
      <form action="/admin/users" method="get"
        className="grid gap-3 border-b border-[#D8E1EC] pb-4 sm:grid-cols-2 lg:grid-cols-[minmax(230px,1fr)_166px_140px_166px_auto]">
          <input type="hidden" name="sort" value={sort} />
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
            <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-[#475569]" />
            <input name="q" aria-label="Search identities" maxLength={120} defaultValue={q}
              placeholder="Name, email, user ID or guest ID"
              className="focus-ring h-11 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-[#020617] placeholder:text-[#475569] transition hover:border-[#94A3B8]" />
          </div>
          <select name="identity" defaultValue={identity} aria-label="Identity type"
            className="focus-ring h-11 min-w-0 cursor-pointer rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#020617] transition hover:border-[#94A3B8]">
            <option value="ALL">All identities</option><option value="REGISTERED">Registered</option><option value="GUEST">Guests</option>
          </select>
          <select name="role" defaultValue={role} aria-label="Account role"
            className="focus-ring h-11 min-w-0 cursor-pointer rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#020617] transition hover:border-[#94A3B8]">
            <option value="ALL">All roles</option><option value="USER">User</option><option value="SUPPORT">Support</option><option value="ADMIN">Admin</option>
          </select>
          <select name="status" defaultValue={status} aria-label="Account status"
            className="focus-ring h-11 min-w-0 cursor-pointer rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#020617] transition hover:border-[#94A3B8]">
            <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="PENDING_DELETION">Pending deletion</option><option value="DELETED">Deleted</option>
          </select>
          <Button type="submit" className="h-11 whitespace-nowrap rounded-lg bg-[#004BB8] px-5 text-[13px] font-semibold hover:bg-[#004BB8]/90 sm:col-span-2 lg:col-span-1">Apply Filter</Button>
      </form>
      <AdminIdentityTable rows={result.rows} page={page} count={count} pageSize={PAGE_SIZE}
        registeredCount={stats.filteredUsers} guestCount={stats.filteredGuests}
        sort={sort} currentUserId={session.user.id} protectedEmails={[...protectedEmails]} pageHref={link(page)} />
    </div>
  );
}
