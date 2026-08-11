const DAY_COUNT = 5;

export function parseCalendarDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function toCalendarIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftCalendarDate(iso: string, days: number) {
  const date = parseCalendarDate(iso);
  date.setDate(date.getDate() + days);
  return toCalendarIso(date);
}

export function initialDateWindowStart(selectedDate: string) {
  return shiftCalendarDate(selectedDate, -Math.floor(DAY_COUNT / 2));
}

export function getDateWindow(startDate: string) {
  return Array.from({ length: DAY_COUNT }, (_, offset) =>
    shiftCalendarDate(startDate, offset),
  );
}
