import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, UserRound, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
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
      className="block whitespace-nowrap text-sm text-slate-700"
    >
      {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(at)}
      <span className="mt-0.5 block text-xs text-slate-500">
        {new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(at)}
      </span>
    </time>
  );
}

export function AdminIdentityTable({
  rows,
  page,
  count,
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
    "focus-ring inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 text-xs font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-50";
  const directory = pageHref.split("?")[1] || "";
  const activityHref = (kind: "guest" | "user", id: string) =>
    "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity" +
    (directory ? "?directory=" + encodeURIComponent(directory) : "");
  const paginationClass =
    "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-100";
  return (
    <Card
      variant="flat"
      className="mt-4 min-w-0 overflow-hidden border-slate-200 bg-white p-0 shadow-[0_16px_44px_-34px_rgba(2,28,43,0.34)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
            <UsersRound size={18} />
          </span>
          <h2 id="identity-directory-title" className="text-base font-semibold tracking-tight text-slate-950">
            Identities ({count.toLocaleString()})
          </h2>
        </div>
        <AdminIdentitySort sort={sort} pageHref={pageHref} />
      </div>
      <div
        className="overflow-x-auto"
        role="region"
        aria-labelledby="identity-directory-title"
        tabIndex={0}
      >
        <table className="w-full min-w-[920px] table-fixed text-left text-sm">
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
          <thead className="border-b border-slate-200 bg-slate-50/90 text-xs text-slate-600">
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
                  className="px-5 py-3.5 font-semibold tracking-wide"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90">
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
                  className="group h-[68px] align-middle transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700"
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
                          className="truncate font-semibold text-slate-950"
                          title={name}
                        >
                          {name}
                        </p>
                        <p
                          className={`mt-0.5 truncate text-xs text-slate-500 ${user ? "" : "font-mono"}`}
                          title={secondary}
                        >
                          {secondary}
                        </p>
                      </div>
                      <CopyIdentityId id={record.id} kind={row.kind} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs font-medium text-slate-600">
                    {user ? `Registered · ${label(user.role)}` : "Guest"}
                  </td>
                  <td className="px-5 py-3">
                    {user ? (
                      <span
                        className={`inline-flex max-w-full rounded-md px-2 py-1 text-xs font-medium ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : user.status === "SUSPENDED" || user.status === "PENDING_DELETION" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                      >
                        {label(user.status)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Not an account
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <IdentityDate
                      at={
                        row.kind === "user"
                          ? row.record.createdAt
                          : row.record.firstSeenAt
                      }
                    />
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      className={activityClass}
                      href={activityHref(row.kind, record.id)}
                      aria-label={`View Activity for ${name} (${record.id})`}
                    >
                      View Activity
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                  <td className="px-5 py-3">
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
                        className="text-slate-400"
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
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  No identities match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/50 px-5 py-3 sm:px-6">
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 opacity-60">
              <ChevronLeft size={17} aria-hidden="true" />
            </span>
          )}
          <span className="min-w-16 text-center text-sm font-semibold tabular-nums text-slate-700">
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 opacity-60">
              <ChevronRight size={17} aria-hidden="true" />
            </span>
          )}
        </nav>
      </div>
    </Card>
  );
}
