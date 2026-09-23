"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Minus, Plus, X } from "lucide-react";
import { MobileDatePickerDialog } from "@/components/search/MobileDateRangePicker";
import { acquireMobileResultsScrollLock } from "@/lib/search/mobileResultsScrollLock";
import { isIosHotelMobileWeb } from "@/lib/hotels/iosHotelMobileWeb";
import styles from "./MobileHotelStayEditor.module.css";

type Stay = { checkIn: string; checkOut: string; guests: number; rooms: number };
const stayKey = (stay: Stay) => [stay.checkIn, stay.checkOut, stay.guests, stay.rooms].join("|");

type Props = Stay & { onClose: () => void; onCommit: (stay: Stay) => void };

export function MobileHotelStayEditor({ onClose, onCommit, ...initial }: Props) {
  const [stay, setStay] = useState(initial);
  const [pendingStayKey, setPendingStayKey] = useState<string | null>(null);
  const updating = pendingStayKey !== null && pendingStayKey !== stayKey(initial);
  const [view, setView] = useState<"menu" | "dates" | "counts">("menu");
  const [guests, setGuests] = useState(initial.guests);
  const [rooms, setRooms] = useState(initial.rooms);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const release = acquireMobileResultsScrollLock();
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); release(); opener?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    if (isIosHotelMobileWeb()) dialogRef.current?.focus({ preventScroll: true });
    else closeRef.current?.focus({ preventScroll: true });
  }, [view]);
  const back = () => { if (!updating) { if (view === "menu") onClose(); else setView("menu"); } };
  const commit = (next: Stay) => {
    setView("menu");
    if (next.checkIn === stay.checkIn && next.checkOut === stay.checkOut && next.guests === stay.guests && next.rooms === stay.rooms) return;
    setStay(next);
    setPendingStayKey(stayKey(next));
    onCommit(next);
  };
  const formatDate = (date: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Select date";
  const title = view === "menu" ? "Edit stay" : view === "dates" ? "Travel dates" : "Rooms and guests";
  return <dialog ref={dialogRef} tabIndex={-1} className={`${styles.dialog} ${view === "dates" ? styles.calendarDialog : ""}`} aria-labelledby="hotel-stay-editor-title" onCancel={event => { event.preventDefault(); back(); }} onClick={event => { if (event.target === event.currentTarget) back(); }}>
    <div className={styles.surface} aria-busy={updating}>
      {view !== "dates" ? <header><h2 id="hotel-stay-editor-title">{title}</h2>{view === "menu" ? <button ref={closeRef} disabled={updating} type="button" aria-label="Close stay editor" onClick={back}><X size={20} /></button> : null}</header> : null}
      {updating ? <p role="status" className={styles.updating}>Updating stay…</p> : null}
      {view === "menu" ? <>
        <button type="button" disabled={updating} className={styles.option} onClick={() => setView("dates")}><span><small>Dates</small><strong>{formatDate(stay.checkIn)} – {formatDate(stay.checkOut)}</strong></span><ChevronRight size={20} /></button>
        <hr />
        <button type="button" disabled={updating} className={styles.option} onClick={() => { setGuests(stay.guests); setRooms(stay.rooms); setView("counts"); }}><span><small>Rooms and guests</small><strong>{stay.rooms} {stay.rooms === 1 ? "room" : "rooms"}, {stay.guests} {stay.guests === 1 ? "guest" : "guests"}</strong></span><ChevronRight size={20} /></button>
      </> : view === "dates" ? <MobileDatePickerDialog open withinDialog showBackAction={false} title="Choose travel dates" titleId="hotel-stay-editor-title" startDate={stay.checkIn} endDate={stay.checkOut} rangeRequired locale="en-US" weekdays={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]} labels={{ selectDates: "Select dates", start: "Check-in", end: "Check-out", done: "Done", selectDatePrefix: "Select date" }} isDateDisabled={date => { const today = new Date(); today.setHours(0, 0, 0, 0); return date < today; }} onCommit={(checkIn, checkOut) => commit({ ...stay, checkIn, checkOut })} onClose={() => setView("menu")} /> : <>
        {([{ label: "Rooms", value: rooms, min: 1, max: Math.min(6, guests), set: setRooms }, { label: "Guests", value: guests, min: Math.max(1, rooms), max: 12, set: setGuests }]).map(counter => <div className={styles.counter} key={counter.label}>
          <strong>{counter.label}</strong><div><button type="button" aria-label={`Decrease ${counter.label.toLowerCase()}`} disabled={counter.value <= counter.min} onClick={() => counter.set(counter.value - 1)}><Minus size={18} /></button><span aria-label={`${counter.value} ${counter.label.toLowerCase()}`}>{counter.value}</span><button type="button" aria-label={`Increase ${counter.label.toLowerCase()}`} disabled={counter.value >= counter.max} onClick={() => counter.set(counter.value + 1)}><Plus size={18} /></button></div>
        </div>)}
        <button type="button" className={styles.done} onClick={() => commit({ ...stay, guests, rooms })}>Done</button>
      </>}
    </div>
  </dialog>;
}
