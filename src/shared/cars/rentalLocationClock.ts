export type RentalLocationClock = {
  date: string;
  time: string;
  timeZone: string;
};

const two = (value: string | undefined) => value?.padStart(2, "0") ?? "";

export function getRentalLocationClock(
  now: Date,
  timeZone: string | null | undefined,
): RentalLocationClock | null {
  const zone = timeZone?.trim();
  if (!zone) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    const year = value("year");
    const month = two(value("month"));
    const day = two(value("day"));
    const hour = two(value("hour"));
    const minute = two(value("minute"));
    if (!year || !month || !day || !hour || !minute) return null;
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
      timeZone: zone,
    };
  } catch {
    return null;
  }
}

export function locationTargetTimeZone(
  serialized: string | null | undefined,
): string | undefined {
  const value = serialized?.trim();
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as { timeZone?: unknown };
    return typeof parsed?.timeZone === "string" && parsed.timeZone.trim()
      ? parsed.timeZone.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

export function pickupHasPassedAtClock(
  pickupDate: string,
  pickupTime: string,
  clock: Pick<RentalLocationClock, "date" | "time">,
) {
  return (
    pickupDate < clock.date ||
    (pickupDate === clock.date && pickupTime <= clock.time)
  );
}
