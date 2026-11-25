import { formatViewerTimestamp } from "@/lib/adminLocalTime";

/** The title retains the canonical instant for auditing. */
export function AdminLocalTimestamp({ value, timeZone, referenceNow }: {
  value: string;
  timeZone: string;
  referenceNow?: string;
}) {
  return <time dateTime={value} title={new Date(value).toISOString()}>
    {formatViewerTimestamp(value, timeZone, referenceNow)}
  </time>;
}
