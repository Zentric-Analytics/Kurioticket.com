"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { CheckCircle2 } from "lucide-react";

import {
  addMonths,
  buildMonthCells,
  defaultDriverAge,
  driverAgeOptions,
  isBeforeToday,
  parseIsoDate,
  timeOptions,
  toIsoDate,
} from "@/lib/cars/carsSearchUtils";

type CalendarStrings = {
  chooseDates: string;
  previousMonth: string;
  previousMonthShort: string;
  nextMonth: string;
  nextMonthShort: string;
  selectDatePrefix: string;
  startsNewPickupDate: string;
  clear: string;
  done: string;
};

export function CarsRentalDatePickerContent({
  dropoffDate,
  formatFullDate,
  locale,
  onClear,
  onDone,
  onNextMonth,
  onPreviousMonth,
  onSelectDate,
  pickupDate,
  strings,
  visibleMonthDate,
  weekdays,
}: {
  dropoffDate: string;
  formatFullDate: (date: Date) => string;
  locale: string;
  onClear: () => void;
  onDone: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectDate: (date: Date) => void;
  pickupDate: string;
  strings: CalendarStrings;
  visibleMonthDate: Date;
  weekdays: string[];
}) {
  const pickupParsed = parseIsoDate(pickupDate);
  const dropoffParsed = parseIsoDate(dropoffDate);

  return (
    <>
      <p className="mb-3 text-base font-semibold text-slate-900">{strings.chooseDates}</p>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label={strings.previousMonth} onClick={onPreviousMonth} className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
          {strings.previousMonthShort}
        </button>
        <button type="button" aria-label={strings.nextMonth} onClick={onNextMonth} className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
          {strings.nextMonthShort}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4" data-cars-calendar-months>
        {[0, 1].map((monthOffset) => {
          const monthDate = addMonths(visibleMonthDate, monthOffset);
          return (
            <div key={toIsoDate(monthDate)} data-cars-calendar-month>
              <p className="mb-1.5 text-center text-sm font-semibold text-slate-800">
                {monthDate.toLocaleDateString(locale, { month: "long", year: "numeric" })}
              </p>
              <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
                {weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {buildMonthCells(monthDate).map((cell) => {
                  const iso = toIsoDate(cell.date);
                  if (!cell.isCurrentMonth) return <span key={`placeholder-${iso}`} aria-hidden="true" className="h-8 w-8 justify-self-center" />;
                  const past = isBeforeToday(cell.date);
                  const beforePickup = Boolean(pickupDate && !dropoffDate && iso < pickupDate);
                  const inRange = Boolean(pickupParsed && dropoffParsed && !past && cell.date > pickupParsed && cell.date < dropoffParsed);
                  const selected = iso === pickupDate || iso === dropoffDate;
                  return (
                    <button
                      key={iso}
                      type="button"
                      aria-label={`${strings.selectDatePrefix} ${formatFullDate(cell.date)}${beforePickup ? `; ${strings.startsNewPickupDate}` : ""}`}
                      aria-pressed={selected}
                      disabled={past}
                      onClick={() => onSelectDate(cell.date)}
                      data-cars-date={iso}
                      data-in-range={inRange || undefined}
                      className={`focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors disabled:cursor-not-allowed ${past ? "text-slate-300 hover:bg-transparent" : beforePickup ? "text-slate-500 hover:bg-[#004BB8]/8" : "text-slate-900 hover:bg-[#004BB8]/8"} ${inRange ? "rounded-md bg-[#004BB8]/10 text-[#021C2B] hover:bg-[#004BB8]/10" : ""} ${selected ? "bg-[#004BB8] text-white hover:bg-[#004BB8]" : ""}`}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <button type="button" onClick={onClear} className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">{strings.clear}</button>
        <button type="button" onClick={onDone} className="focus-ring rounded-lg bg-[#004BB8] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,75,184,0.20)] transition-colors hover:bg-[#021C2B] active:bg-[#021C2B] focus-visible:ring-[#004BB8]/35">{strings.done}</button>
      </div>
    </>
  );
}

export function CarsTimeRangePickerContent({
  formatTime,
  onPickupTimeChange,
  onReturnTimeChange,
  pickupLabel,
  pickupTime,
  returnLabel,
  returnTime,
}: {
  formatTime: (time: string) => string;
  onPickupTimeChange: (time: string) => void;
  onReturnTimeChange: (time: string) => void;
  pickupLabel: string;
  pickupTime: string;
  returnLabel: string;
  returnTime: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3" data-cars-time-columns>
      {([
        ["pickup", pickupLabel, pickupTime, onPickupTimeChange],
        ["return", returnLabel, returnTime, onReturnTimeChange],
      ] as const).map(([kind, label, selectedTime, onChange]) => (
        <div key={kind} role="group" aria-label={label}>
          <p className="mb-2 text-xs font-bold text-slate-600">{label}</p>
          <div className="max-h-56 overflow-y-auto overscroll-contain" data-cars-time-list={kind}>
            {timeOptions.map((time) => (
              <button key={`${kind}-${time}`} type="button" aria-pressed={selectedTime === time} onClick={() => onChange(time)} className={`focus-ring block w-full rounded-lg px-3 py-2 text-start text-sm ${selectedTime === time ? "bg-[#004BB8] font-bold text-white" : "hover:bg-slate-100"}`}>
                {formatTime(time)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CarsDriverAgePickerContent({
  anyAgeLabel,
  formatAge = (age) => age,
  onSelect,
  selectedAge,
}: {
  anyAgeLabel: string;
  formatAge?: (age: string) => string;
  onSelect: (age: string) => void;
  selectedAge: string;
}) {
  const initialIndex = Math.max(0, driverAgeOptions.indexOf(selectedAge));
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const selectedIndex = Math.max(0, driverAgeOptions.indexOf(selectedAge));
    optionRefs.current[selectedIndex]?.focus({ preventScroll: true });
    optionRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedAge]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = Math.min(driverAgeOptions.length - 1, focusedIndex + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, focusedIndex - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = driverAgeOptions.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(driverAgeOptions[focusedIndex]);
      return;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    setFocusedIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus({ preventScroll: true });
    optionRefs.current[nextIndex]?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div onKeyDown={onKeyDown} className="max-h-[360px] overflow-y-auto overscroll-contain p-1.5">
      {driverAgeOptions.map((age, index) => {
        const selected = selectedAge === age;
        return (
          <button key={age} ref={(node) => { optionRefs.current[index] = node; }} type="button" role="option" aria-selected={selected} tabIndex={index === focusedIndex ? 0 : -1} onFocus={() => setFocusedIndex(index)} onClick={() => onSelect(age)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-start text-[15px] font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 ${selected ? "bg-[#EAF2FB] font-semibold text-[#142033]" : "text-[#263A55] hover:bg-slate-50 hover:text-slate-950"}`}>
            <span>{age === defaultDriverAge ? anyAgeLabel : formatAge(age)}</span>
            <span className="flex w-5 shrink-0 justify-center">{selected ? <CheckCircle2 data-selected-age-indicator className="h-[18px] w-[18px] text-[#004BB8]" aria-hidden="true" /> : null}</span>
          </button>
        );
      })}
    </div>
  );
}
