import Link from "next/link";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { CopyIdentityId } from "./CopyIdentityId";
import { AdminIdentitySort } from "./AdminIdentitySort";
import type { AdminIdentitySort as IdentitySort } from "@/lib/adminIdentityDirectory";

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
  identity: "ALL" | "REGISTERED" | "GUEST";
  pageSize: number;
  sort: IdentitySort;
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
      <span className="mt-0.5 block text-[12px] font-normal text-[#64748B]">
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
  identity,
  pageSize,
  sort,
  pageHref,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  function href(values: Record<string, string>) {
    const [path, query] = pageHref.split("?");
    const params = new URLSearchParams(query);
    for (const [key, value] of Object.entries(values)) params.set(key, value);
    return `${path}?${params}`;
  }
  const activityClass =
    "focus-ring inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-sm px-0.5 text-[13px] font-medium text-[#004BB8] underline-offset-4 transition-colors hover:underline";
  const directory = pageHref.split("?")[1] || "";
  const activityHref = (kind: "guest" | "user", id: string) =>
    "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity" +
    (directory ? "?directory=" + encodeURIComponent(directory) : "");
  const paginationClass =
    "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8E1EC] bg-white text-[#0F172A] transition hover:border-[#94A3B8] hover:bg-[#F8FAFC]";
  return (
    <section className="mt-3 min-w-0 bg-white">
      <h2 id="identity-directory-title" className="sr-only">Users directory</h2>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-[#D8E1EC]">
        <nav aria-label="User types" className="flex min-w-0 max-w-full items-center gap-5 overflow-x-auto">
          {([
            { value: "ALL", label: "All", total: registeredCount + guestCount },
            { value: "REGISTERED", label: "Registered", total: registeredCount },
            { value: "GUEST", label: "Guests", total: guestCount },
          ] as const).map((tab) => (
            <Link
              key={tab.value}
              href={href({ identity: tab.value, page: "1" })}
              aria-current={identity === tab.value ? "page" : undefined}
              className={`focus-ring inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] font-normal text-[#020617] ${identity === tab.value ? "border-[#004BB8]" : "border-transparent"}`}
            >
              {tab.label} ({tab.total.toLocaleString()})
            </Link>
          ))}
        </nav>
        <div className="shrink-0 pb-1"><AdminIdentitySort sort={sort} pageHref={pageHref} /></div>
      </div>
      <div
        className="focus-ring overflow-x-auto"
        role="region"
        aria-labelledby="identity-directory-title"
        tabIndex={0}
      >
        <table className="w-full min-w-[900px] table-fixed text-left text-[13px]">
          <caption className="sr-only">
            Registered accounts and consent-eligible guest identities, sorted by {sort.replaceAll("_", " ")}
          </caption>
          <colgroup>
            <col className="w-[40%]" />
            <col className="w-[17%]" />
            <col className="w-[13%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="border-b border-[#D8E1EC] bg-white text-[12px] text-[#475569]">
            <tr>
              {[
                "Identity",
                "Type",
                "Status",
                "Joined / First Seen",
                "Activity",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-3 py-3 font-medium"
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
              return (
                <tr
                  key={`${row.kind}:${record.id}`}
                  className="group h-[64px] align-middle transition-colors hover:bg-[#F8FAFC]"
                >
                  <td className="px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[12px] font-medium text-[#334155]"
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
                        <p className="truncate text-[13px] font-semibold leading-5 text-[#020617]" title={name}>
                          {name}
                        </p>
                        <div className="flex min-w-0 items-center gap-1">
                          <span
                            className="min-w-0 truncate text-[12px] font-normal text-[#64748B]"
                            title={secondary}
                            aria-label={row.kind === "guest" ? `Guest ID: ${record.id}` : undefined}
                          >
                            {secondary}
                          </span>
                          <CopyIdentityId id={record.id} kind={row.kind} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-[13px] font-normal text-[#334155]">
                    {user ? `Registered · ${label(user.role)}` : "Guest"}
                  </td>
                  <td className="px-3 py-1.5">
                    {user ? (
                      <span className={`text-[13px] font-medium ${
                        user.status === "ACTIVE" ? "text-[#047857]"
                        : user.status === "SUSPENDED" || user.status === "PENDING_DELETION" ? "text-[#92400E]"
                        : "text-[#475569]"
                      }`}>
                        {label(user.status)}
                      </span>
                    ) : (
                      <span aria-label="No account status for guest visitor" className="text-[13px] text-[#64748B]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <IdentityDate
                      at={
                        row.kind === "user"
                          ? row.record.createdAt
                          : row.record.firstSeenAt
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Link
                      className={activityClass}
                      href={activityHref(row.kind, record.id)}
                      aria-label={`View Activity for ${name} (${record.id})`}
                    >
                      View Activity
                      <ChevronRight size={15} aria-hidden="true" />
                    </Link>
                  </td>

                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-[13px] text-[#475569]"
                >
                  No users match these filters.
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
