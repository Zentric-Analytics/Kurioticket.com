"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

type CalendarMode = "date" | "datetime-local";
type Props = {
  value: string;
  onChange?: (event: { target: { value: string } }) => void;
  onValueChange?: (value: string) => void;
  mode?: CalendarMode;
  min?: string;
  max?: string;
  name?: string;
  id?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  defaultTime?: string;
  timeZone?: "UTC" | "local";
  required?: boolean;
};

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]";

function realDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function shiftMonth(month: string, amount: number): string {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + amount, 1)).toISOString().slice(0, 7);
}

function monthDays(month: string): (string | null)[] {
  const [year, index] = month.split("-").map(Number);
  const offset = new Date(Date.UTC(year, index - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + length) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= length ? month + "-" + String(day).padStart(2, "0") : null;
  });
}

function displayDate(value: string, mode: CalendarMode): string {
  const day = value.slice(0, 10);
  if (!realDate(day)) return mode === "date" ? "Select date" : "Select date and time";
  const date = day.slice(5, 7) + "/" + day.slice(8, 10) + "/" + day.slice(0, 4);
  if (mode === "date") return date;
  const hour = Number(value.slice(11, 13));
  const minute = value.slice(14, 16);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || hour > 23 || Number(minute) > 59) return date;
  return date + " " + String(hour % 12 || 12) + ":" + minute + " " + (hour < 12 ? "AM" : "PM");
}

function withinBounds(day: string, min?: string, max?: string): boolean {
  return (!min || day >= min.slice(0, 10)) && (!max || day <= max.slice(0, 10));
}

/**
 * Shared admin date/date-time calendar. Every field uses an identical popover,
 * including UTC readers and local-time queue readers. The value is deliberately
 * a timezone-free ISO date or datetime-local string; callers retain control of
 * how it is converted to the backend's existing timezone contract.
 *
 * Selecting a date or time only edits this field after the popup's Apply button;
 * the page's Apply filters action remains the sole operation that loads records.
 */
export function AdminCalendarInput({
  value, onChange, onValueChange, mode = "date", min, max, name, id, ariaLabel,
  className = "", disabled = false, defaultTime = "00:00", timeZone = "UTC", required = false,
}: Props) {
  const generatedId = useId();
  const popupId = id ? id + "-calendar" : generatedId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => realDate(value.slice(0, 10))
    ? value.slice(0, 7) : new Date().toISOString().slice(0, 7));
  const [draftDay, setDraftDay] = useState("");
  const [hour, setHour] = useState("00");
  const [minute, setMinute] = useState("00");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 324, maxHeight: 430 });

  const now = new Date();
  const today = timeZone === "local"
    ? [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-")
    : now.toISOString().slice(0, 10);
  const selectedTime = mode === "datetime-local"
    ? hour.padStart(2, "0") + ":" + minute.padStart(2, "0")
    : "";
  const draftValue = mode === "date" ? draftDay : draftDay + "T" + selectedTime;
  const timeValid = mode === "date" ||
    (/^\d{1,2}$/.test(hour) && /^\d{1,2}$/.test(minute) && Number(hour) <= 23 && Number(minute) <= 59);
  const valid = realDate(draftDay) && timeValid && withinBounds(draftDay, min, max) &&
    (!min || draftValue >= min) && (!max || draftValue <= max);

  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  };

  function openCalendar() {
    if (disabled) return;
    const currentDay = realDate(value.slice(0, 10)) ? value.slice(0, 10) : "";
    const initialMonth = currentDay || (min && realDate(min.slice(0, 10)) && today < min.slice(0, 10)
      ? min.slice(0, 10) : today);
    setDraftDay(currentDay);
    setMonth(initialMonth.slice(0, 7));
    const time = mode === "datetime-local" && /^\d{2}:\d{2}$/.test(value.slice(11, 16))
      ? value.slice(11, 16) : defaultTime;
    setHour(time.slice(0, 2));
    setMinute(time.slice(3, 5));

    const anchor = triggerRef.current?.getBoundingClientRect();
    if (anchor) {
      const width = Math.min(324, window.innerWidth - 24);
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, anchor.right - width));
      const desiredHeight = mode === "date" ? 390 : 490;
      const below = window.innerHeight - anchor.bottom - 12;
      const above = anchor.top - 12;
      const flip = below < desiredHeight && above > below;
      const available = Math.max(150, (flip ? above : below) - 8);
      const maxHeight = Math.min(desiredHeight, available);
      setPosition({
        width, left, maxHeight,
        top: flip ? Math.max(8, anchor.top - maxHeight - 8) : anchor.bottom + 8,
      });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!triggerRef.current?.contains(target) && !dialogRef.current?.contains(target)) close();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const resize = () => close();
    const scroll = (event: Event) => {
      if (event.target instanceof Node && dialogRef.current?.contains(event.target)) return;
      close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keydown);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open]);

  const title = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" })
    .format(new Date(month + "-01T00:00:00.000Z"));
  return (
    <>
      <input type={mode} name={name} value={value} required={required} min={min} max={max}
        readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
      <button id={id} type="button" ref={triggerRef} disabled={disabled}
        aria-label={ariaLabel || (mode === "date" ? "Choose date" : "Choose date and time")}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? popupId : undefined}
        onClick={() => open ? close() : openCalendar()}
        className={"inline-flex h-10 w-[210px] max-w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#D8E1EC] bg-white px-3 text-left text-[13px] font-medium text-[#334155] shadow-[0_1px_0_rgba(2,6,23,0.04)] transition-colors hover:border-[#94A3B8] disabled:cursor-not-allowed disabled:opacity-50 " + focusRing + " " + className}>
        <span className="min-w-0 truncate tabular-nums">{displayDate(value, mode)}</span>
        <CalendarDays size={16} aria-hidden="true" className="shrink-0 text-[#64748B]" />
      </button>
      {open && typeof document !== "undefined" ? createPortal(
        <div id={popupId} ref={dialogRef} role="dialog" tabIndex={-1}
          aria-label={ariaLabel || (mode === "date" ? "Choose date" : "Choose date and time")}
          data-testid="admin-calendar-popup"
          style={{ position: "fixed", top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
          className="z-[200] max-w-[calc(100vw-24px)] overflow-y-auto overscroll-contain rounded-xl border border-[#CAD6E5] bg-white p-3 shadow-[0_18px_45px_-12px_rgba(2,6,23,0.28)] outline-none">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(current => shiftMonth(current, -1))}
              className={"grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#D8E1EC] text-[#334155] hover:bg-[#F1F7FF] " + focusRing}>
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <h3 className="text-[13px] font-semibold text-[#020617]">{title}</h3>
            <button type="button" aria-label="Next month" onClick={() => setMonth(current => shiftMonth(current, 1))}
              className={"grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#D8E1EC] text-[#334155] hover:bg-[#F1F7FF] " + focusRing}>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div role="grid" aria-label="Calendar dates" className="grid grid-cols-7 gap-1">
            {weekdays.map(day => <span role="columnheader" key={day} className="py-1 text-center text-[11px] font-semibold text-[#64748B]">{day}</span>)}
            {monthDays(month).map((day, index) => day ? (
              <button type="button" role="gridcell" key={day}
                aria-label={new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" })
                  .format(new Date(day + "T00:00:00.000Z"))}
                aria-selected={draftDay === day} disabled={!withinBounds(day, min, max)}
                onClick={() => setDraftDay(day)}
                className={"grid h-8 min-w-0 place-items-center rounded-lg text-[12px] disabled:cursor-not-allowed disabled:opacity-30 " + focusRing + " " +
                  (draftDay === day ? "bg-[#004BB8] font-semibold text-white" :
                    day === today ? "border border-[#004BB8] text-[#004BB8] hover:bg-[#F1F7FF]" :
                      "text-[#334155] hover:bg-[#F1F7FF]")}>
                {Number(day.slice(8, 10))}
              </button>
            ) : <span aria-hidden="true" key={"blank-" + index} />)}
          </div>
          {mode === "datetime-local" ? (
            <div className="mt-3 border-t border-[#E7ECF5] pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#334155]">
                <Clock3 size={15} aria-hidden="true" /> Time (24-hour clock)
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-[#64748B]">Hour
                  <input type="number" min={0} max={23} inputMode="numeric" value={hour}
                    onChange={event => setHour(event.target.value)}
                    className={"mt-1 h-9 w-16 rounded-lg border border-[#D8E1EC] px-2 text-center text-[13px] text-[#020617] " + focusRing} />
                </label>
                <span className="mt-4 text-[#334155]">:</span>
                <label className="text-[11px] text-[#64748B]">Minute
                  <input type="number" min={0} max={59} inputMode="numeric" value={minute}
                    onChange={event => setMinute(event.target.value)}
                    className={"mt-1 h-9 w-16 rounded-lg border border-[#D8E1EC] px-2 text-center text-[13px] text-[#020617] " + focusRing} />
                </label>
              </div>
            </div>
          ) : null}
          {!valid && draftDay ? <p role="status" className="mt-2 text-[11px] text-rose-700">
            Choose a date{mode === "datetime-local" ? " and time" : ""} within the permitted range.
          </p> : null}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#E7ECF5] pt-3">
            <button type="button" disabled={!withinBounds(today, min, max)}
              onClick={() => { setDraftDay(today); setMonth(today.slice(0, 7)); }}
              className={"rounded-lg px-2 py-2 text-[12px] font-medium text-[#004BB8] hover:bg-[#F1F7FF] disabled:opacity-30 " + focusRing}>
              Today
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => close(true)}
                className={"rounded-lg border border-[#D8E1EC] px-3 py-2 text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC] " + focusRing}>
                Cancel
              </button>
              <button type="button" disabled={!valid}
                onClick={() => { if (valid) { onValueChange?.(draftValue); onChange?.({ target: { value: draftValue } }); close(true); } }}
                className={"rounded-lg bg-[#004BB8] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#003D97] disabled:cursor-not-allowed disabled:opacity-40 " + focusRing}>
                Apply date
              </button>
            </div>
          </div>
        </div>, document.body
      ) : null}
    </>
  );
}

/** Uncontrolled adapter for the legacy server-rendered trips records GET form. */
export function AdminUncontrolledCalendarInput({ defaultValue = "", ...props }: Omit<Props, "value" | "onChange" | "onValueChange"> & { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  return <AdminCalendarInput {...props} value={value} onValueChange={setValue} />;
}
