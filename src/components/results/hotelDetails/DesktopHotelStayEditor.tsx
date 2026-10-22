"use client";

import { CalendarDays, Minus, Plus, Search, UserRound } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { HotelDesktopPopover } from "@/components/search/HotelDesktopPopover";
import { parseHotelDetailsSearchCount, parseHotelDetailsSearchDate, type HotelDetailsSearchContext } from "./hotelDetailsPresentation";
import styles from "./DesktopHotelStayEditor.module.css";

type DatePart = "checkIn" | "checkOut";
type Popup = DatePart | "guests" | null;
type Draft = { checkIn: string; checkOut: string; guests: number; rooms: number };

const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localToday = () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()); };
const monthStart = (date: Date, offset = 0) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
const dateLabel = (value: string, fallback: string) => {
  const date = parseHotelDetailsSearchDate(value);
  return date ? new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "numeric" }).format(date).replace(",", "") : fallback;
};
function DateRangePopup({
  start,
  end,
  onChange,
  onClose,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  onClose: () => void;
}) {
  const today = localToday();
  const initialDate = parseHotelDetailsSearchDate(start);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    monthStart(initialDate && initialDate >= today ? initialDate : today),
  );
  const monthFormatter = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  });
  const fullFormatter = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const weekdays = Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(
      new Date(2024, 0, 7 + day),
    ),
  );

  function resultMonthCells(month: Date) {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = firstDay.getDay();
    const firstCell = new Date(
      month.getFullYear(),
      month.getMonth(),
      1 - startOffset,
    );

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        firstCell.getFullYear(),
        firstCell.getMonth(),
        firstCell.getDate() + index,
      );
      return { date, isCurrentMonth: date.getMonth() === month.getMonth() };
    });
  }

  function selectDate(date: Date) {
    if (date < today) return;
    const selectedIso = isoDate(date);

    if (!start || (start && end)) {
      onChange(selectedIso, "");
      return;
    }

    if (selectedIso <= start) {
      onChange(selectedIso, "");
      return;
    }

    onChange(start, selectedIso);
  }

  function moveMonth(offset: number) {
    setVisibleMonth((current) => {
      const next = monthStart(current, offset);
      return next < monthStart(today) ? current : next;
    });
  }

  return (
    <div className={styles.calendar}>
      <p className={styles.calendarTitle}>Choose travel dates</p>
      <div className={styles.calendarNavigation}>
        <button
          type="button"
          disabled={visibleMonth <= monthStart(today)}
          onClick={() => moveMonth(-1)}
        >
          Previous
        </button>
        <button type="button" onClick={() => moveMonth(1)}>
          Next
        </button>
      </div>

      <div className={styles.calendarMonths}>
        {[0, 1].map((offset) => {
          const month = monthStart(visibleMonth, offset);
          const cells = resultMonthCells(month);
          const heading = monthFormatter.format(month);

          return (
            <section key={isoDate(month)} className={styles.calendarMonth} aria-label={heading}>
              <p>{heading}</p>
              <div className={styles.calendarWeekdays}>
                {weekdays.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className={styles.calendarGrid}>
                {cells.map(({ date, isCurrentMonth }) => {
                  const value = isoDate(date);
                  const isPast = date < today;
                  const isStart = value === start;
                  const isEnd = value === end;
                  const isInRange = Boolean(
                    start &&
                      end &&
                      !isPast &&
                      value > start &&
                      value < end,
                  );

                  if (!isCurrentMonth) {
                    return <span key={value} aria-hidden="true" />;
                  }

                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isPast}
                      aria-label={`Select date ${fullFormatter.format(date)}`}
                      aria-pressed={isStart || isEnd}
                      data-in-range={isInRange || undefined}
                      onClick={() => selectDate(date)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className={styles.calendarFooter}>
        <button type="button" className={styles.calendarSecondary} onClick={() => onChange("", "")}>
          Clear
        </button>
        <button type="button" className={styles.calendarPrimary} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function OccupancyPopup({ draft, onChange }: { draft: Draft; onChange: (field: "guests" | "rooms", value: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true }); }, []);
  return <div ref={ref} className={styles.occupancy}>
    {([{ field: "guests", label: "Guests", maximum: 12 }, { field: "rooms", label: "Rooms", maximum: 6 }] as const).map(({ field, label, maximum }) => <div className={styles.counter} key={field}><strong>{label}</strong><div><button type="button" disabled={draft[field] <= 1} aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => onChange(field, draft[field] - 1)}><Minus size={16} /></button><span aria-live="polite" aria-label={`${draft[field]} ${label.toLowerCase()}`}>{draft[field]}</span><button type="button" disabled={draft[field] >= maximum} aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(field, draft[field] + 1)}><Plus size={16} /></button></div></div>)}
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
    // A changed stay must discard the previous detail session and reload its inventory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  }

  return <div className={styles.editor} data-desktop-hotel-stay-editor>
    <div className={styles.controls}>
      <div className={styles.dates} ref={datesRef}>
        <button type="button" className={`${styles.control} ${styles.dateControl}`} aria-label={`Check-in: ${dateLabel(draft.checkIn, "Choose date")}`} aria-haspopup="dialog" aria-expanded={popup === "checkIn"} aria-controls={popup === "checkIn" ? `${id}-dates` : undefined} onClick={event => toggle("checkIn", event.currentTarget)}><CalendarDays size={20} aria-hidden="true" /><span className={styles.dateText}>{dateLabel(draft.checkIn, "Choose date")}</span></button>
        <span className={styles.dateSeparator} aria-hidden="true">-</span>
        <button type="button" className={`${styles.control} ${styles.dateControl}`} aria-label={`Check-out: ${dateLabel(draft.checkOut, "Choose date")}`} aria-haspopup="dialog" aria-expanded={popup === "checkOut"} aria-controls={popup === "checkOut" ? `${id}-dates` : undefined} onClick={event => toggle("checkOut", event.currentTarget)}><CalendarDays size={20} aria-hidden="true" /><span className={styles.dateText}>{dateLabel(draft.checkOut, "Choose date")}</span></button>
      </div>
      <button ref={guestsRef} type="button" className={`${styles.control} ${styles.guestsControl}`} aria-label={`${draft.guests} ${draft.guests === 1 ? "guest" : "guests"}, ${draft.rooms} ${draft.rooms === 1 ? "room" : "rooms"}`} aria-haspopup="dialog" aria-expanded={popup === "guests"} aria-controls={popup === "guests" ? `${id}-guests` : undefined} onClick={event => toggle("guests", event.currentTarget)}><UserRound size={20} aria-hidden="true" /><span>{draft.guests} {draft.guests === 1 ? "guest" : "guests"}, {draft.rooms} {draft.rooms === 1 ? "room" : "rooms"}</span></button>
      <button type="button" className={styles.search} aria-label="Search hotel rates for this stay" onClick={search}><Search size={24} aria-hidden="true" /></button>
    </div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <HotelDesktopPopover open={popup === "checkIn" || popup === "checkOut"} launcherRef={datesRef} preferredWidth={570} desiredHeight={420} onClose={closePopup} className={styles.popover} id={`${id}-dates`} ariaLabel="Choose stay dates">
      {popup === "checkIn" || popup === "checkOut" ? <DateRangePopup start={draft.checkIn} end={draft.checkOut} onChange={(checkIn, checkOut) => { setDraft(current => ({ ...current, checkIn, checkOut })); setError(""); }} onClose={closePopup} /> : null}
    </HotelDesktopPopover>
    <HotelDesktopPopover open={popup === "guests"} launcherRef={guestsRef} preferredWidth={310} desiredHeight={144} onClose={closePopup} className={styles.popover} id={`${id}-guests`} ariaLabel="Guests and rooms">
      <OccupancyPopup draft={draft} onChange={(field, value) => setDraft(current => ({ ...current, [field]: value }))} />
    </HotelDesktopPopover>
  </div>;
}

export function DesktopHotelStayEditor({ context }: { context?: HotelDetailsSearchContext }) {
  return <StayEditor key={`${context?.checkIn}|${context?.checkOut}|${context?.guests}|${context?.rooms}`} context={context} />;
}
