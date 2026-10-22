"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, Clock3 } from "lucide-react";
import { MobileDateRangePicker } from "@/components/search/MobileDateRangePicker";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import {
  beginCarLocationPointerIntent,
  isIntentionalCarLocationTap,
  updateCarLocationPointerIntent,
  type CarLocationPointerSession,
} from "@/components/search/carLocationPointerIntent";
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
  mobileShell = false,
  desktopCompact = false,
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
  mobileShell?: boolean;
  desktopCompact?: boolean;
}) {
  const pickupParsed = parseIsoDate(pickupDate);
  const dropoffParsed = parseIsoDate(dropoffDate);
  const todayIso = toIsoDate(new Date());
  const months = Array.from({ length: mobileShell ? 12 : 2 }, (_, offset) =>
    addMonths(visibleMonthDate, offset),
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

  return (
    <>
      {!mobileShell ? (
        <p
          className={
            desktopCompact
              ? "mb-2 text-sm font-semibold text-slate-900"
              : "mb-3 text-base font-semibold text-slate-900"
          }
        >
          {strings.chooseDates}
        </p>
      ) : null}
      {!mobileShell ? (
        <div
          className={
            desktopCompact
              ? "mb-2 flex items-center justify-between"
              : "mb-3 flex items-center justify-between"
          }
        >
          <button
            type="button"
            aria-label={strings.previousMonth}
            onClick={onPreviousMonth}
            className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            {strings.previousMonthShort}
          </button>
          <button
            type="button"
            aria-label={strings.nextMonth}
            onClick={onNextMonth}
            className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            {strings.nextMonthShort}
          </button>
        </div>
      ) : null}
      <div
        className={
          mobileShell
            ? "mx-auto w-full max-w-xl space-y-8 pb-2"
            : "grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4"
        }
        data-cars-calendar-months
        data-month-count={months.length}
      >
        {months.map((monthDate) => (
          <section
            key={toIsoDate(monthDate)}
            aria-label={monthDate.toLocaleDateString(locale, {
              month: "long",
              year: "numeric",
            })}
            className={mobileShell ? "space-y-2.5" : undefined}
            data-cars-calendar-month
          >
            <h3
              className={
                mobileShell
                  ? "text-start text-[17px] font-bold tracking-tight text-slate-950"
                  : desktopCompact
                    ? "mb-1 text-center text-[13px] font-semibold text-slate-800"
                    : "mb-1.5 text-center text-sm font-semibold text-slate-800"
              }
            >
              {monthDate.toLocaleDateString(locale, {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <div
              className={
                mobileShell
                  ? "grid grid-cols-7 text-center text-[12px] font-semibold tracking-[0.08em] text-slate-500"
                  : "mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600"
              }
            >
              {weekdays.map((weekday, index) => (
                <span
                  className={mobileShell ? "py-2" : undefined}
                  key={`${weekday}-${index}`}
                >
                  {weekday}
                </span>
              ))}
            </div>
            <div
              className={
                mobileShell
                  ? "grid grid-cols-7 gap-y-1.5"
                  : "grid grid-cols-7 gap-1"
              }
            >
              {buildMonthCells(monthDate).map((cell) => {
                const iso = toIsoDate(cell.date);
                if (!cell.isCurrentMonth)
                  return (
                    <span
                      key={`placeholder-${iso}`}
                      aria-hidden="true"
                      className={
                        mobileShell
                          ? "h-11 w-full"
                          : desktopCompact
                            ? "h-7 w-7 justify-self-center"
                            : "h-8 w-8 justify-self-center"
                      }
                    />
                  );
                const past = isBeforeToday(cell.date);
                const beforePickup = Boolean(
                  pickupDate && !dropoffDate && iso < pickupDate,
                );
                const inRange = Boolean(
                  pickupParsed &&
                  dropoffParsed &&
                  !past &&
                  cell.date > pickupParsed &&
                  cell.date < dropoffParsed,
                );
                const selected = iso === pickupDate || iso === dropoffDate;
                const today = iso === todayIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    aria-label={`${strings.selectDatePrefix} ${formatFullDate(cell.date)}${beforePickup ? `; ${strings.startsNewPickupDate}` : ""}`}
                    aria-pressed={selected}
                    aria-disabled={past}
                    disabled={past}
                    onClick={() => onSelectDate(cell.date)}
                    data-cars-date={iso}
                    data-in-range={inRange || undefined}
                    className={`focus-ring relative mx-auto flex items-center justify-center rounded-full font-semibold transition-colors disabled:cursor-not-allowed ${mobileShell ? "h-11 w-full max-w-11 text-[15px]" : desktopCompact ? "h-7 w-7 text-[13px]" : "h-8 w-8 text-sm"} ${past ? "text-slate-300" : "text-slate-800 hover:bg-[#004BB8]/10 hover:text-[#004BB8]"} ${today && !past ? "ring-1 ring-inset ring-[#004BB8]/25" : ""} ${inRange ? "bg-[#004BB8]/10 text-[#021C2B]" : ""} ${selected ? "bg-[#004BB8] text-white shadow-sm ring-0 hover:bg-[#004BB8] hover:text-white" : ""}`}
                  >
                    {cell.date.getDate()}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {!mobileShell ? (
        <div
          className={
            desktopCompact
              ? "mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-2"
              : "mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3"
          }
        >
          <button
            type="button"
            onClick={onClear}
            className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {strings.clear}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="focus-ring rounded-lg bg-[#004BB8] px-4 py-2 text-sm font-semibold text-white"
          >
            {strings.done}
          </button>
        </div>
      ) : null}
    </>
  );
}

function CarsTimeOptionButton({
  time,
  selected,
  onSelect,
  formatTime,
  mobileShell,
  nativeCarsAppearance,
}: {
  time: string;
  selected: boolean;
  onSelect: () => void;
  formatTime: (time: string) => string;
  mobileShell: boolean;
  nativeCarsAppearance: boolean;
}) {
  const pointerSessionRef = useRef<CarLocationPointerSession | null>(null);
  const suppressClickRef = useRef(false);

  return (
    <button
      data-time-value={time}
      type="button"
      role="option"
      aria-selected={selected}
      onPointerDown={(event) => {
        if (!mobileShell || event.pointerType === "mouse") return;
        pointerSessionRef.current = beginCarLocationPointerIntent(
          event.pointerId,
          event.clientX,
          event.clientY,
        );
      }}
      onPointerMove={(event) => {
        const session = pointerSessionRef.current;
        if (!mobileShell || !session) return;
        pointerSessionRef.current = updateCarLocationPointerIntent(
          session,
          event.pointerId,
          event.clientX,
          event.clientY,
        );
      }}
      onPointerCancel={() => {
        pointerSessionRef.current = null;
        suppressClickRef.current = false;
      }}
      onPointerUp={(event) => {
        if (!mobileShell || event.pointerType === "mouse") return;
        const intentional = isIntentionalCarLocationTap(
          pointerSessionRef.current,
          event.pointerId,
        );
        pointerSessionRef.current = null;
        suppressClickRef.current = true;
        if (intentional) onSelect();
      }}
      onClick={(event) => {
        if (mobileShell && suppressClickRef.current) {
          suppressClickRef.current = false;
          event.preventDefault();
          return;
        }
        onSelect();
      }}
      className={`focus-ring flex w-full items-center justify-between border-b border-slate-200 text-start text-[15px] last:border-b-0 ${mobileShell ? (nativeCarsAppearance ? "min-h-[50px] px-2" : "min-h-12 px-3") : "h-11 px-3"} ${selected ? "bg-[#eff6ff] font-bold text-[#075EE8]" : "text-slate-800 hover:bg-slate-50"}`}
    >
      <span>{formatTime(time)}</span>
      {mobileShell && selected ? (
        nativeCarsAppearance ? (
          <Check
            data-selected-time-indicator
            className="h-[17px] w-[17px] text-[#075EE8]"
            aria-hidden="true"
          />
        ) : (
          <span
            data-selected-time-indicator
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#075EE8]"
            aria-hidden="true"
          >
            <Check className="h-4 w-4 text-white" />
          </span>
        )
      ) : null}
    </button>
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
  mobileShell = false,
  resultsEdit = false,
  nativeCarsAppearance = resultsEdit,
  autoRevealSelected = true,
  open = false,
}: {
  formatTime: (time: string) => string;
  onPickupTimeChange: (time: string) => void;
  onReturnTimeChange: (time: string) => void;
  pickupLabel: string;
  pickupTime: string;
  returnLabel: string;
  returnTime: string;
  mobileShell?: boolean;
  resultsEdit?: boolean;
  nativeCarsAppearance?: boolean;
  autoRevealSelected?: boolean;
  open?: boolean;
}) {
  const pickupListRef = useRef<HTMLDivElement>(null);
  const returnListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileShell || !autoRevealSelected) return;
    const positionSelected = (list: HTMLDivElement | null, value: string) => {
      const option = list?.querySelector<HTMLElement>(
        `[data-time-value="${value}"]`,
      );
      if (!list || !option) return;
      list.scrollTop = Math.max(
        0,
        option.offsetTop - (list.clientHeight - option.offsetHeight) / 2,
      );
    };
    const frame = requestAnimationFrame(() => {
      positionSelected(pickupListRef.current, pickupTime);
      positionSelected(returnListRef.current, returnTime);
    });
    return () => cancelAnimationFrame(frame);
  }, [autoRevealSelected, mobileShell, pickupTime, returnTime]);

  useEffect(() => {
    if (!mobileShell || autoRevealSelected || !open) return;
    const frame = requestAnimationFrame(() => {
      if (pickupListRef.current) pickupListRef.current.scrollTop = 0;
      if (returnListRef.current) returnListRef.current.scrollTop = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [autoRevealSelected, mobileShell, open]);

  return (
    <div
      className={
        mobileShell
          ? `grid min-h-0 flex-1 grid-cols-2 overflow-hidden ${nativeCarsAppearance ? "gap-2.5" : "gap-3"}`
          : "grid grid-cols-2 gap-3"
      }
      data-cars-time-columns
    >
      {(
        [
          [
            "pickup",
            pickupLabel,
            pickupTime,
            onPickupTimeChange,
            pickupListRef,
          ],
          [
            "return",
            returnLabel,
            returnTime,
            onReturnTimeChange,
            returnListRef,
          ],
        ] as const
      ).map(([kind, label, selectedTime, onChange, listRef]) => (
        <div
          key={kind}
          role="group"
          aria-label={label}
          className={mobileShell ? "flex min-h-0 flex-col" : undefined}
        >
          <h3
            className={
              nativeCarsAppearance
                ? "shrink-0 py-2 text-xs font-semibold text-slate-950"
                : "mb-3 flex shrink-0 items-center gap-2 text-[15px] font-bold text-slate-950"
            }
          >
            {mobileShell && !nativeCarsAppearance ? (
              <Clock3
                aria-hidden="true"
                className="h-[18px] w-[18px] text-[#075EE8]"
              />
            ) : null}
            {label}
          </h3>
          <div
            ref={listRef}
            role="listbox"
            aria-label={label}
            className={
              mobileShell
                ? nativeCarsAppearance
                  ? "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-transparent [-webkit-overflow-scrolling:touch]"
                  : "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white [-webkit-overflow-scrolling:touch]"
                : "h-[260px] overflow-y-auto overscroll-contain rounded-lg border border-slate-200"
            }
            data-cars-time-list={kind}
          >
            {timeOptions.map((time) => (
              <CarsTimeOptionButton
                key={`${kind}-${time}`}
                time={time}
                selected={selectedTime === time}
                onSelect={() => onChange(time)}
                formatTime={formatTime}
                mobileShell={mobileShell}
                nativeCarsAppearance={nativeCarsAppearance}
              />
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
  mobileShell = false,
  resultsEdit = false,
  nativeCarsAppearance = resultsEdit,
}: {
  anyAgeLabel: string;
  formatAge?: (age: string) => string;
  onSelect: (age: string) => void;
  selectedAge?: string;
  mobileShell?: boolean;
  resultsEdit?: boolean;
  nativeCarsAppearance?: boolean;
}) {
  const ageOptions = useMemo(
    () => (nativeCarsAppearance ? driverAgeOptions.slice(1) : driverAgeOptions),
    [nativeCarsAppearance],
  );
  const selectedIndex = selectedAge ? ageOptions.indexOf(selectedAge) : -1;
  const initialIndex = selectedIndex < 0 ? 0 : selectedIndex;
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reveal = (index: number) => {
    const list = listRef.current,
      option = optionRefs.current[index];
    if (!list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (
      option.offsetTop + option.offsetHeight >
      list.scrollTop + list.clientHeight
    )
      list.scrollTop =
        option.offsetTop + option.offsetHeight - list.clientHeight;
  };
  useEffect(() => {
    const selectedIndex = selectedAge ? ageOptions.indexOf(selectedAge) : -1;
    const index = selectedIndex < 0 ? 0 : selectedIndex;
    const frame = requestAnimationFrame(() => reveal(index));
    return () => cancelAnimationFrame(frame);
  }, [ageOptions, selectedAge]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === "ArrowDown")
      next = Math.min(ageOptions.length - 1, focusedIndex + 1);
    else if (event.key === "ArrowUp") next = Math.max(0, focusedIndex - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = ageOptions.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(ageOptions[focusedIndex]);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocusedIndex(next);
    optionRefs.current[next]?.focus({ preventScroll: true });
    reveal(next);
  };
  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={anyAgeLabel}
      onKeyDown={onKeyDown}
      className={
        mobileShell
          ? `min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain border border-slate-200 bg-white [-webkit-overflow-scrolling:touch] ${resultsEdit ? "rounded-xl" : "rounded-xl"}`
          : "max-h-[320px] overflow-y-auto overscroll-contain p-1.5"
      }
      data-cars-age-list
    >
      {ageOptions.map((age, index) => {
        const selected = selectedAge === age;
        return (
          <button
            key={age}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            type="button"
            role="option"
            aria-selected={selected}
            tabIndex={index === focusedIndex ? 0 : -1}
            onFocus={() => setFocusedIndex(index)}
            onClick={() => onSelect(age)}
            className={`flex w-full items-center justify-between gap-3 border-b border-slate-200 px-3.5 text-start text-[15px] transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 ${nativeCarsAppearance ? "font-semibold" : "font-medium"} ${mobileShell ? "min-h-14" : age === defaultDriverAge ? "min-h-14" : "h-11"} ${selected ? "bg-[#eff6ff] font-semibold text-[#142033]" : "text-[#263A55] hover:bg-slate-50"}`}
          >
            <span>
              {!nativeCarsAppearance && age === defaultDriverAge ? (
                <span>
                  <span className="block">{anyAgeLabel}</span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    Show all available cars
                  </span>
                </span>
              ) : nativeCarsAppearance ? (
                `${age} years old`
              ) : (
                formatAge(age)
              )}
            </span>
            <span
              className={`flex shrink-0 items-center justify-center rounded-full ${nativeCarsAppearance ? "h-[22px] w-[22px]" : "h-5 w-5"} ${selected ? "bg-[#075EE8]" : "border border-slate-400"}`}
            >
              {selected ? (
                <Check
                  data-selected-age-indicator
                  className="h-3.5 w-3.5 text-white"
                  aria-hidden="true"
                />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type MobileDialogBase = {
  open: boolean;
  launcherRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  doneLabel: string;
  presentation?: "default" | "carsResultsEdit" | "carsMain";
};
export function MobileCarTimePickerDialog({
  open,
  launcherRef,
  onClose,
  pickupTime,
  returnTime,
  onCommit,
  formatTime,
  title,
  intro,
  pickupLabel,
  returnLabel,
  doneLabel,
  presentation = "default",
}: MobileDialogBase & {
  pickupTime: string;
  returnTime: string;
  onCommit: (pickup: string, returned: string) => void;
  formatTime: (time: string) => string;
  title: string;
  intro: string;
  pickupLabel: string;
  returnLabel: string;
}) {
  const nativeCarsAppearance =
    presentation === "carsResultsEdit" || presentation === "carsMain";
  const [draftPickup, setDraftPickup] = useState(pickupTime),
    [draftReturn, setDraftReturn] = useState(returnTime);
  const [draftSource, setDraftSource] = useState({
    open,
    pickupTime,
    returnTime,
  });
  if (
    draftSource.open !== open ||
    draftSource.pickupTime !== pickupTime ||
    draftSource.returnTime !== returnTime
  ) {
    setDraftSource({ open, pickupTime, returnTime });
    if (open) {
      setDraftPickup(pickupTime);
      setDraftReturn(returnTime);
    }
  }
  return (
    <FlightMobilePickerShell
      open={open}
      presentation={presentation}
      title={title}
      titleId="cars-mobile-time-title"
      launcherRef={launcherRef}
      onClose={onClose}
      showCancelAction={false}
      showBackLabel
      contentLayout="contained"
      contentClassName={
        presentation === "carsResultsEdit"
          ? "bg-[#F5F7FB] px-4 py-3"
          : presentation === "carsMain"
            ? "bg-white px-4 py-3"
            : "bg-[#FCFDFE] px-4 py-5"
      }
      footer={(requestClose) => (
        <button
          type="button"
          disabled={!draftPickup || !draftReturn}
          aria-disabled={!draftPickup || !draftReturn}
          onClick={() => {
            if (!draftPickup || !draftReturn) return;
            onCommit(draftPickup, draftReturn);
            requestClose();
          }}
          className={
            presentation === "carsResultsEdit"
              ? "focus-ring h-12 w-full rounded-[10px] bg-[#004BB8] text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#A9C5FA]"
              : "focus-ring h-[52px] w-full rounded-[9px] bg-[#075EE8] text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[#A9C5FA]"
          }
        >
          {doneLabel}
        </button>
      )}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden">
        {!nativeCarsAppearance ? (
          <p className="mb-5 text-center text-sm font-medium text-slate-600">
            {intro}
          </p>
        ) : null}
        <CarsTimeRangePickerContent
          mobileShell
          formatTime={formatTime}
          pickupLabel={pickupLabel}
          pickupTime={draftPickup}
          returnLabel={returnLabel}
          returnTime={draftReturn}
          resultsEdit={presentation === "carsResultsEdit"}
          nativeCarsAppearance={nativeCarsAppearance}
          open={open}
          autoRevealSelected={!nativeCarsAppearance}
          onPickupTimeChange={setDraftPickup}
          onReturnTimeChange={setDraftReturn}
        />
      </div>
    </FlightMobilePickerShell>
  );
}

export function MobileCarDriverAgePickerDialog({
  open,
  launcherRef,
  onClose,
  driverAge,
  onCommit,
  title,
  intro,
  anyAgeLabel,
  doneLabel,
  formatAge,
  presentation = "default",
}: MobileDialogBase & {
  driverAge: string;
  onCommit: (age: string) => void;
  title: string;
  intro: string;
  anyAgeLabel: string;
  formatAge?: (age: string) => string;
}) {
  const nativeCarsAppearance =
    presentation === "carsResultsEdit" || presentation === "carsMain";
  const concreteDraftAge =
    presentation === "carsMain" && driverAge === defaultDriverAge
      ? undefined
      : driverAge;
  const initialDraftAge = concreteDraftAge;
  const [draftAge, setDraftAge] = useState(initialDraftAge);
  const [draftSource, setDraftSource] = useState({ open, driverAge });
  if (draftSource.open !== open || draftSource.driverAge !== driverAge) {
    setDraftSource({ open, driverAge });
    if (open)
      setDraftAge(
        presentation === "carsMain" && driverAge === defaultDriverAge
          ? undefined
          : driverAge,
      );
  }
  return (
    <FlightMobilePickerShell
      open={open}
      presentation={presentation}
      title={title}
      titleId="cars-mobile-driver-age-title"
      launcherRef={launcherRef}
      onClose={onClose}
      showCancelAction={false}
      showBackLabel={false}
      contentLayout="contained"
      contentClassName={
        presentation === "carsResultsEdit"
          ? "bg-[#F5F7FB] px-4 py-3"
          : presentation === "carsMain"
            ? "bg-white px-4 py-3"
            : "bg-[#FCFDFE] px-4 py-5"
      }
      footer={(requestClose) => (
        <button
          type="button"
          disabled={presentation === "carsMain" && draftAge === undefined}
          aria-disabled={
            presentation === "carsMain" && draftAge === undefined
          }
          onClick={() => {
            if (draftAge === undefined) return;
            onCommit(draftAge);
            requestClose();
          }}
          className={
            presentation === "carsResultsEdit"
              ? "focus-ring h-12 w-full rounded-[10px] bg-[#004BB8] text-[15px] font-semibold text-white"
              : "focus-ring h-[52px] w-full rounded-[9px] bg-[#075EE8] text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[#A9C5FA]"
          }
        >
          {doneLabel}
        </button>
      )}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden">
        {!nativeCarsAppearance ? (
          <p className="mb-5 text-sm font-medium text-slate-600">{intro}</p>
        ) : null}
        <CarsDriverAgePickerContent
          mobileShell
          resultsEdit={presentation === "carsResultsEdit"}
          nativeCarsAppearance={nativeCarsAppearance}
          anyAgeLabel={anyAgeLabel}
          formatAge={formatAge}
          selectedAge={draftAge}
          onSelect={setDraftAge}
        />
      </div>
    </FlightMobilePickerShell>
  );
}
