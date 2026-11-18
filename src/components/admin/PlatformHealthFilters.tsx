import { ChevronDown } from "lucide-react";
import { AdminSelect } from "./AdminPageShell";
import { platformOptions, type PlatformSelection } from "@/lib/platformHealthPresentation";

const filterSelectClass = "h-10 w-full min-w-0 appearance-none rounded-lg border border-[#D8E1EC] bg-white py-2 pl-3 pr-10 text-[13px] font-medium leading-5 text-[#334155] shadow-sm transition-colors hover:border-[#AEBED1] focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/15";

export function ApplicationSourceSelect({ value = "ALL", name = "application", id = "platform-application" }: {
  value?: PlatformSelection;
  name?: string;
  id?: string;
}) {
  return (
    <div data-application-filter className="grid min-w-0 gap-1.5 text-[12px] font-medium text-[#475569]">
      <label htmlFor={id}>Application</label>
      <div className="relative min-w-0">
        <AdminSelect id={id} name={name} defaultValue={value === "ALL" && name === "applicationSource" ? "" : value}
          className={filterSelectClass}>
          {platformOptions.map(option => <option key={option.value} value={option.value === "ALL" && name === "applicationSource" ? "" : option.value}>{option.label}</option>)}
        </AdminSelect>
        <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
      </div>
    </div>
  );
}

export function PlatformHealthFilters({ hours, application }: {
  hours: number;
  application: PlatformSelection;
}) {
  return (
    <form action="/admin/platform-health" method="get" aria-label="Platform health filters"
      className="grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,190px)_minmax(0,190px)_auto] lg:justify-start">
      <ApplicationSourceSelect value={application} />
      <div className="grid min-w-0 gap-1.5 text-[12px] font-medium text-[#475569]">
        <label htmlFor="platform-hours">Activity window</label>
        <div className="relative min-w-0">
          <AdminSelect id="platform-hours" name="hours" defaultValue={String(hours)} className={filterSelectClass}>
            <option value="24">Last 24 hours</option>
            <option value="168">Last 7 days</option>
            <option value="720">Last 30 days</option>
          </AdminSelect>
          <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
        </div>
      </div>
      <button type="submit"
        className="focus-ring inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#003D97] sm:col-span-2 lg:col-span-1 lg:w-auto">
        Apply view
      </button>
    </form>
  );
}
