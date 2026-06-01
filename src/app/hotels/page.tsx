"use client";

import Image from "next/image";
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

type HotelDestinationCard = {
  title: string;
  subtitle: string;
  destinationQuery: string;
  image: string;
  imageAlt: string;
  linkLabel: string;
};

const hotelDestinationCards: HotelDestinationCard[] = [
  {
    title: "Japan",
    subtitle: "Tokyo stays",
    destinationQuery: "Tokyo",
    image:
      "https://images.pexels.com/photos/31344755/pexels-photo-31344755.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Tokyo skyline with dense high-rise buildings in daylight",
    linkLabel: "Search hotels in Tokyo, Japan",
  },
  {
    title: "United Kingdom",
    subtitle: "London stays",
    destinationQuery: "London",
    image:
      "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Tower Bridge and the River Thames in London under a blue sky",
    linkLabel: "Search hotels in London, United Kingdom",
  },
  {
    title: "France",
    subtitle: "Paris stays",
    destinationQuery: "Paris",
    image:
      "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Eiffel Tower and the Seine River in Paris at golden hour",
    linkLabel: "Search hotels in Paris, France",
  },
  {
    title: "United States",
    subtitle: "New York stays",
    destinationQuery: "New York",
    image:
      "https://images.pexels.com/photos/11182439/pexels-photo-11182439.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt:
      "New York City skyline with One World Trade Center and waterfront",
    linkLabel: "Search hotels in New York, United States",
  },
];

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

  const hotelDestinationLinks = useMemo(() => {
    const baseDate = new Date();
    const defaultCheckIn = addDays(baseDate, 21);
    const defaultCheckOut = addDays(baseDate, 24);

    return hotelDestinationCards.map((card) => ({
      ...card,
      href: `/hotels/results?${new URLSearchParams({
        destination: card.destinationQuery,
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
      <main className="page-shell flex-1 bg-gradient-to-b from-indigo-50/70 via-white to-white px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pt-12">
        <div className="mx-auto max-w-6xl space-y-8 md:space-y-10">
          <section className="mx-auto w-full max-w-[1040px] space-y-3">
            <p className="px-1 text-sm font-medium text-slate-600">
              Find available stays
            </p>
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
                      onChange={(event) => setDestination(event.target.value)}
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
                      <Calendar size={16} className="shrink-0 text-slate-500" />
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
          </section>

          <section className="space-y-5 py-2 sm:space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Explore hotel stays by destination
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {hotelDestinationLinks.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  aria-label={card.linkLabel}
                  className="group relative min-h-[300px] overflow-hidden rounded-[2rem] bg-slate-950 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.95)] ring-1 ring-slate-950/10 transition duration-300 hover:-translate-y-1 hover:shadow-[0_34px_80px_-38px_rgba(79,70,229,0.9)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-50 sm:min-h-[340px] xl:min-h-[360px]"
                >
                  <Image
                    src={card.image}
                    alt={card.imageAlt}
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-slate-950/5" />
                  <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/15" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
                    <p className="text-2xl font-semibold leading-tight tracking-tight drop-shadow-md">
                      {card.title}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold text-white/90">
                      <span>{card.subtitle}</span>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur transition group-hover:translate-x-1 group-hover:bg-white/25">
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
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
                  className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-white to-indigo-50/60 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.9)] ring-1 ring-white/80 transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_30px_80px_-42px_rgba(79,70,229,0.75)]"
                >
                  <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-indigo-100/70 blur-2xl transition group-hover:bg-indigo-200/80" />
                  <div className="relative mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20 ring-1 ring-slate-950/10 transition group-hover:bg-indigo-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="relative text-base font-semibold tracking-tight text-slate-950">
                    {item.title}
                  </h2>
                  <p className="relative mt-2 text-sm leading-6 text-slate-600">
                    {item.body}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="grid gap-5 rounded-3xl border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.9)] md:grid-cols-[0.9fr_1.4fr] md:p-6">
            <div>
              <p className="text-sm font-medium text-indigo-200">
                How hotel search works
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
                Plan your stay with Kurioticket
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Keep the important trip details in view as you move from search
                to provider selection.
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
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
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
          </section>

          <section className="grid gap-3 border-y border-slate-200/80 py-5 md:grid-cols-[0.75fr_1.25fr] md:items-center">
            <div>
              <p className="text-sm font-medium text-indigo-700">
                Search smarter
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Small checks can make results easier to review
              </h2>
            </div>
            <ul className="grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-3">
              <li className="rounded-2xl bg-white/75 p-3 ring-1 ring-slate-200">
                Adjust dates if your trip is flexible.
              </li>
              <li className="rounded-2xl bg-white/75 p-3 ring-1 ring-slate-200">
                Review room and guest details before continuing.
              </li>
              <li className="rounded-2xl bg-white/75 p-3 ring-1 ring-slate-200">
                Use filters on results to narrow your options.
              </li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
