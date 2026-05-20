"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import {
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plane,
  Search,
} from "lucide-react";

type Tab = "flights" | "hotels";
type TripType = "round-trip" | "one-way" | "multi-city";
type PickerTarget = "departure" | "return";

export function SearchTabs() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("flights");

  const [tripType, setTripType] =
    useState<TripType>("round-trip");

  const [origin, setOrigin] = useState("LOS");

  const [destination, setDestination] =
    useState("DXB");

  const [travelers, setTravelers] =
    useState("1");

  const [cabinClass, setCabinClass] =
    useState("economy");

  const [departureDate, setDepartureDate] =
    useState(new Date(2026, 5, 11));

  const [returnDate, setReturnDate] =
    useState(new Date(2026, 5, 17));

  const [viewDate, setViewDate] = useState(
    new Date(2026, 5, 1)
  );

  const [pickerTarget, setPickerTarget] =
    useState<PickerTarget>("departure");

  const [isCalendarOpen, setIsCalendarOpen] =
    useState(false);

  function onFlightSubmit() {
    const params = new URLSearchParams({
      tripType,
      origin,
      destination,
      departureDate: format(
        departureDate,
        "yyyy-MM-dd"
      ),
      returnDate: format(
        returnDate,
        "yyyy-MM-dd"
      ),
      travelers,
      cabinClass,
    });

    router.push(
      `/flights/results?${params.toString()}`
    );
  }

  function onHotelSubmit() {
    const params = new URLSearchParams({
      destination,
      checkIn: format(
        departureDate,
        "yyyy-MM-dd"
      ),
      checkOut: format(
        returnDate,
        "yyyy-MM-dd"
      ),
      guests: travelers,
      rooms: "1",
    });

    router.push(
      `/hotels/results?${params.toString()}`
    );
  }

  function onDaySelect(day: Date) {
    if (pickerTarget === "departure") {
      setDepartureDate(day);

      if (isAfter(day, returnDate)) {
        setReturnDate(day);
      }

      setPickerTarget("return");
      return;
    }

    if (isBefore(day, departureDate)) {
      setDepartureDate(day);
    } else {
      setReturnDate(day);
      setIsCalendarOpen(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-2 inline-flex rounded-full border border-violet-100 bg-white p-1 shadow-sm">
        <button
          type="button"
          className={`focus-ring inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${
            tab === "flights"
              ? "bg-[#6d28d9] text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
          onClick={() => setTab("flights")}
        >
          <Plane size={15} />
          Flights
        </button>

        <button
          type="button"
          className={`focus-ring inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${
            tab === "hotels"
              ? "bg-[#6d28d9] text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
          onClick={() => setTab("hotels")}
        >
          <BedDouble size={15} />
          Hotels
        </button>
      </div>

      {tab === "flights" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-700 sm:flex sm:gap-4">
            {(
              [
                "round-trip",
                "one-way",
                "multi-city",
              ] as const
            ).map((value) => (
              <label
                key={value}
                className="inline-flex items-center gap-2"
              >
                <input
                  type="radio"
                  name="tripType"
                  checked={tripType === value}
                  onChange={() =>
                    setTripType(value)
                  }
                  className="h-4 w-4 accent-[#6d28d9]"
                />

                {value === "round-trip"
                  ? "Round Trip"
                  : value === "one-way"
                    ? "One Way"
                    : "Multi City"}
              </label>
            ))}
          </div>

          <div className="relative grid overflow-visible rounded-2xl border border-violet-100 bg-white shadow-sm lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
            <EditableField
              label="FROM"
              subtext="Lagos, Nigeria"
              value={origin}
              onChange={setOrigin}
            />

            <EditableField
              label="TO"
              subtext="Dubai, UAE"
              value={destination}
              onChange={setDestination}
            />

            <DateTriggerField
              label="DEPARTURE"
              value={format(
                departureDate,
                "MMM dd, yyyy"
              )}
              subtext={format(
                departureDate,
                "EEEE"
              )}
              isActive={
                isCalendarOpen &&
                pickerTarget === "departure"
              }
              onClick={() => {
                setPickerTarget(
                  "departure"
                );
                setIsCalendarOpen(true);
              }}
            />

            <DateTriggerField
              label="RETURN"
              value={format(
                returnDate,
                "MMM dd, yyyy"
              )}
              subtext={format(
                returnDate,
                "EEEE"
              )}
              isActive={
                isCalendarOpen &&
                pickerTarget === "return"
              }
              onClick={() => {
                setPickerTarget("return");
                setIsCalendarOpen(true);
              }}
            />

            <TravelerField
              travelers={travelers}
              cabinClass={cabinClass}
              setTravelers={setTravelers}
              setCabinClass={setCabinClass}
            />

            <div className="p-2">
              <button
                type="button"
                onClick={onFlightSubmit}
                className="focus-ring inline-flex h-full min-h-[72px] w-full items-center justify-center gap-2 rounded-xl bg-[#5b21d6] px-6 text-sm font-black text-white transition hover:bg-[#4c1d95]"
              >
                <Search size={16} />
                Search Flights
              </button>
            </div>

            {isCalendarOpen ? (
              <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 rounded-2xl border border-violet-100 bg-white p-3 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:p-4 lg:left-[33%] lg:right-[16%]">
                <BookingCalendar
                  viewDate={viewDate}
                  setViewDate={setViewDate}
                  departureDate={
                    departureDate
                  }
                  returnDate={returnDate}
                  onDaySelect={onDaySelect}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-violet-100 bg-white p-3 shadow-sm">
          <button
            type="button"
            onClick={onHotelSubmit}
            className="focus-ring inline-flex h-11 items-center justify-center rounded-xl bg-[#5b21d6] px-5 text-sm font-black text-white transition hover:bg-[#4c1d95]"
          >
            Search Hotels
          </button>
        </div>
      )}
    </div>
  );
}

function EditableField({
  label,
  subtext,
  value,
  onChange,
}: {
  label: string;
  subtext: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-h-[72px] flex-col justify-center border-t border-violet-100 px-3 py-2 first:border-t-0 lg:border-l lg:border-t-0 lg:first:border-l-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value.toUpperCase()
          )
        }
        className="mt-0.5 bg-transparent text-lg font-black leading-tight text-slate-950 outline-none"
      />

      <span className="text-xs font-semibold text-slate-600">
        {subtext}
      </span>
    </label>
  );
}

function DateTriggerField({
  label,
  value,
  subtext,
  isActive,
  onClick,
}: {
  label: string;
  value: string;
  subtext: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[72px] w-full flex-col justify-center border-t border-violet-100 px-3.5 py-2.5 text-left transition first:border-t-0 lg:border-l lg:border-t-0 lg:first:border-l-0 ${
        isActive
          ? "bg-violet-50/60"
          : "hover:bg-slate-50"
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>

      <div className="mt-1 inline-flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[#6d28d9]">
          <CalendarDays size={14} />
        </span>

        <span className="text-[17px] font-black leading-tight text-slate-950">
          {value}
        </span>
      </div>

      <span className="mt-1 text-xs font-semibold text-slate-600">
        {subtext}
      </span>
    </button>
  );
}

function TravelerField({
  travelers,
  cabinClass,
  setTravelers,
  setCabinClass,
}: {
  travelers: string;
  cabinClass: string;
  setTravelers: (value: string) => void;
  setCabinClass: (
    value: string
  ) => void;
}) {
  return (
    <div className="flex min-h-[72px] flex-col justify-center border-t border-violet-100 px-3 py-2 first:border-t-0 lg:border-l lg:border-t-0 lg:first:border-l-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        TRAVELERS & CLASS
      </span>

      <div className="mt-1 grid grid-cols-1 gap-1">
        <select
          value={travelers}
          onChange={(event) =>
            setTravelers(
              event.target.value
            )
          }
          className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
        >
          <option value="1">
            1 Traveler
          </option>

          <option value="2">
            2 Travelers
          </option>

          <option value="3">
            3 Travelers
          </option>

          <option value="4">
            4 Travelers
          </option>
        </select>

        <select
          value={cabinClass}
          onChange={(event) =>
            setCabinClass(
              event.target.value
            )
          }
          className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none"
        >
          <option value="economy">
            Economy
          </option>

          <option value="premium-economy">
            Premium Economy
          </option>

          <option value="business">
            Business
          </option>

          <option value="first">
            First
          </option>
        </select>
      </div>
    </div>
  );
}

function BookingCalendar({
  viewDate,
  setViewDate,
  departureDate,
  returnDate,
  onDaySelect,
}: {
  viewDate: Date;
  setViewDate: (date: Date) => void;
  departureDate: Date;
  returnDate: Date;
  onDaySelect: (day: Date) => void;
}) {
  const months = [
    viewDate,
    addMonths(viewDate, 1),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {months.map((month) => {
        const monthStart =
          startOfMonth(month);

        const monthEnd =
          endOfMonth(month);

        const gridStart = startOfWeek(
          monthStart,
          {
            weekStartsOn: 0,
          }
        );

        const gridEnd = endOfWeek(
          monthEnd,
          {
            weekStartsOn: 0,
          }
        );

        const days = eachDayOfInterval({
          start: gridStart,
          end: gridEnd,
        });

        return (
          <div
            key={month.toISOString()}
            className="rounded-xl border border-violet-100 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                {format(
                  month,
                  "MMMM yyyy"
                )}
              </h3>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setViewDate(
                      addMonths(
                        viewDate,
                        -1
                      )
                    )
                  }
                  className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100"
                >
                  <ChevronLeft
                    size={16}
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewDate(
                      addMonths(
                        viewDate,
                        1
                      )
                    )
                  }
                  className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100"
                >
                  <ChevronRight
                    size={16}
                  />
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-xs font-bold text-slate-500">
              {[
                "Su",
                "Mo",
                "Tu",
                "We",
                "Th",
                "Fr",
                "Sa",
              ].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {days.map((day) => {
                const inMonth =
                  isSameMonth(
                    day,
                    month
                  );

                const selected =
                  isSameDay(
                    day,
                    departureDate
                  ) ||
                  isSameDay(
                    day,
                    returnDate
                  );

                const inRange =
                  isAfter(
                    day,
                    departureDate
                  ) &&
                  isBefore(
                    day,
                    returnDate
                  );

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() =>
                      onDaySelect(day)
                    }
                    className={`h-10 rounded-lg text-sm font-semibold transition ${
                      !inMonth
                        ? "text-slate-300"
                        : "text-slate-800 hover:bg-violet-50"
                    } ${
                      inRange
                        ? "bg-violet-50"
                        : ""
                    } ${
                      selected
                        ? "bg-[#6d28d9] text-white hover:bg-[#5b21d6]"
                        : ""
                    }`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}