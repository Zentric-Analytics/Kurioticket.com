import { AdminOperationalDateRangeFields } from "./AdminOperationalDateRangeFields";
import type { JourneyDateRange } from "@/lib/adminJourneyDateRange";

export function JourneyDateRangeFields({ initialRange, initialFrom, initialTo, now, timeZone }: {
  initialRange: JourneyDateRange; initialFrom: string; initialTo: string; now: string; timeZone: string;
}) {
  return <AdminOperationalDateRangeFields initialRange={initialRange} initialFrom={initialFrom} initialTo={initialTo}
    now={now} timeZone={timeZone} testId="journey-date-range" customTestId="journey-custom-date-fields" align="end"
    legacyOptions={initialRange === "24h" ? [{ value: "24h", label: "Last 24 hrs (legacy)" }]
      : initialRange === "90d" ? [{ value: "90d", label: "Last 90 days (legacy)" }]
      : []} />;
}
