"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Minus, Plus, Search, UserRound } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { HotelDesktopPopover } from "@/components/search/HotelDesktopPopover";
import { parseHotelDetailsSearchCount, parseHotelDetailsSearchDate, type HotelDetailsSearchContext } from "./hotelDetailsPresentation";
import styles from "./DesktopHotelStayEditor.module.css";

type DatePart = "checkIn" | "checkOut";
type Popup = DatePart | "guests" | null;
type Draft = { checkIn: string; checkOut: string; guests: number; rooms: number };

const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localToday = () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()); };
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const monthStart = (date: Date, offset = 0) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
const monthDays = (month: Date) => Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), 1 - ((month.getDay() + 6) % 7) + index));
const dateLabel = (value: string, fallback: string) => {
  const date = parseHotelDetailsSearchDate(value);
  return date ? new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "numeric" }).format(date).replace(",", "") : fallback;
};

function DateRangePopup({ start, end, initialPart, onChange, onClose }: { start: string; end: string; initialPart: DatePart; onChange: (start: string, end: string) => void; onClose: () => void }) {
  const today = localToday();
  const startDate = parseHotelDetailsSearchDate(start);
  const initialMode = initialPart === "checkOut" && startDate && startDate >= today ? "checkOut" : "checkIn";
  const initialMinimum = initialMode === "checkOut" && startDate ? addDays(startDate, 1) : today;
  const selected = parseHotelDetailsSearchDate(initialMode === "checkIn" ? start : end);
  const initialFocus = selected && selected >= initialMinimum ? selected : initialMinimum;
  const [part, setPart] = useState<DatePart>(initialMode);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(initialFocus));
  const [focusedDate, setFocusedDate] = useState(() => isoDate(initialFocus));
  const calendarRef = useRef<HTMLDivElement>(null);
  const minimum = part === "checkOut" && startDate ? addDays(startDate >= today ? startDate : today, 1) : today;
  const minimumIso = isoDate(minimum);
  const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
  const fullFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => { calendarRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`)?.focus({ preventScroll: true }); }, [focusedDate]);

  function focusDate(date: Date) {
    const next = date < minimum ? minimum : date;
    if (next < visibleMonth || next >= monthStart(visibleMonth, 2)) setVisibleMonth(monthStart(next));
    setFocusedDate(isoDate(next));
    requestAnimationFrame(() => calendarRef.current?.querySelector<HTMLButtonElement>(`[data-date="${isoDate(next)}"]`)?.focus({ preventScroll: true }));
  }

  function selectDate(date: Date) {
    if (date < minimum) return;
    const value = isoDate(date);
    if (part === "checkIn") {
      const nextEnd = end > value ? end : "";
      onChange(value, nextEnd);
      setPart("checkOut");
      const nextFocus = parseHotelDetailsSearchDate(nextEnd) ?? addDays(date, 1);
      if (nextFocus < visibleMonth || nextFocus >= monthStart(visibleMonth, 2)) setVisibleMonth(monthStart(nextFocus));
      setFocusedDate(isoDate(nextFocus));
    } else {
      onChange(start, value);
      onClose();
    }
  }

  function dayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -((date.getDay() + 6) % 7), End: 6 - ((date.getDay() + 6) % 7) };
    if (event.key in offsets) { event.preventDefault(); focusDate(addDays(date, offsets[event.key])); }
    else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const offset = (event.key === "PageDown" ? 1 : -1) * (event.shiftKey ? 12 : 1);
      const targetMonth = monthStart(date, offset);
      focusDate(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(date.getDate(), new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate())));
    }
  }

  function moveMonth(offset: number) {
    const next = monthStart(visibleMonth, offset);
    if (next < monthStart(minimum)) return;
    setVisibleMonth(next);
    const firstEnabled = next < minimum ? minimum : next;
    // Keep one enabled day in the keyboard tab sequence after changing months.
    if (focusedDate < isoDate(next) || focusedDate >= isoDate(monthStart(next, 2))) setFocusedDate(isoDate(firstEnabled));
  }

  return <div ref={calendarRef} className={styles.calendar}>
    <p className={styles.keyboardHint} aria-live="polite">{part === "checkIn" ? "Select check-in date" : "Select check-out date"}</p>
    <div className={styles.monthNavigation}><button type="button" aria-label="Previous month" disabled={visibleMonth <= monthStart(minimum)} onClick={() => moveMonth(-1)}><ChevronLeft size={20} /></button><button type="button" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={20} /></button></div>
    <div className={styles.months}>
      {[0, 1].map(offset => {
        const month = monthStart(visibleMonth, offset);
        const cells = monthDays(month);
        const heading = monthFormatter.format(month);
        return <section key={isoDate(month)} className={styles.month} aria-label={heading}>
          <h3 aria-live="polite">{heading}</h3>
          <div role="grid" aria-label={heading}>
            <div role="row" className={styles.weekdays}>{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(day => <span role="columnheader" key={day}>{day}</span>)}</div>
            {Array.from({ length: 6 }, (_, row) => <div role="row" className={styles.week} key={row}>
              {cells.slice(row * 7, row * 7 + 7).map(date => {
                const iso = isoDate(date);
                if (date.getMonth() !== month.getMonth()) return <span role="gridcell" key={iso} />;
                const disabled = iso < minimumIso;
                const isStart = iso === start;
                const isEnd = iso === end;
                const inRange = Boolean(start && end && iso > start && iso < end);
                const hasRange = Boolean(start && end && end > start);
                return <span role="gridcell" key={iso} aria-selected={isStart || isEnd || inRange} className={styles.dayCell} data-range={hasRange && (inRange || isStart || isEnd) || undefined} data-start={hasRange && isStart || undefined} data-end={hasRange && isEnd || undefined}>
                  <button type="button" data-date={iso} disabled={disabled} tabIndex={iso === focusedDate ? 0 : -1} aria-label={`${fullFormatter.format(date)}${isStart ? ", check-in" : isEnd ? ", check-out" : ""}`} aria-current={iso === isoDate(today) ? "date" : undefined} aria-pressed={isStart || isEnd} onClick={() => selectDate(date)} onKeyDown={event => dayKeyDown(event, date)}>{date.getDate()}</button>
                </span>;
              })}
            </div>)}
          </div>
        </section>;
      })}
    </div>
    <p className={styles.keyboardHint}>Use arrow keys to move between dates.</p>
  </div>;
}

function OccupancyPopup({ draft, onChange, onClose }: { draft: Draft; onChange: (field: "guests" | "rooms", value: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true }); }, []);
  return <div ref={ref} className={styles.occupancy}>
    {([{ field: "guests", label: "Guests", maximum: 12 }, { field: "rooms", label: "Rooms", maximum: 6 }] as const).map(({ field, label, maximum }) => <div className={styles.counter} key={field}><strong>{label}</strong><div><button type="button" disabled={draft[field] <= 1} aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => onChange(field, draft[field] - 1)}><Minus size={16} /></button><span aria-live="polite" aria-label={`${draft[field]} ${label.toLowerCase()}`}>{draft[field]}</span><button type="button" disabled={draft[field] >= maximum} aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(field, draft[field] + 1)}><Plus size={16} /></button></div></div>)}
    <button type="button" className={styles.doneButton} onClick={onClose}>Done</button>
  </div>;
}

function StayEditor({ context }: { context?: HotelDetailsSearchContext }) {
  const id = useId();
  const [draft, setDraft] = useState<Draft>(() => ({ checkIn: context?.checkIn ?? "", checkOut: context?.checkOut ?? "", guests: parseHotelDetailsSearchCount(context?.guests, 1, 12) ?? 1, rooms: parseHotelDetailsSearchCount(context?.rooms, 1, 6) ?? 1 }));
  const [popup, setPopup] = useState<Popup>(null);
  const [error, setError] = useState("");
  const datesRef = useRef<HTMLDivElement>(null);
  const guestsRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const openPopup = useRef<Popup>(null);
  const closePopup = useCallback(() => {
    const wasOpen = openPopup.current !== null;
    openPopup.current = null;
    setPopup(null);
    const trigger = opener.current;
    if (wasOpen) requestAnimationFrame(() => { if (openPopup.current === null) trigger?.focus({ preventScroll: true }); });
  }, []);

  useEffect(() => {
    if (!popup) return;
    function escape(event: globalThis.KeyboardEvent) { if (event.key === "Escape") { event.preventDefault(); closePopup(); } }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [closePopup, popup]);

  function toggle(next: Exclude<Popup, null>, trigger: HTMLButtonElement) {
    if (popup === next) { closePopup(); return; }
    opener.current = trigger;
    openPopup.current = next;
    setPopup(next);
  }

  function search() {
    const start = parseHotelDetailsSearchDate(draft.checkIn);
    const end = parseHotelDetailsSearchDate(draft.checkOut);
    if (!start || start < localToday()) { setError("Choose a check-in date today or later."); return; }
    if (!end || end <= start) { setError("Choose a check-out date after check-in."); return; }
    setError("");
    closePopup();
    const url = new URL(window.location.href);
    url.searchParams.set("checkIn", draft.checkIn);
    url.searchParams.set("checkOut", draft.checkOut);
    url.searchParams.set("guests", String(draft.guests));
    url.searchParams.set("rooms", String(draft.rooms));
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  }

  return <div className={styles.editor} data-desktop-hotel-stay-editor>
    <div className={styles.controls}>
      <div className={styles.dates} ref={datesRef}>
        <button type="button" className={styles.control} aria-label={`Check-in: ${dateLabel(draft.checkIn, "Choose date")}`} aria-haspopup="dialog" aria-expanded={popup === "checkIn"} aria-controls={popup === "checkIn" ? `${id}-dates` : undefined} onClick={event => toggle("checkIn", event.currentTarget)}><CalendarDays size={18} aria-hidden="true" /><span>{dateLabel(draft.checkIn, "Check-in")}</span></button>
        <span className={styles.dateSeparator} aria-hidden="true">–</span>
        <button type="button" className={styles.control} aria-label={`Check-out: ${dateLabel(draft.checkOut, "Choose date")}`} aria-haspopup="dialog" aria-expanded={popup === "checkOut"} aria-controls={popup === "checkOut" ? `${id}-dates` : undefined} onClick={event => toggle("checkOut", event.currentTarget)}><CalendarDays size={18} aria-hidden="true" /><span>{dateLabel(draft.checkOut, "Check-out")}</span></button>
      </div>
      <button ref={guestsRef} type="button" className={`${styles.control} ${styles.guestsControl}`} aria-label={`${draft.guests} ${draft.guests === 1 ? "guest" : "guests"}, ${draft.rooms} ${draft.rooms === 1 ? "room" : "rooms"}`} aria-haspopup="dialog" aria-expanded={popup === "guests"} aria-controls={popup === "guests" ? `${id}-guests` : undefined} onClick={event => toggle("guests", event.currentTarget)}><UserRound size={18} aria-hidden="true" /><span>{draft.guests} {draft.guests === 1 ? "guest" : "guests"}, {draft.rooms} {draft.rooms === 1 ? "room" : "rooms"}</span></button>
      <button type="button" className={styles.search} aria-label="Search hotel rates for this stay" onClick={search}><Search size={18} aria-hidden="true" /></button>
    </div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <HotelDesktopPopover open={popup === "checkIn" || popup === "checkOut"} launcherRef={datesRef} preferredWidth={732} desiredHeight={390} onClose={closePopup} className={styles.popover} id={`${id}-dates`} ariaLabel="Choose stay dates">
      {popup === "checkIn" || popup === "checkOut" ? <DateRangePopup key={popup} initialPart={popup} start={draft.checkIn} end={draft.checkOut} onChange={(checkIn, checkOut) => { setDraft(current => ({ ...current, checkIn, checkOut })); setError(""); }} onClose={closePopup} /> : null}
    </HotelDesktopPopover>
    <HotelDesktopPopover open={popup === "guests"} launcherRef={guestsRef} preferredWidth={310} desiredHeight={190} onClose={closePopup} className={styles.popover} id={`${id}-guests`} ariaLabel="Guests and rooms">
      <OccupancyPopup draft={draft} onChange={(field, value) => setDraft(current => ({ ...current, [field]: value }))} onClose={closePopup} />
    </HotelDesktopPopover>
  </div>;
}

export function DesktopHotelStayEditor({ context }: { context?: HotelDetailsSearchContext }) {
  return <StayEditor key={`${context?.checkIn}|${context?.checkOut}|${context?.guests}|${context?.rooms}`} context={context} />;
}
