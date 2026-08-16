"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, Clock3 } from "lucide-react";
import { MobileDateRangePicker } from "@/components/search/MobileDateRangePicker";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import type { RefObject } from "react";

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
  start?: string;
  end?: string;
};

export function CarsRentalDatePickerContent({
  dropoffDate, formatFullDate, locale, onClear, onDone, onNextMonth,
  onPreviousMonth, onSelectDate, pickupDate, strings, visibleMonthDate,
  weekdays, mobileShell = false,
}: {
  dropoffDate: string; formatFullDate: (date: Date) => string; locale: string;
  onClear: () => void; onDone: () => void; onNextMonth: () => void;
  onPreviousMonth: () => void; onSelectDate: (date: Date) => void;
  pickupDate: string; strings: CalendarStrings; visibleMonthDate: Date;
  weekdays: string[]; mobileShell?: boolean;
}) {
  const pickupParsed = parseIsoDate(pickupDate);
  const dropoffParsed = parseIsoDate(dropoffDate);
  const todayIso = toIsoDate(new Date());
  const months = Array.from(
    { length: mobileShell ? 12 : 2 },
    (_, offset) => addMonths(visibleMonthDate, offset),
  );

  if (mobileShell) {
    return (
      <MobileDateRangePicker
        startDate={pickupDate}
        endDate={dropoffDate}
        firstMonth={visibleMonthDate}
        locale={locale}
        weekdays={weekdays}
        labels={{
          selectDates: strings.chooseDates,
          start: strings.start ?? "Start",
          end: strings.end ?? "End",
          done: strings.done,
          selectDatePrefix: strings.selectDatePrefix,
        }}
        isDateDisabled={isBeforeToday}
        onSelectDate={onSelectDate}
      />
    );
  }

  return <>
    {!mobileShell ? <p className="mb-3 text-base font-semibold text-slate-900">{strings.chooseDates}</p> : null}
    {!mobileShell ? <div className="mb-3 flex items-center justify-between">
      <button type="button" aria-label={strings.previousMonth} onClick={onPreviousMonth} className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700">{strings.previousMonthShort}</button>
      <button type="button" aria-label={strings.nextMonth} onClick={onNextMonth} className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700">{strings.nextMonthShort}</button>
    </div> : null}
    <div className={mobileShell ? "mx-auto w-full max-w-xl space-y-8 pb-2" : "grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4"} data-cars-calendar-months data-month-count={months.length}>
      {months.map((monthDate) => <section key={toIsoDate(monthDate)} aria-label={monthDate.toLocaleDateString(locale, { month: "long", year: "numeric" })} className={mobileShell ? "space-y-2.5" : undefined} data-cars-calendar-month>
        <h3 className={mobileShell ? "text-start text-[17px] font-bold tracking-tight text-slate-950" : "mb-1.5 text-center text-sm font-semibold text-slate-800"}>{monthDate.toLocaleDateString(locale, { month: "long", year: "numeric" })}</h3>
        <div className={mobileShell ? "grid grid-cols-7 text-center text-[12px] font-semibold tracking-[0.08em] text-slate-500" : "mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600"}>
          {weekdays.map((weekday, index) => <span className={mobileShell ? "py-2" : undefined} key={`${weekday}-${index}`}>{weekday}</span>)}
        </div>
        <div className={mobileShell ? "grid grid-cols-7 gap-y-1.5" : "grid grid-cols-7 gap-1"}>
          {buildMonthCells(monthDate).map((cell) => {
            const iso = toIsoDate(cell.date);
            if (!cell.isCurrentMonth) return <span key={`placeholder-${iso}`} aria-hidden="true" className={mobileShell ? "h-11 w-full" : "h-8 w-8 justify-self-center"} />;
            const past = isBeforeToday(cell.date);
            const beforePickup = Boolean(pickupDate && !dropoffDate && iso < pickupDate);
            const inRange = Boolean(pickupParsed && dropoffParsed && !past && cell.date > pickupParsed && cell.date < dropoffParsed);
            const selected = iso === pickupDate || iso === dropoffDate;
            const today = iso === todayIso;
            return <button key={iso} type="button" aria-label={`${strings.selectDatePrefix} ${formatFullDate(cell.date)}${beforePickup ? `; ${strings.startsNewPickupDate}` : ""}`} aria-pressed={selected} aria-disabled={past} disabled={past} onClick={() => onSelectDate(cell.date)} data-cars-date={iso} data-in-range={inRange || undefined}
              className={`focus-ring relative mx-auto flex items-center justify-center rounded-full font-semibold transition-colors disabled:cursor-not-allowed ${mobileShell ? "h-11 w-full max-w-11 text-[15px]" : "h-8 w-8 text-sm"} ${past ? "text-slate-300" : "text-slate-800 hover:bg-[#004BB8]/10 hover:text-[#004BB8]"} ${today && !past ? "ring-1 ring-inset ring-[#004BB8]/25" : ""} ${inRange ? "bg-[#004BB8]/10 text-[#021C2B]" : ""} ${selected ? "bg-[#004BB8] text-white shadow-sm ring-0 hover:bg-[#004BB8] hover:text-white" : ""}`}>
              {cell.date.getDate()}{today && !selected ? <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#004BB8]" aria-hidden="true" /> : null}
            </button>;
          })}
        </div>
      </section>)}
    </div>
    {!mobileShell ? <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3"><button type="button" onClick={onClear} className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">{strings.clear}</button><button type="button" onClick={onDone} className="focus-ring rounded-lg bg-[#004BB8] px-4 py-2 text-sm font-semibold text-white">{strings.done}</button></div> : null}
  </>;
}

export function CarsTimeRangePickerContent({ formatTime, onPickupTimeChange, onReturnTimeChange, pickupLabel, pickupTime, returnLabel, returnTime, mobileShell = false }: {
  formatTime: (time: string) => string; onPickupTimeChange: (time: string) => void;
  onReturnTimeChange: (time: string) => void; pickupLabel: string; pickupTime: string;
  returnLabel: string; returnTime: string; mobileShell?: boolean;
}) {
  const pickupListRef = useRef<HTMLDivElement>(null);
  const returnListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileShell) return;
    const positionSelected = (list: HTMLDivElement | null, value: string) => {
      const option = list?.querySelector<HTMLElement>(`[data-time-value="${value}"]`);
      if (!list || !option) return;
      list.scrollTop = Math.max(0, option.offsetTop - (list.clientHeight - option.offsetHeight) / 2);
    };
    const frame = requestAnimationFrame(() => {
      positionSelected(pickupListRef.current, pickupTime);
      positionSelected(returnListRef.current, returnTime);
    });
    return () => cancelAnimationFrame(frame);
  }, [mobileShell, pickupTime, returnTime]);

  return <div className={mobileShell ? "grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden" : "grid grid-cols-2 gap-3"} data-cars-time-columns>
    {([ ["pickup", pickupLabel, pickupTime, onPickupTimeChange, pickupListRef], ["return", returnLabel, returnTime, onReturnTimeChange, returnListRef] ] as const).map(([kind, label, selectedTime, onChange, listRef]) =>
      <div key={kind} role="group" aria-label={label} className={mobileShell ? "flex min-h-0 flex-col" : undefined}>
        <h3 className="mb-3 flex shrink-0 items-center gap-2 text-[15px] font-bold text-slate-950">{mobileShell ? <Clock3 aria-hidden="true" className="h-[18px] w-[18px] text-[#075EE8]" /> : null}{label}</h3>
        <div ref={listRef} role="listbox" aria-label={label} className={mobileShell ? "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white [-webkit-overflow-scrolling:touch]" : "max-h-56 overflow-y-auto overscroll-contain"} data-cars-time-list={kind}>
          {timeOptions.map((time) => <button key={`${kind}-${time}`} data-time-value={time} type="button" role="option" aria-selected={selectedTime === time} onClick={() => onChange(time)} className={`focus-ring flex min-h-12 w-full items-center justify-between border-b border-slate-200 px-3 text-start text-[15px] last:border-b-0 ${selectedTime === time ? (mobileShell ? "bg-[#eff6ff] font-bold text-[#075EE8]" : "bg-[#004BB8] font-bold text-white") : "text-slate-800 hover:bg-slate-50"}`}><span>{formatTime(time)}</span>{mobileShell && selectedTime === time ? <span data-selected-time-indicator className="flex h-6 w-6 items-center justify-center rounded-full bg-[#075EE8]" aria-hidden="true"><Check className="h-4 w-4 text-white" /></span> : null}</button>)}
        </div>
      </div>)}
  </div>;
}

export function CarsDriverAgePickerContent({ anyAgeLabel, formatAge = (age) => age, onSelect, selectedAge, mobileShell = false }: {
  anyAgeLabel: string; formatAge?: (age: string) => string; onSelect: (age: string) => void; selectedAge: string; mobileShell?: boolean;
}) {
  const initialIndex = Math.max(0, driverAgeOptions.indexOf(selectedAge));
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reveal = (index: number) => {
    const list = listRef.current, option = optionRefs.current[index];
    if (!list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  };
  useEffect(() => {
    const index = Math.max(0, driverAgeOptions.indexOf(selectedAge));
    const frame = requestAnimationFrame(() => reveal(index));
    return () => cancelAnimationFrame(frame);
  }, [selectedAge]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === "ArrowDown") next = Math.min(driverAgeOptions.length - 1, focusedIndex + 1);
    else if (event.key === "ArrowUp") next = Math.max(0, focusedIndex - 1);
    else if (event.key === "Home") next = 0; else if (event.key === "End") next = driverAgeOptions.length - 1;
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(driverAgeOptions[focusedIndex]); return; }
    if (next === null) return; event.preventDefault(); setFocusedIndex(next); optionRefs.current[next]?.focus({ preventScroll: true }); reveal(next);
  };
  return <div ref={listRef} role="listbox" aria-label={anyAgeLabel} onKeyDown={onKeyDown} className={mobileShell ? "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white [-webkit-overflow-scrolling:touch]" : "max-h-[360px] overflow-y-auto overscroll-contain p-1.5"} data-cars-age-list>
    {driverAgeOptions.map((age, index) => { const selected = selectedAge === age; return <button key={age} ref={(node) => { optionRefs.current[index] = node; }} type="button" role="option" aria-selected={selected} tabIndex={index === focusedIndex ? 0 : -1} onFocus={() => setFocusedIndex(index)} onClick={() => onSelect(age)} className={`flex min-h-14 w-full items-center justify-between gap-3 border-b border-slate-200 px-4 text-start text-[15px] font-medium transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 ${selected ? (mobileShell ? "font-semibold text-[#142033]" : "bg-[#EAF2FB] font-semibold text-[#142033]") : "text-[#263A55] hover:bg-slate-50"}`}><span>{age === defaultDriverAge ? <span><span className="block">{anyAgeLabel}</span><span className="mt-1 block text-xs font-medium text-slate-500">Show all available cars</span></span> : formatAge(age)}</span><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${selected ? "bg-[#075EE8]" : "border border-slate-400"}`}>{selected ? <Check data-selected-age-indicator className="h-4 w-4 text-white" aria-hidden="true" /> : null}</span></button>; })}
  </div>;
}

type MobileDialogBase = { open: boolean; launcherRef?: RefObject<HTMLElement | null>; onClose: () => void; doneLabel: string };
export function MobileCarTimePickerDialog({ open, launcherRef, onClose, pickupTime, returnTime, onCommit, formatTime, title, intro, pickupLabel, returnLabel, doneLabel }: MobileDialogBase & { pickupTime: string; returnTime: string; onCommit: (pickup: string, returned: string) => void; formatTime: (time: string) => string; title: string; intro: string; pickupLabel: string; returnLabel: string }) {
  const [draftPickup, setDraftPickup] = useState(pickupTime), [draftReturn, setDraftReturn] = useState(returnTime);
  useEffect(() => { if (open) { setDraftPickup(pickupTime); setDraftReturn(returnTime); } }, [open, pickupTime, returnTime]);
  return <FlightMobilePickerShell open={open} title={title} titleId="cars-mobile-time-title" launcherRef={launcherRef} onClose={onClose} showCancelAction={false} showBackLabel contentLayout="contained" contentClassName="bg-[#FCFDFE] px-4 py-5" footer={<button type="button" onClick={() => { onCommit(draftPickup, draftReturn); onClose(); }} className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075EE8] text-base font-bold text-white">{doneLabel}</button>}><div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden"><p className="mb-5 text-center text-sm font-medium text-slate-600">{intro}</p><CarsTimeRangePickerContent mobileShell formatTime={formatTime} pickupLabel={pickupLabel} pickupTime={draftPickup} returnLabel={returnLabel} returnTime={draftReturn} onPickupTimeChange={setDraftPickup} onReturnTimeChange={setDraftReturn} /></div></FlightMobilePickerShell>;
}

export function MobileCarDriverAgePickerDialog({ open, launcherRef, onClose, driverAge, onCommit, title, intro, anyAgeLabel, doneLabel, formatAge }: MobileDialogBase & { driverAge: string; onCommit: (age: string) => void; title: string; intro: string; anyAgeLabel: string; formatAge?: (age: string) => string }) {
  const [draftAge, setDraftAge] = useState(driverAge);
  useEffect(() => { if (open) setDraftAge(driverAge); }, [open, driverAge]);
  return <FlightMobilePickerShell open={open} title={title} titleId="cars-mobile-driver-age-title" launcherRef={launcherRef} onClose={onClose} showCancelAction={false} showBackLabel={false} contentLayout="contained" contentClassName="bg-[#FCFDFE] px-4 py-5" footer={<button type="button" onClick={() => { onCommit(draftAge); onClose(); }} className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075EE8] text-base font-bold text-white">{doneLabel}</button>}><div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden"><p className="mb-5 text-sm font-medium text-slate-600">{intro}</p><CarsDriverAgePickerContent mobileShell anyAgeLabel={anyAgeLabel} formatAge={formatAge} selectedAge={draftAge} onSelect={setDraftAge} /></div></FlightMobilePickerShell>;
}
