import type { RecordedGuestLocation } from "@/lib/guestAccessObservation";

/** Dated evidence, deliberately distinguished from live presence. */
export function AdminRecordedGuestLocation({ location, timeZone }: {
  location?: RecordedGuestLocation | null; timeZone: string;
}) {
  const format = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
  });
  return <p data-testid="recorded-guest-location" className="mt-0.5 min-w-0 break-words text-[12px] leading-4 text-[#475569]">
    <span className="font-medium">Last recorded location: </span>
    <span>{location?.label ?? "Unavailable"}</span>
    {location ? <> · <time dateTime={location.at.toISOString()}>{format.format(location.at)}</time></> : null}
  </p>;
}
