"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  formatFlightsMonthHeading,
  formatFlightsWeekdays,
} from "@/lib/flights/dateFormatting";
import { cn } from "@/lib/utils";

export const parseFlightIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
};

export const toFlightIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, offset: number) => new Date(date.getFullYear(), date.getMonth() + offset, 1);

const monthCells = (month: Date) => {
  const first = startOfMonth(month);
  const firstCell = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return { date, currentMonth: date.getMonth() === month.getMonth() };
  });
};

export function FlightSingleDateCalendar({
  value,
  minimumDate,
  locale,
  selectDateLabel,
  previousMonthLabel,
  nextMonthLabel,
  onSelect,
}: {
  value: string;
  minimumDate: string;
  locale: string;
  selectDateLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  onSelect: (date: string) => void;
}) {
  const minimum = parseFlightIsoDate(minimumDate) ?? new Date();
  const selected = parseFlightIsoDate(value);
  const initialMonth = selected && selected >= minimum ? selected : minimum;
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(initialMonth));
  const weekdays = useMemo(() => formatFlightsWeekdays(locale), [locale]);
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", year: "numeric" }), [locale]);
  const minimumTime = new Date(minimum.getFullYear(), minimum.getMonth(), minimum.getDate()).getTime();

  const renderMonth = (month: Date) => (
    <section key={`${month.getFullYear()}-${month.getMonth()}`} aria-label={formatFlightsMonthHeading(month, locale)}>
      <h4 className="mb-2.5 text-center text-sm font-semibold tracking-tight text-slate-900">
        {formatFlightsMonthHeading(month, locale)}
      </h4>
      <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-semibold tracking-[0.09em] text-slate-500">
        {weekdays.map((weekday, index) => <span key={`${weekday}-${index}`} className="py-1.5">{weekday}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {monthCells(month).map(({ date, currentMonth }) => {
          const iso = toFlightIsoDate(date);
          if (!currentMonth) return <span key={`blank-${iso}`} aria-hidden="true" className="h-10" />;
          const disabled = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() < minimumTime;
          const isSelected = value === iso;
          return (
            <button
              key={iso}
              type="button"
              aria-label={`${selectDateLabel} ${formatter.format(date)}`}
              aria-pressed={isSelected}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={cn(
                "focus-ring mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed",
                disabled ? "text-slate-300" : "text-slate-800 hover:bg-[#004BB8]/8 hover:text-[#004BB8]",
                isSelected && "bg-[#004BB8] text-white hover:bg-[#004BB8] hover:text-white",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label={previousMonthLabel}
          disabled={addMonths(visibleMonth, -1) < startOfMonth(minimum)}
          onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-35"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={nextMonthLabel}
          onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {renderMonth(visibleMonth)}
        {renderMonth(addMonths(visibleMonth, 1))}
      </div>
    </div>
  );
}
