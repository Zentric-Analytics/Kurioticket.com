import Link from "next/link";
import { ChevronRight, UserRound } from "lucide-react";
import { CopyIdentityId } from "./CopyIdentityId";
import { AdminRecordedGuestLocation } from "./AdminRecordedGuestLocation";
import type { RecordedGuestLocation } from "@/lib/guestAccessObservation";
import type { AdminIdentitySort as IdentitySort, GuestDirectoryStatus } from "@/lib/adminIdentityDirectory";
import { adminUsersActivityHref } from "@/lib/adminUsersNavigation";

export type IdentityRow =
  | {
      kind: "user";
      lastSeenAt?: Date | null;
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
      guestStatus?: GuestDirectoryStatus;
      guestSource?: "visitor" | "operational";
      lastRecordedLocation?: RecordedGuestLocation | null;
      lastSeenAt?: Date | null;
      record: { id: string; firstSeenAt: Date; lastSeenAt: Date };
    };

type Props = {
  rows: IdentityRow[];
  sort: IdentitySort;
  pageHref: string;
  timeZone?: string;
};

const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (char) => char.toUpperCase());
function IdentityDate({ at, timeZone }: { at: Date; timeZone: string }) {
  return (
    <time
      dateTime={at.toISOString()}
      className="block whitespace-nowrap text-[13px] font-medium text-[#020617]"
    >
      {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone }).format(at)}
      <span className="mt-0.5 block text-[12px] font-normal text-[#64748B]">
        {new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone }).format(at)}
      </span>
    </time>
  );
}

export function AdminIdentityTable({
  rows,
  sort,
  pageHref,
  timeZone = "UTC",
}: Props) {
  function href(values: Record<string, string>) {
    const [path, query] = pageHref.split("?");
    const params = new URLSearchParams(query);
    for (const [key, value] of Object.entries(values)) params.set(key, value);
    return `${path}?${params}`;
  }
  const activityClass =
    "focus-ring inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-sm px-0.5 text-[13px] font-medium text-[#004BB8] underline-offset-4 transition-colors hover:underline";
  const directory = pageHref.split("?")[1] || "";
  const active = new URLSearchParams(directory);
  const hasSearch = Boolean(active.get("q"));
  const currentTab = active.get("tab") || active.get("identity") || "ALL";
  const activityHref = (kind: "guest" | "user", id: string) =>
    adminUsersActivityHref(kind, id, pageHref)
    ?? "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity?range=all";
  return (
    <section className="mt-3 min-w-0 bg-white">
      <h2 id="identity-directory-title" className="sr-only">Users directory</h2>
      <div
        className="admin-responsive-records focus-ring overflow-x-auto"
        role="region"
        aria-labelledby="identity-directory-title"
        tabIndex={0}
      >
        <table className="w-full min-w-[1080px] table-fixed text-left text-[13px]">
          <caption className="sr-only">
            Registered accounts and consent-eligible guest identities, sorted by {sort === "newest" ? "latest recorded activity" : sort.replaceAll("_", " ")}
          </caption>
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[17%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="border-b border-[#D8E1EC] bg-white text-[12px] text-[#475569]">
            <tr>
              {[
                "Identity",
                "Type",
                "Status",
                "Joined / First Seen",
                "Last Seen",
                "Activity",
              ].map((heading) => (
                <th
                  key={heading.toUpperCase()}
                  scope="col"
                  className="px-3 py-3 font-medium"
                >
                  {heading.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7ECF5]">
            {rows.map((row) => {
              const record = row.record;
              const lastSeen = row.lastSeenAt ?? (row.kind === "guest" ? row.record.lastSeenAt : null);
              const user = row.kind === "user" ? row.record : null;
              const name = user ? user.name || "Unnamed user" : "Guest visitor";
              const secondary = user
                ? user.email || "No email recorded"
                : record.id;
              return (
                <tr
                  key={`${row.kind}:${record.id}`}
                  data-users-refresh-anchor={`${row.kind}:${record.id}`}
                  className="group h-[64px] align-middle transition-colors hover:bg-[#F8FAFC]"
                >
                  <td data-label="Identity" className="px-3 py-1.5">
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
                        {row.kind === "guest" ? <AdminRecordedGuestLocation location={row.lastRecordedLocation} timeZone={timeZone}/> : null}
                      </div>
                    </div>
                  </td>
                  <td data-label="Type" className="px-3 py-1.5 text-[13px] font-normal text-[#334155]">
                    {user ? `Registered · ${label(user.role)}` : "Guest"}
                  </td>
                  <td data-label="Status" className="px-3 py-1.5">
                    {user ? (
                      <span className={`text-[13px] font-medium ${
                        user.status === "ACTIVE" ? "text-[#047857]"
                        : user.status === "SUSPENDED" || user.status === "PENDING_DELETION" ? "text-[#92400E]"
                        : "text-[#475569]"
                      }`}>
                        {label(user.status)}
                      </span>
                    ) : (
                      <span data-testid="guest-directory-status"
                        title={row.kind === "guest" && row.guestStatus === "ACTIVE"
                          ? row.guestSource === "visitor" ? "Eligible consented guest identity; not live presence" : "Recorded session has not expired; not live presence"
                          : row.kind === "guest" && row.guestStatus === "INACTIVE" ? "Recorded session has expired"
                          : "No verified session expiry is recorded"}
                        className={`text-[13px] font-medium ${row.kind === "guest" && row.guestStatus === "ACTIVE" ? "text-[#047857]" : "text-[#64748B]"}`}>
                        {label(row.kind === "guest" ? row.guestStatus ?? "UNAVAILABLE" : "UNAVAILABLE")}
                      </span>
                    )}
                  </td>
                  <td data-label="Joined / First Seen" className="px-3 py-1.5">
                    <IdentityDate timeZone={timeZone}
                      at={
                        row.kind === "user"
                          ? row.record.createdAt
                          : row.record.firstSeenAt
                      }
                    />
                  </td>
                  <td data-label="Last Seen" className="px-3 py-1.5">
                    {lastSeen
                      ? <IdentityDate timeZone={timeZone} at={lastSeen} />
                      : <span aria-label="No recorded last seen" className="text-[13px] text-[#64748B]">—</span>}
                  </td>
                  <td data-label="Activity" className="px-3 py-1.5">
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
                <td data-empty-row data-label="Identity"
                  colSpan={6}
                  className="px-4 py-12 text-center text-[13px] text-[#475569]"
                >
                  <p className="font-medium text-foreground">No users match your filters</p>
                  <div className="mt-2 flex items-center justify-center gap-4">
                    {hasSearch ? <Link href={href({ q: "" })}
                      className="focus-ring rounded-sm font-medium text-blue hover:underline">Clear search</Link> : null}
                    {!hasSearch && currentTab !== "ALL"
                      ? <Link href={href({ tab: "ALL" })}
                        className="focus-ring rounded-sm font-medium text-blue hover:underline">View all users</Link>
                      : null}
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
