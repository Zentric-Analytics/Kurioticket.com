"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  MapPin,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return toIsoDate(next);
};

const parseIsoDate = (value: string) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const todayLocal = () => startOfLocalDay(new Date());

const isBeforeToday = (date: Date) =>
  startOfLocalDay(date).getTime() < todayLocal().getTime();

const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

type MonthCell = {
  date: Date;
  isCurrentMonth: boolean;
};

const buildMonthCells = (monthDate: Date): MonthCell[] => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1 - startOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + index,
    );

    return {
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatShortDate = (value: string) => {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
};

const clampCount = (value: string, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
};

type PopularHotelCity = {
  city: string;
  label: string;
  gradient: string;
};

const popularHotelCities: PopularHotelCity[] = [
  {
    city: "Tokyo",
    label: "City stays",
    gradient: "from-fuchsia-500 via-rose-400 to-amber-300",
  },
  {
    city: "London",
    label: "Central stays",
    gradient: "from-slate-800 via-blue-700 to-sky-400",
  },
  {
    city: "Paris",
    label: "Weekend planning",
    gradient: "from-violet-600 via-indigo-500 to-pink-300",
  },
  {
    city: "New York",
    label: "Business trips",
    gradient: "from-indigo-950 via-slate-700 to-cyan-400",
  },
  {
    city: "Dubai",
    label: "Family planning",
    gradient: "from-amber-500 via-orange-400 to-indigo-600",
  },
  {
    city: "Singapore",
    label: "City stays",
    gradient: "from-emerald-500 via-teal-400 to-sky-400",
  },
  {
    city: "Rome",
    label: "Central stays",
    gradient: "from-orange-500 via-rose-500 to-stone-500",
  },
  {
    city: "Barcelona",
    label: "Weekend planning",
    gradient: "from-sky-500 via-blue-600 to-amber-300",
  },
];

export default function HotelsSearchPage() {
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [hotelAdultCount, setHotelAdultCount] = useState(1);
  const [hotelChildCount, setHotelChildCount] = useState(0);
  const [rooms, setRooms] = useState("1");
  const [hotelPetFriendly, setHotelPetFriendly] = useState(false);
  const [error, setError] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsRoomsOpen, setGuestsRoomsOpen] = useState(false);
  const [hotelVisibleMonthDate, setHotelVisibleMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const dateSummary = useMemo(() => {
    const formattedCheckIn = formatShortDate(checkIn);
    const formattedCheckOut = formatShortDate(checkOut);

    if (!formattedCheckIn) {
      return "Check-in — Check-out";
    }

    if (formattedCheckOut) {
      return `${formattedCheckIn} — ${formattedCheckOut}`;
    }

    return formattedCheckIn;
  }, [checkIn, checkOut]);

  const totalHotelGuests = hotelAdultCount + hotelChildCount;

  const guestsRoomsSummary = useMemo(() => {
    const normalizedGuests = Math.max(1, Math.min(12, totalHotelGuests));
    const normalizedRooms = clampCount(rooms, 1, 6);

    return `${normalizedGuests} ${normalizedGuests === 1 ? "guest" : "guests"}, ${normalizedRooms} ${normalizedRooms === 1 ? "room" : "rooms"}`;
  }, [rooms, totalHotelGuests]);

  const checkInParsed = parseIsoDate(checkIn);
  const checkOutParsed = parseIsoDate(checkOut);

  const popularCityLinks = useMemo(() => {
    const baseDate = new Date();
    const defaultCheckIn = addDays(baseDate, 21);
    const defaultCheckOut = addDays(baseDate, 24);
    return popularHotelCities.map((city) => ({
      ...city,
      href: `/hotels/results?${new URLSearchParams({
        destination: city.city,
        checkIn: defaultCheckIn,
        checkOut: defaultCheckOut,
        guests: "2",
        rooms: "1",
      }).toString()}`,
    }));
  }, []);

  const handleToggleDates = () => {
    setDatesOpen((prev) => {
      const nextOpen = !prev;

      if (nextOpen) {
        setGuestsRoomsOpen(false);
      }

      return nextOpen;
    });
  };

  const handleToggleGuestsRooms = () => {
    setGuestsRoomsOpen((prev) => {
      const nextOpen = !prev;

      if (nextOpen) {
        setDatesOpen(false);
      }

      return nextOpen;
    });
  };

  const handleSelectHotelDate = (date: Date) => {
    if (isBeforeToday(date)) {
      return;
    }

    const selectedIso = toIsoDate(date);

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(selectedIso);
      setCheckOut("");
      return;
    }

    if (selectedIso <= checkIn) {
      setCheckIn(selectedIso);
      setCheckOut("");
      return;
    }

    setCheckOut(selectedIso);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDestination = destination.trim();
    const parsedRooms = Number.parseInt(rooms, 10);
    const normalizedGuests = Math.max(1, Math.min(12, totalHotelGuests));
    const normalizedRooms = Number.isNaN(parsedRooms)
      ? 1
      : Math.max(1, Math.min(6, parsedRooms));

    if (!trimmedDestination) {
      setError("Please enter a destination.");
      return;
    }

    if (!checkIn) {
      setError("Please select a check-in date.");
      return;
    }

    if (!checkOut) {
      setError("Please select a check-out date.");
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setError("Check-out must be after check-in.");
      return;
    }

    if (normalizedGuests < 1 || normalizedGuests > 12) {
      setError("Please select between 1 and 12 guests.");
      return;
    }

    if (normalizedRooms < 1 || normalizedRooms > 6) {
      setError("Please select between 1 and 6 rooms.");
      return;
    }

    const params = new URLSearchParams({
      destination: trimmedDestination,
      checkIn,
      checkOut,
      guests: String(normalizedGuests),
      rooms: String(normalizedRooms),
    });

    setRooms(String(normalizedRooms));
    setError("");
    router.push(`/hotels/results?${params.toString()}`);
  };

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.16),transparent_34%),linear-gradient(to_bottom,#eef2ff_0%,#ffffff_44%,#ffffff_100%)] px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <div className="mx-auto max-w-6xl space-y-8 md:space-y-10">
          <section className="relative rounded-[2rem] border border-white/70 bg-white/75 p-3 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.85)] ring-1 ring-slate-200/70 backdrop-blur md:p-4 lg:p-5">
            <div
              className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_18%_18%,rgba(99,102,241,0.16),transparent_28%),radial-gradient(circle_at_84%_22%,rgba(14,165,233,0.14),transparent_30%),radial-gradient(circle_at_78%_82%,rgba(168,85,247,0.12),transparent_30%)]"
              aria-hidden="true"
            />
            <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-stretch">
              <div className="space-y-4 rounded-[1.6rem] bg-white/70 p-2 sm:p-4 lg:p-5">
                <div className="max-w-2xl space-y-3 px-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
                    Find available stays
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                    Search stays by destination, dates, guests, and rooms.
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                    Start with your destination and travel dates, then compare
                    provider options and continue with the booking partner.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_112px] lg:gap-0">
                      <label className="min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                        <span className="mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">
                          Destination
                        </span>
                        <input
                          type="text"
                          value={destination}
                          onChange={(event) =>
                            setDestination(event.target.value)
                          }
                          placeholder="City, area, or hotel"
                          className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-[16px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 md:text-sm"
                          required
                        />
                      </label>

                      <div className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                        <span className="mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">
                          Travel dates
                        </span>
                        <button
                          type="button"
                          onClick={handleToggleDates}
                          aria-expanded={datesOpen}
                          aria-haspopup="dialog"
                          aria-label="Choose travel dates"
                          className="focus-ring flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] text-slate-900 outline-none transition-colors md:text-sm"
                        >
                          <Calendar
                            size={16}
                            className="shrink-0 text-slate-500"
                          />
                          <span className="truncate">{dateSummary}</span>
                        </button>
                        {datesOpen ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[200] w-full rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:right-auto sm:w-[min(92vw,620px)] sm:p-4">
                            <p className="mb-3 text-base font-semibold text-slate-900">
                              Choose travel dates
                            </p>
                            <div className="mb-3 flex items-center justify-between">
                              <button
                                type="button"
                                aria-label="Previous month"
                                onClick={() =>
                                  setHotelVisibleMonthDate((prev) =>
                                    addMonths(prev, -1),
                                  )
                                }
                                className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                aria-label="Next month"
                                onClick={() =>
                                  setHotelVisibleMonthDate((prev) =>
                                    addMonths(prev, 1),
                                  )
                                }
                                className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                Next
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                              {[0, 1].map((monthOffset) => {
                                const monthDate = addMonths(
                                  hotelVisibleMonthDate,
                                  monthOffset,
                                );
                                const cells = buildMonthCells(monthDate);

                                return (
                                  <div key={monthOffset}>
                                    <p className="mb-1.5 text-center text-sm font-semibold text-slate-800">
                                      {monthDate.toLocaleDateString("en-US", {
                                        month: "long",
                                        year: "numeric",
                                      })}
                                    </p>
                                    <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
                                      {weekdays.map((weekday) => (
                                        <span key={weekday}>{weekday}</span>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                      {cells.map((cell) => {
                                        const day = cell.date;
                                        const iso = toIsoDate(day);
                                        const isCheckIn = iso === checkIn;
                                        const isCheckOut = iso === checkOut;
                                        const isPastDate = isBeforeToday(day);
                                        const isInRange = !!(
                                          checkInParsed &&
                                          checkOutParsed &&
                                          !isPastDate &&
                                          day > checkInParsed &&
                                          day < checkOutParsed
                                        );

                                        if (!cell.isCurrentMonth) {
                                          return (
                                            <span
                                              key={`placeholder-${iso}`}
                                              aria-hidden="true"
                                              className="h-8 w-8 justify-self-center"
                                            />
                                          );
                                        }

                                        return (
                                          <button
                                            key={iso}
                                            type="button"
                                            aria-label={`Select ${day.toLocaleDateString(
                                              "en-US",
                                              {
                                                month: "long",
                                                day: "numeric",
                                                year: "numeric",
                                              },
                                            )}`}
                                            onClick={() =>
                                              handleSelectHotelDate(day)
                                            }
                                            disabled={isPastDate}
                                            className={`focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors disabled:cursor-not-allowed ${
                                              isPastDate
                                                ? "text-slate-300 hover:bg-transparent"
                                                : "text-slate-900 hover:bg-indigo-50"
                                            } ${
                                              isInRange
                                                ? "rounded-md bg-indigo-100 text-indigo-900 hover:bg-indigo-100"
                                                : ""
                                            } ${
                                              isCheckIn || isCheckOut
                                                ? "bg-indigo-700 text-white hover:bg-indigo-700"
                                                : ""
                                            }`}
                                          >
                                            {day.getDate()}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setCheckIn("");
                                  setCheckOut("");
                                }}
                                className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={() => setDatesOpen(false)}
                                className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                        <span className="mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">
                          Guests
                        </span>
                        <button
                          type="button"
                          onClick={handleToggleGuestsRooms}
                          aria-expanded={guestsRoomsOpen}
                          aria-haspopup="dialog"
                          aria-label="Choose guests and rooms"
                          className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] text-slate-900 outline-none transition-colors md:text-sm"
                        >
                          <span className="truncate">{guestsRoomsSummary}</span>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-slate-500 transition-transform ${
                              guestsRoomsOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {guestsRoomsOpen ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 w-[calc(100vw-24px)] max-w-[330px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.14)] max-sm:max-h-[min(70vh,360px)] sm:right-auto sm:w-[min(92vw,320px)] sm:max-w-[320px]">
                            <div className="space-y-3">
                              {[
                                {
                                  key: "adults",
                                  label: "Adults",
                                  value: hotelAdultCount,
                                  min: 1,
                                  max: 12 - hotelChildCount,
                                  onDecrement: () =>
                                    setHotelAdultCount((prev) =>
                                      Math.max(1, prev - 1),
                                    ),
                                  onIncrement: () =>
                                    setHotelAdultCount((prev) =>
                                      Math.min(12 - hotelChildCount, prev + 1),
                                    ),
                                },
                                {
                                  key: "children",
                                  label: "Children",
                                  value: hotelChildCount,
                                  min: 0,
                                  max: 12 - hotelAdultCount,
                                  onDecrement: () =>
                                    setHotelChildCount((prev) =>
                                      Math.max(0, prev - 1),
                                    ),
                                  onIncrement: () =>
                                    setHotelChildCount((prev) =>
                                      Math.min(12 - hotelAdultCount, prev + 1),
                                    ),
                                },
                                {
                                  key: "rooms",
                                  label: "Rooms",
                                  value: clampCount(rooms, 1, 6),
                                  min: 1,
                                  max: 6,
                                  onDecrement: () =>
                                    setRooms((prev) =>
                                      String(
                                        Math.max(1, clampCount(prev, 1, 6) - 1),
                                      ),
                                    ),
                                  onIncrement: () =>
                                    setRooms((prev) =>
                                      String(
                                        Math.min(6, clampCount(prev, 1, 6) + 1),
                                      ),
                                    ),
                                },
                              ].map((row) => {
                                const canDecrement = row.value > row.min;
                                const canIncrement = row.value < row.max;

                                return (
                                  <div
                                    key={row.key}
                                    className="flex items-center justify-between gap-2.5"
                                  >
                                    <span className="text-sm font-semibold text-slate-900">
                                      {row.label}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={row.onDecrement}
                                        disabled={!canDecrement}
                                        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </button>
                                      <span className="min-w-6 text-center text-sm font-semibold text-slate-900">
                                        {row.value}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={row.onIncrement}
                                        disabled={!canIncrement}
                                        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="border-t border-slate-200 pt-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      Pet-friendly
                                    </p>
                                    <p className="pr-2 text-xs leading-5 text-slate-600">
                                      Only show stays that allow pets
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={hotelPetFriendly}
                                    aria-label="Toggle pet-friendly stays"
                                    onClick={() =>
                                      setHotelPetFriendly((prev) => !prev)
                                    }
                                    className={`focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                                      hotelPetFriendly
                                        ? "border-indigo-600 bg-indigo-600"
                                        : "border-slate-300 bg-slate-200"
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                        hotelPetFriendly
                                          ? "translate-x-5"
                                          : "translate-x-0.5"
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="sm:col-span-2 lg:col-span-1 lg:min-h-[54px] lg:self-stretch">
                        <button
                          type="submit"
                          className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-950 to-violet-800 px-4 text-sm font-bold text-white shadow-md shadow-indigo-900/30 lg:h-full lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-900/30"
                        >
                          Search
                        </button>
                      </div>
                    </div>
                  </div>

                  {error ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {error}
                    </p>
                  ) : null}
                </form>
              </div>

              <aside
                className="pointer-events-none hidden min-h-[430px] rounded-[1.75rem] border border-white/70 bg-slate-950 p-5 text-white shadow-[0_24px_70px_-46px_rgba(15,23,42,0.95)] lg:block"
                aria-hidden="true"
              >
                <div className="relative h-full overflow-hidden rounded-[1.35rem] bg-[radial-gradient(circle_at_26%_22%,rgba(125,211,252,0.36),transparent_28%),radial-gradient(circle_at_76%_18%,rgba(196,181,253,0.34),transparent_30%),linear-gradient(135deg,rgba(49,46,129,0.95),rgba(15,23,42,0.98)_62%,rgba(30,41,59,0.96))] p-5">
                  <div className="absolute left-6 top-8 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl" />
                  <div className="absolute bottom-8 right-8 h-36 w-36 rounded-full bg-violet-300/20 blur-3xl" />
                  <div className="relative flex h-full flex-col justify-between gap-5">
                    <div className="rounded-3xl border border-white/15 bg-white/12 p-4 shadow-2xl backdrop-blur">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-50">
                          Stay plan
                        </span>
                        <span className="h-10 w-10 rounded-2xl bg-white/20" />
                      </div>
                      <div className="space-y-3">
                        <div className="h-3 w-4/5 rounded-full bg-white/80" />
                        <div className="h-3 w-3/5 rounded-full bg-white/45" />
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="rounded-2xl bg-white/14 p-3">
                            <div className="h-2 w-12 rounded-full bg-white/35" />
                            <div className="mt-3 h-8 rounded-xl bg-white/20" />
                          </div>
                          <div className="rounded-2xl bg-white/14 p-3">
                            <div className="h-2 w-12 rounded-full bg-white/35" />
                            <div className="mt-3 h-8 rounded-xl bg-white/20" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="ml-10 rounded-3xl border border-white/15 bg-white/12 p-4 shadow-xl backdrop-blur">
                        <div className="flex items-center gap-3">
                          <span className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-300 to-indigo-300" />
                          <div className="flex-1 space-y-2">
                            <div className="h-2.5 w-3/4 rounded-full bg-white/70" />
                            <div className="h-2.5 w-1/2 rounded-full bg-white/35" />
                          </div>
                        </div>
                      </div>
                      <div className="mr-12 rounded-3xl border border-white/15 bg-white/12 p-4 shadow-xl backdrop-blur">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-2">
                            <div className="h-2.5 w-28 rounded-full bg-white/65" />
                            <div className="h-2.5 w-20 rounded-full bg-white/35" />
                          </div>
                          <span className="h-9 w-16 rounded-full bg-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Compare provider offers",
                body: "View hotel options from travel providers in one place before you continue.",
                icon: Building2,
              },
              {
                title: "Review stay details",
                body: "Check dates, guests, rooms, pricing context, and stay information before choosing.",
                icon: ClipboardCheck,
              },
              {
                title: "Continue with the provider",
                body: "When you choose an option, continue with the provider to complete booking.",
                icon: ArrowRight,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="group relative overflow-hidden rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.7)] ring-1 ring-slate-200/70 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_28px_70px_-44px_rgba(15,23,42,0.8)]"
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-violet-500 opacity-70"
                    aria-hidden="true"
                  />
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 text-indigo-700 ring-1 ring-indigo-100 transition group-hover:scale-105 group-hover:from-indigo-100 group-hover:to-sky-100">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">
                    {item.body}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">
                  Start with a destination
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                  Popular city stays
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-600">
                Choose a city to open hotel results with sample future dates,
                two guests, and one room.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {popularCityLinks.map((item) => (
                <Link
                  key={item.city}
                  href={item.href}
                  className="group focus-ring relative min-h-44 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_20px_58px_-44px_rgba(15,23,42,0.85)] ring-1 ring-slate-200/70 transition hover:-translate-y-1 hover:shadow-[0_28px_68px_-44px_rgba(79,70,229,0.72)]"
                >
                  <span
                    className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`}
                    aria-hidden="true"
                  />
                  <span
                    className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.45),transparent_28%),linear-gradient(to_top,rgba(15,23,42,0.78),rgba(15,23,42,0.08)_62%,rgba(255,255,255,0.08))]"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute right-4 top-4 h-14 w-14 rounded-2xl border border-white/35 bg-white/15 backdrop-blur-sm transition group-hover:scale-105"
                    aria-hidden="true"
                  />
                  <span className="relative flex h-full min-h-44 flex-col justify-between p-4 text-white">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/18 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.label}
                    </span>
                    <span className="flex items-end justify-between gap-3">
                      <span>
                        <span className="block text-xl font-semibold tracking-tight">
                          {item.city}
                        </span>
                        <span className="mt-1 block text-sm text-white/82">
                          View hotel results
                        </span>
                      </span>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 shadow-lg transition group-hover:translate-x-0.5">
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-white shadow-[0_28px_80px_-48px_rgba(15,23,42,0.95)] md:p-6">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(59,130,246,0.28),transparent_26%),radial-gradient(circle_at_88%_22%,rgba(168,85,247,0.24),transparent_30%)]"
              aria-hidden="true"
            />
            <div className="relative grid gap-5 md:grid-cols-[0.85fr_1.45fr]">
              <div>
                <p className="text-sm font-medium text-indigo-200">
                  How hotel search works
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
                  Plan your stay with Curioticket
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Keep the important trip details in view as you move from
                  search to provider selection.
                </p>
              </div>
              <ol className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    title: "Start with destination and dates",
                    body: "Enter where and when you want to stay.",
                    icon: Search,
                  },
                  {
                    title: "Compare hotel options on the results page",
                    body: "Review matching stays and trip details together.",
                    icon: SlidersHorizontal,
                  },
                  {
                    title: "Continue with the provider when you are ready",
                    body: "Choose an option and finish booking with the provider.",
                    icon: CheckCircle2,
                  },
                ].map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <li
                      key={item.title}
                      className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 shadow-[0_20px_55px_-46px_rgba(0,0,0,0.9)] backdrop-blur"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-indigo-100">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Step {index + 1}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold leading-5 text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {item.body}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.75)] ring-1 ring-white/80 md:grid-cols-[0.75fr_1.25fr] md:items-center md:p-6">
            <div>
              <p className="text-sm font-medium text-indigo-700">
                Search smarter
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Small checks can make results easier to review
              </h2>
            </div>
            <ul className="grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-3">
              {[
                "Adjust dates if your trip is flexible.",
                "Review room and guest details before continuing.",
                "Use filters on results to narrow your options.",
              ].map((tip) => (
                <li
                  key={tip}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_16px_42px_-36px_rgba(15,23,42,0.7)]"
                >
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="block">{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
