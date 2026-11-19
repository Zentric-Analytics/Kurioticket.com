import { AdminDirectorySelect } from "./AdminDirectorySelect";
import { platformOptions, type PlatformSelection } from "@/lib/platformHealthPresentation";

export function ApplicationSourceSelect({ value = "ALL", name = "application", id = "platform-application" }: {
  value?: PlatformSelection;
  name?: string;
  id?: string;
}) {
  return (
    <div data-application-filter className="grid min-w-0 gap-1.5">
      <span id={id + "-label"} className="text-[12px] font-medium text-[#475569]">Application</span>
      <AdminDirectorySelect
        label="Application"
        name={name}
        value={value === "ALL" && name === "applicationSource" ? "" : value}
        options={platformOptions.map(option => ({
          value: option.value === "ALL" && name === "applicationSource" ? "" : option.value,
          label: option.label,
        }))}
        compact attached
      />
    </div>
  );
}

export function PlatformHealthFilters({ hours, period, application }: {
  hours: number;
  period: "today" | "rolling";
  application: PlatformSelection;
}) {
  return (
    <form action="/admin/platform-health" method="get" aria-label="Platform health filters"
      className="grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,190px)_minmax(0,190px)_auto] lg:justify-start">
      <ApplicationSourceSelect value={application} />
      <div className="grid min-w-0 gap-1.5">
        <span className="text-[12px] font-medium text-[#475569]">Activity window</span>
        <AdminDirectorySelect
          label="Activity window"
          name="period"
          value={period === "today" ? "today" : String(hours)}
          options={[
            { value: "today", label: "Today" },
            { value: "168", label: "Last 7 days" },
            ...(period === "rolling" && hours === 24 ? [{ value: "24", label: "Last 24 hrs (legacy)" }] : []),
            { value: "720", label: "Last 30 days" },
          ]}
          compact attached
        />
      </div>
      <button type="submit"
        className="focus-ring inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#003D97] sm:col-span-2 lg:col-span-1 lg:w-auto">
        Apply view
      </button>
    </form>
  );
}
