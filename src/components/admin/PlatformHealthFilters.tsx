import { AdminButton, AdminSelect } from "./AdminPageShell";
import { platformOptions, type PlatformSelection } from "@/lib/platformHealthPresentation";
export function ApplicationSourceSelect({ value = "ALL", name = "application", id = "platform-application" }: {
    value?: PlatformSelection;
    name?: string;
    id?: string;
}) {
    return <label htmlFor={id} className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">Application<AdminSelect id={id} name={name} defaultValue={value === "ALL" && name === "applicationSource" ? "" : value} className="min-w-0">{platformOptions.map(option => <option key={option.value} value={option.value === "ALL" && name === "applicationSource" ? "" : option.value}>{option.label}</option>)}</AdminSelect></label>;
}
export function PlatformHealthFilters({ hours, application }: {
    hours: number;
    application: PlatformSelection;
}) {
    return <form action="/admin/platform-health" method="get" aria-label="Platform health filters" className="flex flex-col gap-3 sm:flex-row sm:items-end">
  <ApplicationSourceSelect value={application}/>
  <label htmlFor="platform-hours" className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">Activity window<AdminSelect id="platform-hours" name="hours" defaultValue={String(hours)}><option value="24">Last 24 hours</option><option value="168">Last 7 days</option><option value="720">Last 30 days</option></AdminSelect></label>
  <AdminButton type="submit" className="sm:self-end">Apply view</AdminButton>
 </form>;
}
