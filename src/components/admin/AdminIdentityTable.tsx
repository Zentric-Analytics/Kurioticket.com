import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { CopyIdentityId } from "./CopyIdentityId";
import { AdminIdentitySort } from "./AdminIdentitySort";
import type { AdminIdentitySort as IdentitySort } from "@/lib/adminIdentityDirectory";
import { UserStatusActions } from "./UserStatusActions";

export type IdentityRow =
  | {
      kind: "user";
      record: {
        id: string;
        name: string | null;
        email: string | null;
        role: string;
        status: string;
        createdAt: Date;
      };
    }
  | {
      kind: "guest";
      record: { id: string; firstSeenAt: Date; lastSeenAt: Date };
    };

type Props = {
  rows: IdentityRow[];
  page: number;
  count: number;
  registeredCount: number;
  guestCount: number;
  pageSize: number;
  sort: IdentitySort;
  currentUserId: string;
  protectedEmails: string[];
  pageHref: string;
};

const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (char) => char.toUpperCase());
function IdentityDate({ at }: { at: Date }) {
  return (
    <time
      dateTime={at.toISOString()}
      className="block whitespace-nowrap text-[13px] font-medium text-[#020617]"
    >
      {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(at)}
      <span className="mt-0.5 block text-[12px] font-normal text-[#475569]">
        {new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(at)}
      </span>
    </time>
  );
}

export function AdminIdentityTable({
  rows,
  page,
  count,
  registeredCount,
  guestCount,
  pageSize,
  sort,
  currentUserId,
  protectedEmails,
  pageHref,
}: Props) {
  const protectedSet = new Set(protectedEmails);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  function href(values: Record<string, string>) {
    const [path, query] = pageHref.split("?");
    const params = new URLSearchParams(query);
    for (const [key, value] of Object.entries(values)) params.set(key, value);
    return `${path}?${params}`;
  }
  const activityClass =
    "focus-ring inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D8E1EC] bg-white px-3 text-[12px] font-semibold text-[#004BB8] transition hover:border-[#004BB8]/40 hover:bg-[#F8FAFC]";
  const directory = pageHref.split("?")[1] || "";
  const activityHref = (kind: "guest" | "user", id: string) =>
    "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity" +
    (directory ? "?directory=" + encodeURIComponent(directory) : "");
  const paginationClass =
    "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8E1EC] bg-white text-[#0F172A] transition hover:border-[#94A3B8] hover:bg-[#F8FAFC]";
  return (
    <section aria-labelledby="identity-directory-title" className="mt-5 min-w-0 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8E1EC] pb-3">
        <div className="min-w-0">
          <h2 id="identity-directory-title" className="text-[16px] font-semibold leading-6 tracking-tight text-[#020617]">
            Users: {count.toLocaleString()}
          </h2>
          <p className="mt-0.5 text-[13px] leading-5 text-[#475569]">
            {registeredCount.toLocaleString()} registered · {guestCount.toLocaleString()} guest
          </p>
        </div>
        <AdminIdentitySort sort={sort} pageHref={pageHref} />
      </div>
      <div
        className="focus-ring overflow-x-auto"
        role="region"
        aria-labelledby="identity-directory-title"
        tabIndex={0}
      >
        <table className="w-full min-w-[920px] table-fixed text-left text-[13px]">
          <caption className="sr-only">
            Registered accounts and consent-eligible guest identities, sorted by {sort.replaceAll("_", " ")}
          </caption>
          <colgroup>
            <col />
            <col className="w-[160px]" />
            <col className="w-[142px]" />
            <col className="w-[154px]" />
            <col className="w-[130px]" />
            <col className="w-[132px]" />
          </colgroup>
          <thead className="border-b border-[#D8E1EC] bg-white text-[12px] text-[#475569]">
            <tr>
              {[
                "Identity",
                "Type",
                "Status",
                "Joined / First Seen",
                "Activity",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-3 font-semibold"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7ECF5]">
            {rows.map((row) => {
              const record = row.record;
              const user = row.kind === "user" ? row.record : null;
              const name = user ? user.name || "Unnamed user" : "Guest visitor";
              const secondary = user
                ? user.email || "No email recorded"
                : record.id;
              const isProtectedAdmin = Boolean(
                user?.email &&
                  protectedSet.has(user.email.toLowerCase().trim()),
              );
              return (
                <tr
                  key={`${row.kind}:${record.id}`}
                  className="group h-[64px] align-middle transition-colors hover:bg-[#F8FAFC]"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[12px] font-semibold text-[#0F172A]"
                      >
                        {user?.name?.trim() ? (
                          user.name
                            .trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()
                        ) : (
                          <UserRound size={17} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-[13px] font-semibold text-[#020617]"
                          title={name}
                        >
                          {name}
                        </p>
                        <p
                          className="mt-0.5 truncate text-[12px] leading-[17px] text-[#475569]"
                          title={secondary}
                        >
                          {secondary}
                        </p>
                      </div>
                      <CopyIdentityId id={record.id} kind={row.kind} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] font-medium text-[#475569]">
                    {user ? `Registered · ${label(user.role)}` : "Guest"}
                  </td>
                  <td className="px-4 py-2.5">
                    {user ? (
                      <span
                        className={`inline-flex max-w-full rounded-md px-2 py-1 text-[12px] font-medium ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : user.status === "SUSPENDED" || user.status === "PENDING_DELETION" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-[#475569]"}`}
                      >
                        {label(user.status)}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#475569]">
                        Not an account
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <IdentityDate
                      at={
                        row.kind === "user"
                          ? row.record.createdAt
                          : row.record.firstSeenAt
                      }
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      className={activityClass}
                      href={activityHref(row.kind, record.id)}
                      aria-label={`View Activity for ${name} (${record.id})`}
                    >
                      View Activity
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {user ? (
                      <UserStatusActions
                        userId={user.id}
                        email={user.email}
                        role={user.role}
                        status={user.status}
                        isSelf={user.id === currentUserId}
                        isProtectedAdmin={isProtectedAdmin}
                      />
                    ) : (
                      <span
                        aria-label="No account actions for guests"
                        className="text-[#64748B]"
                      >
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-[13px] text-[#475569]"
                >
                  No identities match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end border-t border-[#D8E1EC] bg-white py-3">
        <nav aria-label="Identity pagination" className="ml-auto flex items-center gap-3">
          {page > 1 ? (
            <Link
              aria-label="Previous page"
              title="Previous page"
              className={paginationClass}
              href={href({ page: String(page - 1) })}
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </Link>
          ) : (
            <span aria-label="Previous page unavailable" aria-disabled="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8E1EC] bg-white text-[#94A3B8] opacity-70">
              <ChevronLeft size={17} aria-hidden="true" />
            </span>
          )}
          <span className="min-w-16 text-center text-[13px] font-medium tabular-nums text-[#020617]">
            Pg{page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              aria-label="Next page"
              title="Next page"
              className={paginationClass}
              href={href({ page: String(page + 1) })}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          ) : (
            <span aria-label="Next page unavailable" aria-disabled="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8E1EC] bg-white text-[#94A3B8] opacity-70">
              <ChevronRight size={17} aria-hidden="true" />
            </span>
          )}
        </nav>
      </div>
    </section>
  );
}
