"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import {
  composeUtcExpiration,
  formatUtcExpiration,
  moveUtcMonth,
  parseUtcExpiration,
  utcMonthGrid,
} from "@/lib/teamAccessExpiration";

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const commonFocus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]";

type Props = { id?: string; initialValue?: string | null; compact?: boolean };

/** Compact, keyboard-accessible UTC picker shared by Add and Edit Team Access.
 * An explicit ISO timestamp is posted to the existing API; clearing submits "".
 * No permissions, role values, or API validation rules live in this component. */
export function TeamAccessExpiryPicker({ id, initialValue = "", compact = false }: Props) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(initialValue || "");
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [maxHeight, setMaxHeight] = useState(400);
  const [draftDate, setDraftDate] = useState("");
  const [draftHour, setDraftHour] = useState("23");
  const [draftMinute, setDraftMinute] = useState("59");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [previousInitialValue, setPreviousInitialValue] = useState(initialValue);
  if (previousInitialValue !== initialValue) {
    setPreviousInitialValue(initialValue);
    setValue(initialValue || "");
  }

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus({ preventScroll: true });
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const show = () => {
    const parts = parseUtcExpiration(value);
    const todayUtc = new Date().toISOString().slice(0, 10);
    setDraftDate(parts?.date || "");
    setDraftHour(parts?.hour || "23");
    setDraftMinute(parts?.minute || "59");
    setMonth((parts?.date || todayUtc).slice(0, 7));
    const anchor = triggerRef.current?.getBoundingClientRect();
    if (anchor) {
      const below = window.innerHeight - anchor.bottom - 16;
      const aboveRoom = anchor.top - 16;
      const flip = below < 370 && aboveRoom > below;
      setAbove(flip);
      setMaxHeight(Math.max(170, Math.min(400, flip ? aboveRoom : below)));
    }
    setOpen(true);
  };

  const selectedValue = composeUtcExpiration(draftDate, draftHour, draftMinute);
  const monthTitle = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" })
    .format(new Date(month + "-01T00:00:00.000Z"));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <span id={fieldId + "-label"}
        className={"mb-1.5 block font-semibold text-[#020617] " + (compact ? "text-[12px]" : "text-[13px]")}>
        Access expiration
      </span>
      <input type="hidden" name="expiresAt" value={value} readOnly />
      <button id={fieldId + "-trigger"} ref={triggerRef} type="button"
        aria-labelledby={fieldId + "-label " + fieldId + "-value"}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? fieldId + "-popup" : undefined}
        onClick={() => open ? setOpen(false) : show()}
        className={"flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#D8E1EC] bg-white px-3 text-left text-[13px] text-[#334155] shadow-[0_1px_0_rgba(2,6,23,0.04)] transition-colors hover:border-[#94A3B8] " + commonFocus}>
        <span id={fieldId + "-value"} className="min-w-0 truncate">{formatUtcExpiration(value)}</span>
        <CalendarDays size={16} aria-hidden="true" className="shrink-0 text-[#64748B]" />
      </button>
      {open ? (
        <div id={fieldId + "-popup"} ref={dialogRef} role="dialog" tabIndex={-1}
          aria-label="Choose access expiration in UTC"
          style={{ maxHeight }}
          className={"absolute left-0 z-[80] w-[min(312px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-[#CAD6E5] bg-white p-3 shadow-[0_16px_36px_-14px_rgba(2,6,23,0.32)] outline-none " +
            (above ? "bottom-full mb-2" : "top-full mt-2")}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(current => moveUtcMonth(current, -1))}
              className={"grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#D8E1EC] hover:bg-[#F1F7FF] " + commonFocus}>
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <span className="text-[13px] font-semibold text-[#020617]">{monthTitle}</span>
            <button type="button" aria-label="Next month" onClick={() => setMonth(current => moveUtcMonth(current, 1))}
              className={"grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#D8E1EC] hover:bg-[#F1F7FF] " + commonFocus}>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div role="grid" aria-label="Expiration date (UTC)" className="grid grid-cols-7 gap-1">
            {weekdays.map(day => <span role="columnheader" key={day} className="py-1 text-center text-[10px] font-semibold text-[#64748B]">{day}</span>)}
            {utcMonthGrid(month).map((date, index) => date ? (
              <button key={date} type="button" role="gridcell"
                aria-label={new Intl.DateTimeFormat("en-US", {
                  timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric",
                }).format(new Date(date + "T00:00:00.000Z"))}
                aria-selected={date === draftDate}
                onClick={() => setDraftDate(date)}
                className={"grid h-8 min-w-0 place-items-center rounded-md text-[12px] " + commonFocus + " " +
                  (date === draftDate ? "bg-[#004BB8] font-semibold text-white" :
                    date === today ? "border border-[#004BB8] text-[#004BB8] hover:bg-[#F1F7FF]" :
                      "text-[#334155] hover:bg-[#F1F7FF]")}>
                {Number(date.slice(8, 10))}
              </button>
            ) : <span key={"blank-" + index} aria-hidden="true" />)}
          </div>
          <div className="mt-3 border-t border-[#E7ECF5] pt-3">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#334155]">
              <Clock3 size={15} aria-hidden="true" /> Time (UTC)
            </div>
            <div className="flex items-center gap-2">
              <input aria-label="Hour (UTC)" inputMode="numeric" maxLength={2} type="text"
                value={draftHour} onChange={event => setDraftHour(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                className={"h-9 w-14 rounded-lg border border-[#D8E1EC] bg-white text-center text-[13px] text-[#020617] " + commonFocus} />
              <span className="font-semibold text-[#334155]">:</span>
              <input aria-label="Minute (UTC)" inputMode="numeric" maxLength={2} type="text"
                value={draftMinute} onChange={event => setDraftMinute(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                className={"h-9 w-14 rounded-lg border border-[#D8E1EC] bg-white text-center text-[13px] text-[#020617] " + commonFocus} />
              <span className="text-[11px] text-[#64748B]">24-hour clock</span>
            </div>
            <p className="mt-2 min-h-4 text-[11px] text-[#64748B]">
              {draftDate ? selectedValue ? formatUtcExpiration(selectedValue) : "Enter a valid hour and minute." : "Choose a date, then set the time."}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#E7ECF5] pt-3">
            <button type="button" onClick={() => { setValue(""); setOpen(false); }}
              className={"rounded-md px-2 py-2 text-[12px] font-medium text-[#475569] hover:bg-[#F1F5F9] " + commonFocus}>
              Clear
            </button>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setOpen(false)}
                className={"rounded-md border border-[#D8E1EC] px-3 py-2 text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC] " + commonFocus}>
                Cancel
              </button>
              <button type="button" disabled={!selectedValue}
                onClick={() => { if (selectedValue) { setValue(selectedValue); setOpen(false); } }}
                className={"rounded-md bg-[#004BB8] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#003D97] disabled:cursor-not-allowed disabled:opacity-50 " + commonFocus}>
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
