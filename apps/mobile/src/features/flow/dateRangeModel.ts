export type DateRange = { startDate: string; endDate: string };

export function selectDateRange(startDate: string, endDate: string, selected: string, strictlyAfter: boolean): DateRange {
  if (!startDate || endDate || selected < startDate || (strictlyAfter && selected === startDate)) return { startDate: selected, endDate: "" };
  return { startDate, endDate: selected };
}
