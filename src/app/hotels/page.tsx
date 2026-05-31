"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown, Minus, Plus } from "lucide-react";

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
    const cities = [
      "Tokyo",
      "London",
      "Paris",
      "New York",
      "Dubai",
      "Singapore",
    ];

    return cities.map((city) => ({
      city,
      href: `/hotels/results?${new URLSearchParams({
        destination: city,
        checkIn: defaultCheckIn,
        checkOut: defaultCheckOut,
        guests: "2",
        rooms: "1",
      }).toString()}`,
    }));
  }, []);

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
                      onClick={() => setDatesOpen((prev) => !prev)}
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
                      onClick={() => setGuestsRoomsOpen((prev) => !prev)}
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

          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)]">
              <p className="text-sm font-medium text-slate-800">
                Compare provider offers
              </p>
              <p className="mt-1 text-sm text-slate-600">
                View hotel options from travel providers in one place.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)]">
              <p className="text-sm font-medium text-slate-800">
                Review stay details
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Check dates, guests, rooms, and pricing context before
                continuing.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)]">
              <p className="text-sm font-medium text-slate-800">
                Continue with the provider
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Choose an option, then complete booking with the provider.
              </p>
            </article>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_12px_36px_-28px_rgba(15,23,42,0.5)] md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                Popular city stays
              </h2>
              <p className="text-sm text-slate-500">
                Quick start with common destinations
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {popularCityLinks.map((item) => (
                <Link
                  key={item.city}
                  href={item.href}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                >
                  {item.city}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <ol className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
              <li className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                1. Search your destination and dates
              </li>
              <li className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                2. Compare available hotel options
              </li>
              <li className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                3. Continue with the provider to complete booking
              </li>
            </ol>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
