import Link from "next/link";
import { UserRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CopyIdentityId } from "./CopyIdentityId";
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
  currentUserId,
  protectedEmails,
  pageHref,
}: Props) {
  const protectedSet = new Set(protectedEmails);
  function href(values: Record<string, string>) {
    const [path, query] = pageHref.split("?");
    const params = new URLSearchParams(query);
    for (const [key, value] of Object.entries(values)) params.set(key, value);
    return `${path}?${params}`;
  }
  const activityClass =
    "focus-ring inline-flex h-9 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-indigo-700 hover:bg-slate-50";
  const paginationClass =
    "focus-ring inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50";
  return (
    <Card
      variant="flat"
      className="mt-4 min-w-0 overflow-hidden border-slate-200 bg-white p-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4">
        <h2
          id="identity-directory-title"
          className="text-sm font-semibold text-slate-950"
        >
          Identities ({count.toLocaleString()})
        </h2>
        <span className="text-xs text-slate-500">Newest identities first</span>
      </div>
      <div
        className="overflow-x-auto"
        role="region"
        aria-labelledby="identity-directory-title"
        tabIndex={0}
      >
        <table className="w-full min-w-[920px] table-fixed text-left text-sm">
          <caption className="sr-only">
            Registered accounts and consent-eligible guest identities, newest
            first
          </caption>
          <colgroup>
            <col />
            <col className="w-[160px]" />
            <col className="w-[142px]" />
            <col className="w-[154px]" />
            <col className="w-[130px]" />
            <col className="w-[132px]" />
          </colgroup>
          <thead className="bg-slate-50/80 text-xs text-slate-500">
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
          <tbody className="divide-y divide-slate-100">
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
                  className="h-16 align-middle transition-colors hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
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
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {user ? `Registered · ${label(user.role)}` : "Guest"}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <IdentityDate
                      at={
                        row.kind === "user"
                          ? row.record.createdAt
                          : row.record.firstSeenAt
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className={activityClass}
                      href={href({ activity: `${row.kind}:${record.id}` })}
                      aria-label={`View Activity for ${name} (${record.id})`}
                    >
                      View Activity
                    </Link>
                  </td>
                  <td className="px-4 py-3">
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
        <p className="text-slate-600">
          Page {page} of {Math.max(1, Math.ceil(count / pageSize))}
          <span className="mx-2 text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-500">
            {count.toLocaleString()} matching identities
          </span>
        </p>
        <nav aria-label="Identity pagination" className="ml-auto flex gap-2">
          {page > 1 ? (
            <Link
              className={paginationClass}
              href={href({ page: String(page - 1) })}
            >
              Previous
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={`${paginationClass} opacity-40`}
            >
              Previous
            </span>
          )}
          {page * pageSize < count ? (
            <Link
              className={paginationClass}
              href={href({ page: String(page + 1) })}
            >
              Next
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={`${paginationClass} opacity-40`}
            >
              Next
            </span>
          )}
        </nav>
      </div>
    </Card>
  );
}
