import Link from "next/link";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Support" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
const statuses = [
  { value: "", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "WAITING_ON_USER", label: "Waiting on user" },
  { value: "WAITING_ON_TEAM", label: "Waiting on team" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];
const priorities = [
  { value: "", label: "All priorities" },
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];
function toParams(raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach(item => params.append(key, item));
    else if (value) params.set(key, value);
  }
  return params;
}
function cursorHref(raw: Record<string, string | string[] | undefined>, cursor: string) {
  const params = toParams(raw);
  params.set("cursor", cursor);
  params.set("limit", one(raw.limit) || "50");
  return "/admin/support?" + params.toString();
}

export default async function AdminSupportPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = toParams(raw);
  if (!params.has("limit")) params.set("limit", "50");
  const result = await adminOperationalReads.support.list(params);

  return (
    <AdminPageShell title="Support" hideHeader>
      <div className="mx-auto w-full max-w-[1500px] text-[#374151]">
        <form action="/admin/support" className="border-y border-[#E5E7EB]">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-2 py-3">
            <label className="block w-[230px] max-w-full">
              <span className="sr-only">Search tickets</span>
              <input name="q" defaultValue={one(raw.q)} placeholder="Email, name or subject"
                className="h-9 w-full border-0 border-b border-[#AEB8C6] bg-transparent px-0 text-[13px] text-[#374151] outline-none placeholder:text-[#9CA3AF] focus:border-[#004BB8]" />
            </label>
            <div className="w-[155px]"><SearchMonitorSelect name="status" value={one(raw.status)} label="Status" appearance="plain" options={statuses} /></div>
            <div className="w-[155px]"><SearchMonitorSelect name="priority" value={one(raw.priority)} label="Priority" appearance="plain" options={priorities} /></div>
            <label className="block w-[150px] max-w-full">
              <span className="sr-only">Category</span>
              <input name="category" defaultValue={one(raw.category)} placeholder="Category"
                className="h-9 w-full border-0 border-b border-[#AEB8C6] bg-transparent px-0 text-[13px] text-[#374151] outline-none placeholder:text-[#9CA3AF] focus:border-[#004BB8]" />
            </label>
            <button type="submit" className="h-9 w-[146px] cursor-pointer bg-[#111827] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200">Apply filters</button>
            <Link href="/admin/support" className="inline-flex h-9 items-center text-[13px] font-medium text-[#475569] hover:text-[#004BB8]">Clear</Link>
          </div>
        </form>
        {result.status === "ok" ? result.data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead><tr className="border-b border-[#E5E7EB] text-[11px] uppercase tracking-[0.08em] text-[#6B7280]">
                  {["Last activity", "Subject", "Customer", "Category", "Priority", "Status", "Messages"].map(label =>
                    <th key={label} className="px-2 py-3 font-semibold">{label}</th>)}
                </tr></thead>
                <tbody>
                  {result.data.items.map(ticket => (
                    <tr key={ticket.id} className="relative border-b border-[#E5E7EB] text-[13px] text-[#374151] hover:bg-[#FAFAFA] focus-within:bg-[#F8FAFC]">
                      <td className="whitespace-nowrap px-2 py-3">
                        <Link href={"/admin/support/" + encodeURIComponent(ticket.id)} className="font-semibold text-[#111827] hover:text-[#004BB8] hover:underline focus-visible:outline-[#004BB8]">{formatDateTime(new Date(ticket.updatedAt))}</Link>
                      </td>
                      <td className="max-w-[270px] px-2 py-3 font-semibold text-[#111827]">{ticket.subject}</td>
                      <td className="px-2 py-3"><span className="block">{ticket.email || "—"}</span><span className="text-[11px] text-[#6B7280]">{ticket.identity.kind === "registered" ? "Registered" : "Guest"}</span></td>
                      <td className="px-2 py-3">{ticket.category}</td>
                      <td className="px-2 py-3"><span className={ticket.priority === "URGENT" ? "font-semibold text-rose-700" : ticket.priority === "HIGH" ? "font-semibold text-amber-700" : ""}>{ticket.priority}</span></td>
                      <td className="whitespace-nowrap px-2 py-3"><span className="inline-flex items-center gap-1.5 font-medium"><span className={"h-1.5 w-1.5 rounded-full " + (ticket.status === "OPEN" || ticket.status === "WAITING_ON_TEAM" ? "bg-amber-400" : ticket.status === "CLOSED" || ticket.status === "RESOLVED" ? "bg-emerald-500" : "bg-[#004BB8]")} />{ticket.status.replaceAll("_", " ").toLowerCase()}</span></td>
                      <td className="px-2 py-3">{ticket.messageCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.data.nextCursor ? <div className="flex justify-end border-b border-[#E5E7EB] py-3"><Link href={cursorHref(raw, result.data.nextCursor)} className="text-[13px] font-semibold text-[#004BB8] hover:underline">Next page</Link></div> : null}
          </>
        ) : <div className="border-b border-[#E5E7EB] py-10 text-center"><p className="text-[14px] font-semibold text-[#111827]">No support tickets</p><p className="mt-1 text-[12px] text-[#6B7280]">No recorded tickets match these filters.</p></div>
        : <div className="border-b border-[#E5E7EB] py-10 text-center"><p className="text-[14px] font-semibold text-[#111827]">{result.status === "invalid" ? "Check the filters" : result.status === "forbidden" ? "Admin access required" : "Support data unavailable"}</p><p className="mt-1 text-[12px] text-[#6B7280]">The support reader could not return this data. An unavailable read is not zero tickets.</p></div>}
      </div>
    </AdminPageShell>
  );
}
