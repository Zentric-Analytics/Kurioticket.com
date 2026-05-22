"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type TabMode = "flights" | "hotels";
type TripType = "round-trip" | "one-way" | "multi-city";
type DateField = "departure" | "return";

type SearchTabsProps = {
  t: Record<string, string>;
  compactHero?: boolean;
};

const BRAND_PURPLE = "#6d28d9";

const toDateValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value: string) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const isSameDay = (left: Date, right: Date) =>
  left.toDateString() === right.toDateString();

const monthTitle = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

export function SearchTabs({ t, compactHero = false }: SearchTabsProps) {
  const router = useRouter();
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<TabMode>("flights");
  const [tripType, setTripType] = useState<TripType>("round-trip");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [travelers, setTravelers] = useState("1");
  const [cabinClass, setCabinClass] = useState("economy");

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1");
  const [rooms, setRooms] = useState("1");

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeDateField, setActiveDateField] =
    useState<DateField>("departure");
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!datePickerRef.current?.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const departure = parseDateValue(departureDate);
  const returning = parseDateValue(returnDate);

  const wrapper = cn(
    "rounded-2xl bg-white",
    compactHero ? "p-0" : "border border-slate-200 p-4",
  );

  const tripTypeLabel = (mode: TripType) => {
    if (mode === "round-trip") return t.tripRound || "Round Trip";
    if (mode === "one-way") return t.tripOneWay || "One Way";
    return t.tripMulti || "Multi City";
  };

  const openCalendar = (field: DateField) => {
    setActiveDateField(field);

    const anchor = field === "departure" ? departure : returning;
    const baseDate = anchor || today;

    setCurrentMonth(
      new Date(baseDate.getFullYear(), baseDate.getMonth(), 1),
    );

    setIsCalendarOpen(true);
  };

  const selectDay = (day: Date) => {
    if (day < today) return;

    const value = toDateValue(day);

    if (activeDateField === "departure") {
      setDepartureDate(value);

      if (returning && day > returning) {
        setReturnDate("");
      }

      if (tripType !== "one-way") {
        setActiveDateField("return");
      }

      if (tripType === "one-way") {
        setIsCalendarOpen(false);
      }

      return;
    }

    if (departure && day < departure) {
      setDepartureDate(value);
      setReturnDate("");
      setActiveDateField("return");
      return;
    }

    setReturnDate(value);
    setIsCalendarOpen(false);
  };

  const renderMonth = (monthStart: Date) => {
    const firstDayOffset = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      1,
    ).getDay();

    const daysInMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
    ).getDate();

    const slots = Array.from(
      { length: firstDayOffset + daysInMonth },
      (_, index) => index - firstDayOffset + 1,
    );

    return (
      <div key={monthStart.toISOString()} className="w-full min-w-[260px]">
        <h4 className="mb-3 text-center text-sm font-bold text-slate-900">
          {monthTitle(monthStart)}
        </h4>

        <div className="mb-3 grid grid-cols-7 place-items-center text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
            <span key={label} className="w-9">
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {slots.map((value, index) => {
            if (value < 1) {
              return <span key={`
