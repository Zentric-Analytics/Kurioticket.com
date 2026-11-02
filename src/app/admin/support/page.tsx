import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSupportToolbar } from "@/components/admin/AdminSupportToolbar";
import { supportCategoryLabel } from "@/lib/adminSupportInboxNavigation";
import { formatDateTime } from "@/lib/admin-data";
import type { AdminSupportPriority, AdminSupportStatus } from "@/services/adminOperationalReadContract";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Support" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Query = Record<string, string | string[] | undefined>;

const statusStyle: Record<AdminSupportStatus, { label: string; dot: string; text: string }> = {
  OPEN: { label: "Open", dot: "bg-amber-400", text: "text-[#6B4A10]" },
  WAITING_ON_TEAM: { label: "Awaiting team", dot: "bg-orange-400", text: "text-[#92400E]" },
  WAITING_ON_USER: { label: "Awaiting customer", dot: "bg-[#004BB8]", text: "text-[#004BB8]" },
  RESOLVED: { label: "Resolved", dot: "bg-emerald-500", text: "text-emerald-700" },
  CLOSED: { label: "Closed", dot: "bg-slate-400", text: "text-[#64748B]" },
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function scopedParams(raw: Query) {
  const params = new URLSearchParams();
  for (const key of ["status", "priority", "category", "q", "from", "to", "limit"] as const) {
    const value = one(raw[key]);
    if (value) params.set(key, value);
  }
  return params;
}

function cursorHref(raw: Query, cursor: string) {
  const params = scopedParams(raw);
  params.set("cursor", cursor);
  params.set("limit", one(raw.limit) || "50");
  return "/admin/support?" + params.toString();
}

function ticketHref(id: string) {
  return "/admin/support/" + encodeURIComponent(id);
}

function priorityStyle(priority: AdminSupportPriority) {
  if (priority === "URGENT") return "text-rose-700";
  if (priority === "HIGH") return "text-amber-700";
  return "text-[#475569]";
}

export default async function AdminSupportPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = scopedParams(raw);
  // Forward the continuation cursor only to the ticket read. Status tabs and
  // filter submissions use scopedParams without cursor, so they start at page one.
  if (one(raw.cursor)) params.set("cursor", one(raw.cursor));
  if (!params.has("limit")) params.set("limit", "50");
  // Preserve the current support query contract and creation-time pagination.
  // Sorting, ticket delivery and lifecycle logic belong to the later workflow phase.
  const result = await adminOperationalReads.support.list(params);
  const toolbarQuery = scopedParams(raw).toString();
  const pageHref = "/admin/support" + (toolbarQuery ? "?" + toolbarQuery : "");

  return (
    <AdminPageShell title="Support" hideHeader>
      <div className="mx-auto w-full max-w-[1500px] text-[#374151]">
        <AdminSupportToolbar query={one(raw.q)} status={one(raw.status)} priority={one(raw.priority)} category={one(raw.category)} pageHref={pageHref}>
        {result.status === "ok" ? (
          result.data.items.length === 0 ? (
            <div className="border-b border-[#E5E7EB] px-2 py-10 text-center">
              <p className="text-[14px] font-semibold text-[#111827]">No support tickets found</p>
              <p className="mt-1 text-[12px] text-[#64748B]">There are no tickets matching the selected filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] table-fixed text-left text-[13px]">
                  <colgroup><col className="w-[28%]" /><col className="w-[21%]" /><col className="w-[10%]" /><col className="w-[14%]" /><col className="w-[8%]" /><col className="w-[10%]" /><col className="w-[9%]" /></colgroup>
                  <thead className="border-b border-[#D8E1EC] bg-white text-[12px] text-[#475569]">
                    <tr>
                      {["Ticket", "Customer", "Priority", "Status", "Messages", "Last updated", "Action"].map((label) => (
                        <th key={label} scope="col" className="px-3 py-3 font-medium">{label.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7ECF5]">
                    {result.data.items.map((ticket) => {
                      const status = statusStyle[ticket.status];
                      return (
                        <tr key={ticket.id} className="group h-[64px] align-middle text-[13px] text-[#374151] transition-colors hover:bg-[#F8FAFC] focus-within:bg-[#F8FAFC]">
                          <td className="max-w-[330px] px-3 py-1.5 align-middle">
                            <Link
                              href={ticketHref(ticket.id)}
                              className="block break-words font-semibold text-[#111827] hover:text-[#004BB8] hover:underline focus-visible:outline-[#004BB8]"
                            >
                              {ticket.subject}
                            </Link>
                            <span className="mt-1 block text-[11px] text-[#64748B]">
                              {supportCategoryLabel(ticket.category)} · Submitted {formatDateTime(new Date(ticket.createdAt))}
                            </span>
                          </td>
                          <td className="max-w-[240px] px-3 py-1.5 align-middle">
                            <span className="block break-all font-medium text-[#374151]">{ticket.email || "—"}</span>
                            <span className="mt-1 block text-[11px] text-[#64748B]">{ticket.identity.kind === "registered" ? "Registered customer" : "Guest"}</span>
                          </td>
                          <td className={"whitespace-nowrap px-3 py-1.5 align-middle font-semibold " + priorityStyle(ticket.priority)}>
                            {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-1.5 align-middle">
                            <span className={"inline-flex items-center gap-1.5 font-medium " + status.text}>
                              <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + status.dot} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 align-middle">{ticket.messageCount}</td>
                          <td className="whitespace-nowrap px-3 py-1.5 align-middle">{formatDateTime(new Date(ticket.updatedAt))}</td>
                          <td className="whitespace-nowrap px-3 py-1.5 align-middle">
                            <Link
                              href={ticketHref(ticket.id)}
                              aria-label={"View ticket: " + ticket.subject}
                              className="focus-ring inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-sm px-0.5 text-[13px] font-medium text-[#004BB8] underline-offset-4 transition-colors hover:underline"
                            >
                              View ticket <ChevronRight size={15} aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {result.data.nextCursor ? (
                <div className="flex justify-end border-b border-[#E5E7EB] px-2 py-3">
                  <Link
                    href={cursorHref(raw, result.data.nextCursor)}
                    className="text-[13px] font-semibold text-[#004BB8] hover:underline focus-visible:outline-[#004BB8]"
                  >
                    Next page
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : (
          <div className="border-b border-[#E5E7EB] px-2 py-10 text-center">
            <p className="text-[14px] font-semibold text-[#111827]">
              {result.status === "invalid" ? "Invalid support filters" : result.status === "forbidden" ? "Admin access required" : "Support data unavailable"}
            </p>
            <p className="mt-1 text-[12px] text-[#64748B]">
              {"issues" in result ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "Unable to read tickets. This is not an empty inbox."}
            </p>
          </div>
        )}
        </AdminSupportToolbar>
      </div>
    </AdminPageShell>
  );
}
