import Link from "next/link";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import type { AdminSupportPriority, AdminSupportStatus } from "@/services/adminOperationalReadContract";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Support" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Query = Record<string, string | string[] | undefined>;

const statuses: Array<{ value: AdminSupportStatus | ""; label: string }> = [
  { value: "", label: "All tickets" },
  { value: "OPEN", label: "Open" },
  { value: "WAITING_ON_TEAM", label: "Awaiting team" },
  { value: "WAITING_ON_USER", label: "Awaiting customer" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const priorities: Array<{ value: AdminSupportPriority | ""; label: string }> = [
  { value: "", label: "All priorities" },
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

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

function statusHref(raw: Query, status: AdminSupportStatus | "") {
  const params = scopedParams(raw);
  params.delete("status");
  if (status) params.set("status", status);
  const query = params.toString();
  return "/admin/support" + (query ? "?" + query : "");
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
  if (!params.has("limit")) params.set("limit", "50");
  // Preserve the current support query contract and creation-time pagination.
  // Sorting, ticket delivery and lifecycle logic belong to the later workflow phase.
  const result = await adminOperationalReads.support.list(params);
  const hasFilters = ["status", "priority", "category", "q", "from", "to"].some((key) => Boolean(one(raw[key])));

  return (
    <AdminPageShell title="Support" hideHeader>
      <div className="mx-auto w-full max-w-[1500px] text-[#374151]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E5E7EB] px-2 pb-4">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-[#111827]">Support</h1>
            <p className="mt-1 text-[12px] text-[#64748B]">Customer tickets and conversations</p>
          </div>
          <span className="text-[12px] text-[#64748B]">Ticket inbox</span>
        </div>

        <nav aria-label="Support ticket status" className="flex flex-wrap gap-2 border-b border-[#E5E7EB] px-2 py-3">
          {statuses.map((item) => {
            const active = one(raw.status) === item.value;
            return (
              <Link
                key={item.value}
                href={statusHref(raw, item.value)}
                aria-current={active ? "page" : undefined}
                className={
                  "inline-flex min-h-8 items-center rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25 " +
                  (active ? "bg-[#EEF4FF] text-[#004BB8]" : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#111827]")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form action="/admin/support" className="border-b border-[#E5E7EB] px-2 py-3">
          {one(raw.status) ? <input type="hidden" name="status" value={one(raw.status)} /> : null}
          {one(raw.from) ? <input type="hidden" name="from" value={one(raw.from)} /> : null}
          {one(raw.to) ? <input type="hidden" name="to" value={one(raw.to)} /> : null}
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <label className="block w-[270px] max-w-full flex-1">
              <span className="mb-1 block text-[11px] font-medium text-[#64748B]">Find a ticket</span>
              <input
                type="search"
                name="q"
                defaultValue={one(raw.q)}
                placeholder="Subject, name or email"
                className="h-9 w-full min-w-[180px] rounded-md border border-[#DDE3EA] bg-white px-3 text-[13px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/10"
              />
            </label>
            <label className="block w-[165px]">
              <span className="mb-1 block text-[11px] font-medium text-[#64748B]">Priority</span>
              <select
                name="priority"
                defaultValue={one(raw.priority)}
                className="h-9 w-full cursor-pointer rounded-md border border-[#DDE3EA] bg-white px-2 text-[13px] text-[#374151] outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/10"
              >
                {priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block w-[175px] max-w-full">
              <span className="mb-1 block text-[11px] font-medium text-[#64748B]">Category</span>
              <input
                type="text"
                name="category"
                defaultValue={one(raw.category)}
                placeholder="Any category"
                className="h-9 w-full rounded-md border border-[#DDE3EA] bg-white px-3 text-[13px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/10"
              />
            </label>
            <button
              type="submit"
              className="h-9 cursor-pointer rounded-md bg-[#111827] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
            >
              Apply filters
            </button>
            {hasFilters ? (
              <Link href="/admin/support" className="inline-flex h-9 items-center text-[12px] font-medium text-[#64748B] hover:text-[#004BB8]">
                Clear filters
              </Link>
            ) : null}
          </div>
        </form>

        {result.status === "ok" ? (
          result.data.items.length === 0 ? (
            <div className="border-b border-[#E5E7EB] px-2 py-10 text-center">
              <p className="text-[14px] font-semibold text-[#111827]">No support tickets found</p>
              <p className="mt-1 text-[12px] text-[#64748B]">There are no tickets matching the selected filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] text-[11px] uppercase tracking-[0.08em] text-[#6B7280]">
                      {["Ticket", "Customer", "Priority", "Status", "Messages", "Last updated", "Action"].map((label) => (
                        <th key={label} scope="col" className="px-2 py-3 font-semibold">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((ticket) => {
                      const status = statusStyle[ticket.status];
                      return (
                        <tr key={ticket.id} className="border-b border-[#E5E7EB] text-[13px] text-[#374151] hover:bg-[#FAFBFD] focus-within:bg-[#F8FAFC]">
                          <td className="max-w-[330px] px-2 py-3 align-top">
                            <Link
                              href={ticketHref(ticket.id)}
                              className="block break-words font-semibold text-[#111827] hover:text-[#004BB8] hover:underline focus-visible:outline-[#004BB8]"
                            >
                              {ticket.subject}
                            </Link>
                            <span className="mt-1 block text-[11px] text-[#64748B]">
                              {ticket.category} · Submitted {formatDateTime(new Date(ticket.createdAt))}
                            </span>
                          </td>
                          <td className="max-w-[240px] px-2 py-3 align-top">
                            <span className="block break-all font-medium text-[#374151]">{ticket.email || "—"}</span>
                            <span className="mt-1 block text-[11px] text-[#64748B]">{ticket.identity.kind === "registered" ? "Registered customer" : "Guest"}</span>
                          </td>
                          <td className={"whitespace-nowrap px-2 py-3 align-top font-semibold " + priorityStyle(ticket.priority)}>
                            {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 align-top">
                            <span className={"inline-flex items-center gap-1.5 font-medium " + status.text}>
                              <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + status.dot} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-2 py-3 align-top">{ticket.messageCount}</td>
                          <td className="whitespace-nowrap px-2 py-3 align-top">{formatDateTime(new Date(ticket.updatedAt))}</td>
                          <td className="whitespace-nowrap px-2 py-3 align-top">
                            <Link
                              href={ticketHref(ticket.id)}
                              aria-label={"View ticket: " + ticket.subject}
                              className="inline-flex items-center gap-1 font-semibold text-[#004BB8] hover:underline focus-visible:outline-[#004BB8]"
                            >
                              View ticket <span aria-hidden="true">→</span>
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
      </div>
    </AdminPageShell>
  );
}
