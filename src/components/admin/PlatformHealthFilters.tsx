import { AdminSelect } from "./AdminPageShell";
import { platformOptions, type PlatformSelection } from "@/lib/platformHealthPresentation";

export function ApplicationSourceSelect({ value = "ALL", name = "application", id = "platform-application" }: {
  value?: PlatformSelection;
  name?: string;
  id?: string;
}) {
  return (
    <div data-application-filter className="grid min-w-0 gap-1.5 text-xs font-medium text-[#475569]">
      <label htmlFor={id}>Application</label>
      <AdminSelect id={id} name={name} defaultValue={value === "ALL" && name === "applicationSource" ? "" : value}
        className="h-10 min-w-0 rounded-lg border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#334155]">
        {platformOptions.map(option => <option key={option.value} value={option.value === "ALL" && name === "applicationSource" ? "" : option.value}>{option.label}</option>)}
      </AdminSelect>
    </div>
  );
}

export function PlatformHealthFilters({ hours, application }: {
  hours: number;
  application: PlatformSelection;
}) {
  return (
    <form action="/admin/platform-health" method="get" aria-label="Platform health filters"
      className="grid min-w-0 grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(0,185px)_minmax(0,185px)_auto] lg:justify-start">
      <ApplicationSourceSelect value={application} />
      <div className="grid min-w-0 gap-1.5 text-xs font-medium text-[#475569]">
        <label htmlFor="platform-hours">Activity window</label>
        <AdminSelect id="platform-hours" name="hours" defaultValue={String(hours)}
          className="h-10 min-w-0 rounded-lg border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#334155]">
          <option value="24">Last 24 hours</option>
          <option value="168">Last 7 days</option>
          <option value="720">Last 30 days</option>
        </AdminSelect>
      </div>
      <button type="submit"
        className="focus-ring inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#003D97]">
        Apply view
      </button>
    </form>
  );
}
