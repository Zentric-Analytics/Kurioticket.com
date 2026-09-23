"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { cn } from "@/lib/utils";

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

const monthCells = (month: Date) => {
  const first = startOfMonth(month);
  const firstCell = new Date(
    first.getFullYear(),
    first.getMonth(),
    1 - first.getDay(),
  );
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return { date, currentMonth: date.getMonth() === month.getMonth() };
  });
};

export type MobileDateRangePickerLabels = {
  selectDates: string;
  start: string;
  end: string;
  done: string;
  selectDatePrefix: string;
};

type MobileDateRangePickerProps = {
  appearance?: "default" | "carsResultsEdit";
  startDate: string;
  endDate: string;
  firstMonth: Date;
  monthCount?: number;
  locale: string;
  weekdays: string[];
  labels: MobileDateRangePickerLabels;
  isDateDisabled: (date: Date) => boolean;
  onSelectDate: (date: Date) => void;
  selectedMonthRef?: RefObject<HTMLElement | null>;
};

export function MobileDateRangePicker({
  appearance = "default",
  startDate,
  endDate,
  firstMonth,
  monthCount = 12,
  locale,
  weekdays,
  labels,
  isDateDisabled,
  onSelectDate,
  selectedMonthRef,
}: MobileDateRangePickerProps) {
  const carsResultsEdit = appearance === "carsResultsEdit";
  const firstMonthTime = startOfMonth(firstMonth).getTime();
  const [resultsMonthState, setResultsMonthState] = useState(() => ({
    firstMonthTime,
    month: startOfMonth(firstMonth),
  }));
  if (resultsMonthState.firstMonthTime !== firstMonthTime) {
    setResultsMonthState({ firstMonthTime, month: startOfMonth(firstMonth) });
  }
  const resultsMonth = resultsMonthState.month;
  const setResultsMonth = (update: (month: Date) => Date) =>
    setResultsMonthState((state) => ({ ...state, month: update(state.month) }));
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const todayIso = toIsoDate(new Date());
  const fullDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [locale],
  );
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
    [locale],
  );
  const selectedMonthKey = start
    ? `${start.getFullYear()}-${start.getMonth()}`
    : `${firstMonth.getFullYear()}-${firstMonth.getMonth()}`;
  const months = carsResultsEdit
    ? [resultsMonth]
    : Array.from({ length: monthCount }, (_, offset) =>
        addMonths(firstMonth, offset),
      );
  const activePart = startDate && !endDate ? "end" : "start";
  const formatRangeValue = (date: Date | null) =>
    date
      ? new Intl.DateTimeFormat(locale, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }).format(date)
      : "Select";
  const canGoPrevious = resultsMonth > startOfMonth(firstMonth);

  return (
    <div className="mx-auto w-full max-w-xl">
      {!carsResultsEdit ? (
        <h3 className="mb-4 text-[18px] font-bold tracking-tight text-slate-950">
          {labels.selectDates}
        </h3>
      ) : (
        <div
          data-cars-results-date-range-header
          className="mb-3 grid grid-cols-2 gap-3"
        >
          {(
            [
              [labels.start, formatRangeValue(start), "start"],
              [labels.end, formatRangeValue(end), "end"],
            ] as const
          ).map(([label, value, part], index) => (
            <div
              key={part}
              aria-current={activePart === part ? "true" : undefined}
              className={cn("min-w-0 px-2.5 py-2", index === 1 && "text-end")}
            >
              <span className="block text-[10px] font-semibold leading-[14px] text-slate-500">
                {label}
              </span>
              <span
                className={cn(
                  "inline-block border-b pb-0.5 text-[13px] font-medium leading-[18px] text-slate-950",
                  activePart === part
                    ? "border-[#075EE8]"
                    : "border-transparent",
                )}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
      <div
        data-mobile-date-calendar-card
        data-month-count={months.length}
        className={cn(
          "overflow-hidden rounded-[11px] border border-slate-200 bg-white",
          carsResultsEdit && "rounded-none border-0 bg-transparent",
        )}
      >
        {months.map((month, monthIndex) => {
          const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
          return (
            <section
              key={monthKey}
              ref={monthKey === selectedMonthKey ? selectedMonthRef : undefined}
              data-mobile-calendar-month={monthKey}
              aria-label={monthFormatter.format(month)}
              className={cn(
                carsResultsEdit ? "px-0 pb-4 pt-3" : "px-3 pb-4 pt-5 sm:px-4",
                monthIndex > 0 && "border-t border-slate-200/70",
              )}
            >
              {carsResultsEdit ? (
                <div className="mb-1 flex min-h-12 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    disabled={!canGoPrevious}
                    onClick={() =>
                      setResultsMonth((value) => addMonths(value, -1))
                    }
                    className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 disabled:opacity-35"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <h4 className="flex-1 text-center text-[16px] font-semibold leading-5 text-slate-950">
                    {monthFormatter.format(month)}
                  </h4>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() =>
                      setResultsMonth((value) => addMonths(value, 1))
                    }
                    className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-slate-200"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <h4 className="mb-3 text-center text-[17px] font-bold tracking-tight text-slate-950">
                  {monthFormatter.format(month)}
                </h4>
              )}
              <div
                className={cn(
                  "grid grid-cols-7 text-center text-[12px] font-semibold text-slate-500",
                  carsResultsEdit && "text-[10px] font-medium leading-[14px]",
                )}
              >
                {weekdays.map((weekday, index) => (
                  <span key={`${weekday}-${index}`} className="py-2">
                    {weekday}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthCells(month).map(({ date, currentMonth }) => {
                  const iso = toIsoDate(date);
                  if (!currentMonth) {
                    return (
                      <span
                        key={`blank-${iso}`}
                        data-adjacent-month-placeholder
                        aria-hidden="true"
                        className={carsResultsEdit ? "h-11" : "h-[54px]"}
                      />
                    );
                  }

                  const disabled = isDateDisabled(date);
                  const isStart = iso === startDate;
                  const isEnd = iso === endDate;
                  const inRange = Boolean(
                    start && end && date > start && date < end,
                  );
                  const hasRange = Boolean(
                    start && end && startDate !== endDate,
                  );
                  const fullDate = fullDateFormatter.format(date);
                  const endpoint = isStart
                    ? labels.start
                    : isEnd
                      ? labels.end
                      : "";
                  const ariaLabel = endpoint
                    ? `${fullDate}, ${endpoint}`
                    : `${labels.selectDatePrefix} ${fullDate}`;

                  return (
                    <div
                      key={iso}
                      className={cn(
                        "relative h-[54px] min-w-0",
                        carsResultsEdit && "h-11",
                      )}
                      data-mobile-calendar-day={iso}
                      data-range-start={isStart || undefined}
                      data-range-end={isEnd || undefined}
                      data-in-range={inRange || undefined}
                    >
                      {hasRange && (isStart || isEnd || inRange) ? (
                        <span
                          aria-hidden="true"
                          data-continuous-range-band
                          className={cn(
                            "absolute top-0 h-9 bg-[#eff6ff]",
                            inRange && "inset-x-0",
                            isStart && "start-1/2 end-0",
                            isEnd && "start-0 end-1/2",
                          )}
                        />
                      ) : null}
                      <button
                        type="button"
                        disabled={disabled}
                        aria-disabled={disabled}
                        aria-pressed={isStart || isEnd}
                        aria-label={ariaLabel}
                        onClick={() => onSelectDate(date)}
                        className={cn(
                          "focus-ring relative z-10 mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-medium transition-colors disabled:cursor-not-allowed",
                          carsResultsEdit &&
                            "h-8 w-8 rounded-lg text-xs font-normal leading-4",
                          disabled
                            ? "text-slate-300"
                            : "text-slate-900 hover:bg-blue-50 hover:text-[#075ee8]",
                          iso === todayIso &&
                            !disabled &&
                            !isStart &&
                            !isEnd &&
                            "ring-1 ring-inset ring-[#075ee8]/20",
                          isStart &&
                            "bg-[#075ee8] font-semibold text-white hover:bg-[#075ee8] hover:text-white",
                          isEnd &&
                            (carsResultsEdit
                              ? "bg-[#075ee8] font-semibold text-white hover:bg-[#075ee8] hover:text-white"
                              : "border-[1.5px] border-[#075ee8] bg-white font-semibold text-[#075ee8] hover:bg-white"),
                        )}
                      >
                        {date.getDate()}
                      </button>
                      {endpoint ? (
                        <span className="relative z-10 mt-0.5 block text-center text-[10px] font-semibold leading-3 text-[#075ee8]">
                          {endpoint}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

type MobileDatePickerDialogProps = {
  showBackAction?: boolean;
  withinDialog?: boolean;
  presentation?: "default" | "carsResultsEdit";
  open: boolean;
  title: string;
  titleId: string;
  dialogId?: string;
  launcherRef?: RefObject<HTMLElement | null>;
  startDate: string;
  endDate: string;
  rangeRequired: boolean;
  firstMonth?: Date;
  monthCount?: number;
  locale: string;
  weekdays: string[];
  labels: MobileDateRangePickerLabels;
  isDateDisabled: (date: Date) => boolean;
  onCommit: (startDate: string, endDate: string) => void;
  onClose: () => void;
};

export function MobileDatePickerDialog({
  showBackAction,
  withinDialog,
  open,
  title,
  titleId,
  dialogId,
  launcherRef,
  startDate,
  endDate,
  rangeRequired,
  firstMonth = startOfMonth(new Date()),
  monthCount = 12,
  locale,
  weekdays,
  labels,
  isDateDisabled,
  onCommit,
  onClose,
  presentation = "default",
}: MobileDatePickerDialogProps) {
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const selectedMonthRef = useRef<HTMLElement>(null);

  /* Opening a retained portal intentionally synchronizes its draft with the
     committed values owned by the product form. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setDraftStart(startDate);
    setDraftEnd(rangeRequired ? endDate : "");
    const frame = window.requestAnimationFrame(() => {
      const selectedMonth = selectedMonthRef.current;
      const scrollContainer = selectedMonth?.closest<HTMLElement>(
        "[data-flight-mobile-picker-content]",
      );
      if (startDate && selectedMonth && scrollContainer) {
        const containerTop = scrollContainer.getBoundingClientRect().top;
        const monthTop = selectedMonth.getBoundingClientRect().top;
        scrollContainer.scrollTop += monthTop - containerTop;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [endDate, open, rangeRequired, startDate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const visibleFirstMonth = useMemo(() => {
    const selected = parseIsoDate(startDate);
    if (!selected) return startOfMonth(firstMonth);
    const earliest = startOfMonth(firstMonth);
    return selected < earliest ? startOfMonth(selected) : earliest;
  }, [firstMonth, startDate]);

  const selectDate = (date: Date) => {
    if (isDateDisabled(date)) return;
    const iso = toIsoDate(date);
    if (!rangeRequired) {
      setDraftStart(iso);
      setDraftEnd("");
      return;
    }
    if (!draftStart || draftEnd) {
      setDraftStart(iso);
      setDraftEnd("");
      return;
    }
    if (iso <= draftStart) {
      setDraftStart(iso);
      setDraftEnd("");
      return;
    }
    setDraftEnd(iso);
  };

  const validDraft = Boolean(draftStart && (!rangeRequired || draftEnd));

  return (
    <FlightMobilePickerShell
      showBackAction={showBackAction}
      withinDialog={withinDialog}
      open={open}
      title={title}
      titleId={titleId}
      dialogId={dialogId}
      launcherRef={launcherRef}
      onClose={onClose}
      presentation={presentation}
      pickerMarker="flight-date"
      showCancelAction={false}
      contentClassName={cn(
        "bg-[#fcfdfe] px-4 py-4",
        presentation === "carsResultsEdit" && "bg-[#F5F7FB] px-4 py-3",
      )}
      footer={(requestClose) => (
        <button
          type="button"
          disabled={!validDraft}
          onClick={() => {
            onCommit(draftStart, rangeRequired ? draftEnd : "");
            requestClose();
          }}
          className={cn(
            "focus-ring h-[52px] w-full rounded-[9px] bg-[#075ee8] text-[16px] font-semibold text-white transition-colors hover:bg-[#004bb8] disabled:cursor-not-allowed disabled:bg-[#075ee8] disabled:text-white disabled:opacity-100",
            presentation === "carsResultsEdit" &&
              "h-12 rounded-[10px] text-[15px]",
          )}
        >
          {labels.done}
        </button>
      )}
    >
      <MobileDateRangePicker
        appearance={presentation}
        startDate={draftStart}
        endDate={draftEnd}
        firstMonth={visibleFirstMonth}
        monthCount={monthCount}
        locale={locale}
        weekdays={weekdays}
        labels={labels}
        isDateDisabled={isDateDisabled}
        onSelectDate={selectDate}
        selectedMonthRef={selectedMonthRef}
      />
    </FlightMobilePickerShell>
  );
}
