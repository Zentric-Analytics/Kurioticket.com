import { AdminSelect } from "./AdminPageShell";
import { platformOptions, type PlatformSelection } from "@/lib/platformHealthPresentation";
export function ApplicationSourceSelect({ value = "ALL", name = "application", id = "platform-application" }: {
    value?: PlatformSelection;
    name?: string;
    id?: string;
}) {
    return <div data-application-filter className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600"><label htmlFor={id}>Application</label><AdminSelect id={id} name={name} defaultValue={value === "ALL" && name === "applicationSource" ? "" : value} className="min-w-0">{platformOptions.map(option => <option key={option.value} value={option.value === "ALL" && name === "applicationSource" ? "" : option.value}>{option.label}</option>)}</AdminSelect></div>;
}
export function PlatformHealthFilters({ hours, application }: {
    hours: number;
    application: PlatformSelection;
}) {
    return <form action="/admin/platform-health" method="get" aria-label="Platform health filters" className="flex flex-wrap items-end gap-3">
  <ApplicationSourceSelect value={application}/>
  <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600"><label htmlFor="platform-hours">Activity window</label><AdminSelect id="platform-hours" name="hours" defaultValue={String(hours)}><option value="24">Last 24 hours</option><option value="168">Last 7 days</option><option value="720">Last 30 days</option></AdminSelect></div>
  <button type="submit" className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-[#D8E1EC] bg-white px-4 text-[12px] font-semibold text-[#004BB8] transition-colors hover:bg-[#F4F7FB]">Apply view</button>
 </form>;
}
