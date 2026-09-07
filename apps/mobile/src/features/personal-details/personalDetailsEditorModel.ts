import { personalDetailsLatestDateOfBirth } from "./personalDetailsModel";

export type DateDraft = { year: string; month: string; day: string };
export type NameDraft = { firstName: string; lastName: string };

// The existing profile API stores one full name. Keep every word when opening
// legacy names; editing either box must not discard compound family names.
export function splitProfileName(fullName?: string | null): NameDraft {
  const [firstName = "", ...rest] = (fullName || "").trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

export function joinProfileName(name: NameDraft): string {
  return [name.firstName.trim(), name.lastName.trim()]
    .filter(Boolean)
    .join(" ");
}

export function dateDraftFromValue(value?: string | null): DateDraft {
  const match = (value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return {
    year: match?.[1] || "",
    month: match?.[2] || "",
    day: match?.[3] || "",
  };
}

export function dateDraftValue(date: DateDraft): string {
  return `${date.year}-${date.month}-${date.day}`;
}

export function birthDateOptions(
  date: DateDraft,
  latest = personalDetailsLatestDateOfBirth(),
) {
  const limit = dateDraftFromValue(latest);
  const year = Number(date.year || limit.year);
  const monthCount = year >= Number(limit.year) ? Number(limit.month) : 12;
  const month = Math.max(1, Math.min(monthCount, Number(date.month) || 1));
  const calendarDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dayCount =
    year >= Number(limit.year) && month === Number(limit.month)
      ? Math.min(calendarDays, Number(limit.day))
      : calendarDays;
  return { monthCount, dayCount, latestYear: Number(limit.year) };
}

// Wheels always represent a complete valid date. Changing month/year clamps
// the day (Jan 31 → Feb 28), without rolling into the following month.
export function normalizeBirthDate(
  date: DateDraft,
  latest = personalDetailsLatestDateOfBirth(),
): DateDraft {
  const limit = dateDraftFromValue(latest);
  const year = Math.max(
    Number(limit.year) - 124,
    Math.min(Number(limit.year), Number(date.year) || Number(limit.year)),
  );
  const next = { ...date, year: String(year) };
  const { monthCount } = birthDateOptions(next, latest);
  next.month = String(
    Math.max(
      1,
      Math.min(monthCount, Number(date.month) || Number(limit.month)),
    ),
  ).padStart(2, "0");
  const { dayCount } = birthDateOptions(next, latest);
  next.day = String(
    Math.max(1, Math.min(dayCount, Number(date.day) || Number(limit.day))),
  ).padStart(2, "0");
  return next;
}

export function wheelIndex(
  offset: number,
  rowHeight: number,
  count: number,
): number {
  return Math.max(0, Math.min(count - 1, Math.round(offset / rowHeight)));
}
