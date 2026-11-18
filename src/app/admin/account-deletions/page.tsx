import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Account Deletions" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type RawFilters = Record<string, string | string[] | undefined>;

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "READY_FOR_REVIEW", label: "Ready for review" },
  { value: "CANCELLED", label: "Cancelled / reactivated" },
  { value: "COMPLETED", label: "Completed" },
] as const;

const statusPresentation: Record<string, { label: string; dot: string; text: string }> = {
  PENDING: { label: "Pending", dot: "bg-amber-400", text: "text-[#6B4A10]" },
  READY_FOR_REVIEW: { label: "Ready for review", dot: "bg-orange-500", text: "text-[#92400E]" },
  CANCELLED: { label: "Cancelled", dot: "bg-slate-400", text: "text-[#64748B]" },
  COMPLETED: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-700" },
};

export default async function AdminAccountDeletionsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = toParams(raw);
  if (!params.has("limit")) params.set("limit", "50");
  const result = await adminOperationalReads.deletions.list(params);

  return (
    <AdminPageShell title="Account deletion requests" hideHeader>
      <section aria-label="Account deletion requests" className="mx-auto w-full max-w-[1500px] min-w-0 text-[#374151]">
        <form action="/admin/account-deletions" method="get" role="search"
          aria-label="Filter account deletion requests"
          className="min-w-0">
          <div className="relative pb-3">
            <Search aria-hidden="true" size={17}
              className="pointer-events-none absolute left-3.5 top-3.5 text-[#64748B]" />
            <label htmlFor="admin-deletion-search" className="sr-only">Search deletion requests by email or account name</label>
            <input id="admin-deletion-search" name="q" type="search"
              autoComplete="off" maxLength={160} defaultValue={one(raw.q)}
              placeholder="Search by email or account name"
              className="h-11 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-[#374151] outline-none placeholder:text-[#64748B] transition-colors hover:border-[#94A3B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" />
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-start gap-3 border-b border-[#D8E1EC] pb-2 sm:justify-end">
            <AdminDirectorySelect name="status" label="Request status" value={one(raw.status)}
              options={statusOptions} plain align="end" />
            <button type="submit"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#003D97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
              Apply filters
            </button>
          </div>
        </form>

        {result.status === "ok" ? (
          result.data.items.length === 0 ? (
            <QueueState title="No deletion requests" message="No account deletion requests match the selected filters." />
          ) : (
            <>
              <div className="admin-responsive-records min-w-0 overflow-x-auto" role="region" aria-label="Account deletion request records" tabIndex={0}>
                <table className="w-full min-w-[1080px] table-fixed text-left text-[13px]">
                  <caption className="sr-only">Account deletion requests, lifecycle dates, linked references and management actions</caption>
                  <colgroup>
                    <col className="w-[23%]" />
                    <col className="w-[14%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                    <col className="w-[15%]" />
                    <col className="w-[14%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead className="border-b border-[#D8E1EC] bg-white text-[12px] text-[#475569]">
                    <tr>
                      {["Account", "Request status", "Requested", "Scheduled", "Resolution", "References / notes", "Action"].map(label => (
                        <th key={label} scope="col" className="px-3 py-3 font-medium uppercase">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7ECF5]">
                    {result.data.items.map(request => {
                      const status = statusPresentation[request.status] ?? {
                        label: request.status.replaceAll("_", " "),
                        dot: "bg-slate-400",
                        text: "text-[#475569]",
                      };
                      const accountEmail = request.email || request.user.email || "—";
                      return (
                        <tr key={request.id}
                          className="group min-h-[64px] align-middle text-[13px] transition-colors hover:bg-[#F8FAFC] focus-within:bg-[#F8FAFC]">
                          <td data-label="Account" className="min-w-0 px-3 py-3 align-middle">
                            <Link href={"/admin/account-deletions/" + request.id}
                              className="block break-words font-semibold text-[#111827] hover:text-[#004BB8] hover:underline focus-visible:outline-[#004BB8]">
                              {accountEmail}
                            </Link>
                            <p className="mt-1 break-words text-[12px] text-[#64748B]">{request.user.name || request.userId}</p>
                            <p className="mt-0.5 text-[11px] text-[#64748B]">{request.user.role} · {request.user.status}</p>
                          </td>
                          <td data-label="Request status" className="px-3 py-3 align-middle">
                            <span className={"inline-flex items-center gap-1.5 font-medium " + status.text}>
                              <span aria-hidden="true" className={"h-1.5 w-1.5 shrink-0 rounded-full " + status.dot} />
                              {status.label}
                            </span>
                          </td>
                          <td data-label="Requested" className="px-3 py-3 align-middle text-[12px] leading-5 tabular-nums text-[#475569]">
                            {formatDateTime(new Date(request.requestedAt))}
                          </td>
                          <td data-label="Scheduled" className="px-3 py-3 align-middle text-[12px] leading-5 tabular-nums text-[#475569]">
                            {formatDateTime(new Date(request.deletionScheduledAt))}
                          </td>
                          <td data-label="Resolution" className="px-3 py-3 align-middle text-[12px] leading-5 tabular-nums">
                            {request.cancelledAt ? (
                              <p><span className="block text-[#64748B]">Cancelled</span>{formatDateTime(new Date(request.cancelledAt))}</p>
                            ) : null}
                            {request.completedAt ? (
                              <p className={request.cancelledAt ? "mt-2" : ""}>
                                <span className="block text-[#64748B]">Completed</span>{formatDateTime(new Date(request.completedAt))}
                              </p>
                            ) : null}
                            {!request.cancelledAt && !request.completedAt ? "—" : null}
                          </td>
                          <td data-label="References / notes" className="min-w-0 px-3 py-3 align-middle text-[12px] leading-5 text-[#475569]">
                            <p className="truncate" title={request.supportTicketId || undefined}>
                              <span className="text-[#64748B]">Ticket: </span>{request.supportTicketId || "—"}
                            </p>
                            <p className="truncate" title={request.adminReference || undefined}>
                              <span className="text-[#64748B]">Admin: </span>{request.adminReference || "—"}
                            </p>
                            <p><span className="text-[#64748B]">Review notes: </span>{request.hasReviewNotes ? "Recorded" : "—"}</p>
                          </td>
                          <td data-label="Action" className="whitespace-nowrap px-3 py-3 align-middle">
                            <Link href={"/admin/account-deletions/" + request.id}
                              aria-label={"View deletion request for " + accountEmail}
                              className="inline-flex h-9 items-center gap-1 whitespace-nowrap text-[13px] font-medium text-[#004BB8] underline-offset-4 hover:underline focus-visible:outline-[#004BB8]">
                              View <ChevronRight size={15} aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {result.data.nextCursor ? (
                <nav aria-label="Deletion request pagination"
                  className="flex justify-end border-b border-[#E7ECF5] px-3 py-3">
                  <Link href={cursorHref(raw, result.data.nextCursor)}
                    className="text-[13px] font-medium text-[#004BB8] hover:underline focus-visible:outline-[#004BB8]">
                    Next page
                  </Link>
                </nav>
              ) : null}
            </>
          )
        ) : (
          <QueueState
            title={result.status === "invalid" ? "Invalid deletion filters" : result.status === "forbidden" ? "Admin access required" : "Deletion queue unavailable"}
            message={"issues" in result ? result.issues.map(issue => issue.field + ": " + issue.message).join(" ") : "The deletion reader could not return queue data. An unavailable read is not shown as an empty queue."}
          />
        )}
      </section>
    </AdminPageShell>
  );
}

function QueueState({ title, message }: { title: string; message: string }) {
  return (
    <div className="border-b border-[#E5E7EB] px-2 py-10 text-center">
      <p className="text-[14px] font-semibold text-[#111827]">{title}</p>
      <p className="mt-1 text-[12px] text-[#64748B]">{message}</p>
    </div>
  );
}

function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function toParams(raw: RawFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  return params;
}
function cursorHref(raw: RawFilters, cursor: string) {
  const params = toParams(raw);
  params.set("cursor", cursor);
  params.set("limit", one(raw.limit) || "50");
  return "/admin/account-deletions?" + params.toString();
}
