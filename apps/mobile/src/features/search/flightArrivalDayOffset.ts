const LOCAL_ISO_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-](\d{2}):(\d{2}))?$/;

function localCalendarDay(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const match = LOCAL_ISO_DATETIME.exec(value.trim());
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0", offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = Number(offsetHourText ?? 0);
  const offsetMinute = Number(offsetMinuteText ?? 0);
  if (hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return null;

  // UTC is used only as timezone-independent calendar arithmetic. The captured
  // date remains the provider's local airport date; its offset is not applied.
  const calendarDay = Date.UTC(year, month - 1, day);
  const validated = new Date(calendarDay);
  if (
    validated.getUTCFullYear() !== year ||
    validated.getUTCMonth() !== month - 1 ||
    validated.getUTCDate() !== day
  ) return null;
  return calendarDay;
}

/** Returns a positive provider-local arrival day offset, otherwise null. */
export function flightArrivalDayOffset(
  departureTime: string | null | undefined,
  arrivalTime: string | null | undefined,
): number | null {
  const departureDay = localCalendarDay(departureTime);
  const arrivalDay = localCalendarDay(arrivalTime);
  if (departureDay === null || arrivalDay === null) return null;
  const difference = (arrivalDay - departureDay) / 86_400_000;
  return Number.isInteger(difference) && difference > 0 ? difference : null;
}

export function arrivalDayOffsetAccessibility(offset: number | null): string | null {
  if (offset === 1) return "arrives next day";
  return offset && offset > 1 ? `arrives ${offset} days later` : null;
}
