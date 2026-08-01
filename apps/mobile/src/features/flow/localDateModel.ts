const pad = (value: number) => String(value).padStart(2, "0");

/** Serializes a calendar date without converting it to UTC. */
export const localIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const localDateFromIso = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return localIsoDate(date) === iso ? date : undefined;
};

export const addCalendarDays = (iso: string, days: number) => {
  const date = localDateFromIso(iso);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
};

export const compareLocalDateTimes = (leftDate: string, leftTime: string, rightDate: string, rightTime: string) =>
  `${leftDate}T${leftTime}`.localeCompare(`${rightDate}T${rightTime}`);
