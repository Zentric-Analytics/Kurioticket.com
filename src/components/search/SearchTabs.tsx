"use client";

import {
  useEffect,
  type FormEvent,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  ArrowRightLeft,
  BedDouble,
  Plane,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  airports,
  formatAirportLabel,
  type AirportOption,
} from "@/data/airports";

type TabMode =
  | "flights"
  | "hotels";

type TripType =
  | "round-trip"
  | "one-way"
  | "multi-city";

type SearchTabsProps = {
  t: Record<string, string>;
  compactHero?: boolean;
};

const labelAirport = (
  item: AirportOption
) =>
  `${item.city} ${item.airport} ${item.code}`.toLowerCase();

export function SearchTabs({
  t,
  compactHero = false,
}: SearchTabsProps) {
  const router = useRouter();

  const fromWrapRef =
    useRef<HTMLDivElement>(null);

  const toWrapRef =
    useRef<HTMLDivElement>(null);

  const [tab, setTab] =
    useState<TabMode>("flights");

  const [tripType, setTripType] =
    useState<TripType>(
      "round-trip"
    );

  const [from, setFrom] =
    useState("");
  const [fromCode, setFromCode] =
    useState("");

  const [to, setTo] =
    useState("");
  const [toCode, setToCode] =
    useState("");

  const [fromOpen, setFromOpen] =
    useState(false);

  const [toOpen, setToOpen] =
    useState(false);

  const [
    fromHighlight,
    setFromHighlight,
  ] = useState(0);

  const [
    toHighlight,
    setToHighlight,
  ] = useState(0);

  const [
    departureDate,
    setDepartureDate,
  ] = useState("");

  const [
    returnDate,
    setReturnDate,
  ] = useState("");

  const [
    travelers,
    setTravelers,
  ] = useState("1");

  const [
    cabinClass,
    setCabinClass,
  ] = useState("economy");

  const [
    destination,
    setDestination,
  ] = useState("");

  const [checkIn, setCheckIn] =
    useState("");

  const [checkOut, setCheckOut] =
    useState("");

  const [guests, setGuests] =
    useState("1");

  const [rooms, setRooms] =
    useState("1");

  const wrapper = useMemo(
    () =>
      cn(
        "rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.10)]",
        compactHero
          ? "p-1.5 sm:p-2"
          : "p-2"
      ),
    [compactHero]
  );

  const fromSuggestions =
    useMemo(
      () =>
        airports.filter((a) =>
          labelAirport(a).includes(
            from.toLowerCase()
          )
        ).slice(0, 7),
      [from]
    );

  const toSuggestions =
    useMemo(
      () =>
        airports.filter((a) =>
          labelAirport(a).includes(
            to.toLowerCase()
          )
        ).slice(0, 7),
      [to]
    );

  useEffect(() => {
    const onPointerDown = (
      event: MouseEvent
    ) => {
      if (
        !fromWrapRef.current?.contains(
          event.target as Node
        )
      ) {
        setFromOpen(false);
      }

      if (
        !toWrapRef.current?.contains(
          event.target as Node
        )
      ) {
        setToOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      onPointerDown
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        onPointerDown
      );
  }, []);

  const tripTypeLabel = (
    mode: TripType
  ) => {
    if (mode === "round-trip") {
      return (
        t.tripRound ||
        "Round-trip"
      );
    }

    if (mode === "one-way") {
      return (
        t.tripOneWay ||
        "One-way"
      );
    }

    return (
      t.tripMulti ||
      "Multi-city"
    );
  };

  const onKeyNav = (
    event: KeyboardEvent<HTMLInputElement>,
    isFrom: boolean
  ) => {
    const list = isFrom
      ? fromSuggestions
      : toSuggestions;

    const active = isFrom
      ? fromHighlight
      : toHighlight;

    const setActive = isFrom
      ? setFromHighlight
      : setToHighlight;

    const setValue = isFrom
      ? setFrom
      : setTo;

    const setOpen = isFrom
      ? setFromOpen
      : setToOpen;

    if (!list.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setOpen(true);

      setActive(
        (active + 1) %
          list.length
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setOpen(true);

      setActive(
        (active - 1 + list.length) %
          list.length
      );
    }

    if (
      event.key === "Enter" &&
      (isFrom
        ? fromOpen
        : toOpen)
    ) {
      event.preventDefault();

      setValue(
        formatAirportLabel(
          list[active]
        )
      );
      if (isFrom) {
        setFromCode(
          list[active].code
        );
      } else {
        setToCode(
          list[active].code
        );
      }

      setOpen(false);
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const onSwapAirports = () => {
    const fromValue = from;
    const fromCanonicalCode = fromCode;

    setFrom(to);
    setFromCode(toCode);
    setTo(fromValue);
    setToCode(fromCanonicalCode);
    setFromOpen(false);
    setToOpen(false);
  };

  const isFlightSearchDisabled =
    !from.trim() ||
    !to.trim() ||
    !departureDate ||
    (tripType ===
      "round-trip" &&
      !returnDate);

  const onFlightSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      isFlightSearchDisabled
    ) {
      return;
    }

    const params =
      new URLSearchParams({
        tripType:
          tripType ===
          "one-way"
            ? "one-way"
            : "round-trip",
        origin:
          fromCode ||
          from.trim(),
        destination:
          toCode ||
          to.trim(),
        departureDate,
        travelers,
        cabinClass,
      });

    if (
      tripType ===
        "round-trip" &&
      returnDate
    ) {
      params.set(
        "returnDate",
        returnDate
      );
    }

    router.push(
      `/flights/results?${params.toString()}`
    );
  };

  const isHotelSearchDisabled =
    !destination.trim() ||
    !checkIn ||
    !checkOut ||
    checkOut <= checkIn;

  const onHotelSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      isHotelSearchDisabled
    ) {
      return;
    }

    const params =
      new URLSearchParams({
        destination:
          destination.trim(),
        checkIn,
        checkOut,
        guests: String(
          Math.min(
            12,
            Math.max(
              1,
              Number(guests || 1)
            )
          )
        ),
        rooms: String(
          Math.min(
            6,
            Math.max(
              1,
              Number(rooms || 1)
            )
          )
        ),
      });

    router.push(
      `/hotels/results?${params.toString()}`
    );
  };

  return (
    <section className={wrapper}>
      <div className="mb-2 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() =>
            setTab("flights")
          }
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
            tab === "flights"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          )}
        >
          <Plane size={16} />
          {t.flights ||
            "Flights"}
        </button>

        <button
          type="button"
          onClick={() =>
            setTab("hotels")
          }
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
            tab === "hotels"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          )}
        >
          <BedDouble size={16} />
          {t.hotels ||
            "Hotels"}
        </button>
      </div>

      {tab === "flights" ? (
        <form
          onSubmit={
            onFlightSubmit
          }
          className="space-y-1.5"
        >
          <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_48px_minmax(0,1.15fr)_minmax(0,1.35fr)_minmax(0,1.15fr)_112px] lg:gap-0">
              <div
                ref={fromWrapRef}
                className="relative min-h-[54px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200"
              >
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {t.origin ||
                    "Origin"}
                </label>
                <input
                  type="text"
                  value={from}
                  onChange={(
                    event
                  ) => {
                    setFrom(
                      event
                        .target
                        .value
                    );
                    setFromCode("");
                    setFromOpen(
                      true
                    );
                    setFromHighlight(
                      0
                    );
                  }}
                  onFocus={() =>
                    setFromOpen(
                      true
                    )
                  }
                  onKeyDown={(
                    event
                  ) =>
                    onKeyNav(
                      event,
                      true
                    )
                  }
                  placeholder="City or airport"
                  className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400"
                  required
                />
                {fromOpen &&
                fromSuggestions.length ? (
                  <div className="absolute left-0 right-0 z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {fromSuggestions.map(
                      (
                        option,
                        index
                      ) => (
                        <button
                          key={`${option.code}-${option.airport}`}
                          type="button"
                          onClick={() => {
                            setFrom(
                              formatAirportLabel(
                                option
                              )
                            );
                            setFromCode(
                              option.code
                            );
                            setFromOpen(
                              false
                            );
                          }}
                          className={cn(
                            "block w-full px-3 py-2 text-left text-sm transition-colors",
                            fromHighlight ===
                              index
                              ? "bg-slate-100"
                              : "hover:bg-slate-50"
                          )}
                        >
                          {formatAirportLabel(
                            option
                          )}
                        </button>
                      )
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex min-h-[54px] items-center justify-center rounded-xl border border-slate-200 bg-white lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200">
                <button
                  type="button"
                  onClick={onSwapAirports}
                  className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                  aria-label="Swap origin and destination"
                >
                  <ArrowRightLeft size={16} />
                </button>
              </div>

              <div
                ref={toWrapRef}
                className="relative min-h-[54px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200"
              >
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {t.destination ||
                    "Destination"}
                </label>
                <input
                  type="text"
                  value={to}
                  onChange={(
                    event
                  ) => {
                    setTo(
                      event.target
                        .value
                    );
                    setToCode("");
                    setToOpen(
                      true
                    );
                    setToHighlight(
                      0
                    );
                  }}
                  onFocus={() =>
                    setToOpen(true)
                  }
                  onKeyDown={(
                    event
                  ) =>
                    onKeyNav(
                      event,
                      false
                    )
                  }
                  placeholder="City or airport"
                  className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400"
                  required
                />
                {toOpen &&
                toSuggestions.length ? (
                  <div className="absolute left-0 right-0 z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {toSuggestions.map(
                      (
                        option,
                        index
                      ) => (
                        <button
                          key={`${option.code}-${option.airport}`}
                          type="button"
                          onClick={() => {
                            setTo(
                              formatAirportLabel(
                                option
                              )
                            );
                            setToCode(
                              option.code
                            );
                            setToOpen(
                              false
                            );
                          }}
                          className={cn(
                            "block w-full px-3 py-2 text-left text-sm transition-colors",
                            toHighlight ===
                              index
                              ? "bg-slate-100"
                              : "hover:bg-slate-50"
                          )}
                        >
                          {formatAirportLabel(
                            option
                          )}
                        </button>
                      )
                    )}
                  </div>
                ) : null}
              </div>

              <div className="grid min-h-[54px] grid-cols-1 gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 sm:grid-cols-2 sm:divide-x sm:divide-slate-200 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200">
                <div className="sm:pr-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.departureDate ||
                      "Departure"}
                  </label>
                  <input
                    type="date"
                    value={
                      departureDate
                    }
                    onChange={(
                      event
                    ) =>
                      setDepartureDate(
                        event
                          .target
                          .value
                      )
                    }
                    className="focus-ring h-7 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors"
                    required
                  />
                </div>
                <div className="sm:pl-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">{t.returnDate || "Return"}</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(event) => setReturnDate(event.target.value)}
                    disabled={tripType !== "round-trip"}
                    required={tripType === "round-trip"}
                    className="focus-ring h-7 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors disabled:cursor-not-allowed disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid min-h-[54px] grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">{t.travelers || "Travelers"}</label>
                  <input
                    type="number"
                    min={1}
                    max={9}
                    value={
                      travelers
                    }
                    onChange={(
                      event
                    ) =>
                      setTravelers(
                        String(
                          Math.min(
                            9,
                            Math.max(
                              1,
                              Number(
                                event
                                  .target
                                  .value ||
                                  1
                              )
                            )
                          )
                        )
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.cabinClass ||
                      "Cabin class"}
                  </label>
                  <select
                    value={
                      cabinClass
                    }
                    onChange={(
                      event
                    ) =>
                      setCabinClass(
                        event
                          .target
                          .value
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm outline-none transition-colors"
                  >
                    <option value="economy">
                      Economy
                    </option>
                    <option value="premium-economy">
                      Premium
                      economy
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

              <div className="sm:col-span-2 lg:col-span-1">
                <Button
                  type="submit"
                  disabled={
                    isFlightSearchDisabled
                  }
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-950 to-violet-800 px-4 text-sm font-bold text-white shadow-md shadow-indigo-900/30 lg:h-[54px]"
                >
                  {t.search ||
                    "Search"}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 lg:px-1">
            {/* Multi-city requires a separate results flow before exposing it. */}
            {(
              [
                "round-trip",
                "one-way",
              ] as const
            ).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  setTripType(
                    mode
                  )
                }
                className={cn(
                  "focus-ring rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
                  tripType ===
                    mode
                    ? "border-navy bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900"
                )}
              >
                {tripTypeLabel(
                  mode
                )}
              </button>
            ))}
          </div>
        </form>
      ) : (
        <form
          onSubmit={
            onHotelSubmit
          }
          className="space-y-1.5"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_112px] lg:gap-0">
              <div className="min-h-[54px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {t.destination ||
                    "Destination"}
                </label>
                <input
                  type="text"
                  value={
                    destination
                  }
                  onChange={(
                    event
                  ) =>
                    setDestination(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="City or hotel"
                  className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="grid min-h-[54px] grid-cols-1 gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 sm:grid-cols-2 sm:divide-x sm:divide-slate-200 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200">
                <div className="sm:pr-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.checkIn ||
                      "Check-in"}
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(
                      event
                    ) =>
                      setCheckIn(
                        event
                          .target
                          .value
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors"
                    required
                  />
                </div>
                <div className="sm:pl-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.checkOut ||
                      "Check-out"}
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    min={
                      checkIn ||
                      undefined
                    }
                    onChange={(
                      event
                    ) =>
                      setCheckOut(
                        event
                          .target
                          .value
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="grid min-h-[54px] grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.guests ||
                      "Guests"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={guests}
                    onChange={(
                      event
                    ) =>
                      setGuests(
                        String(
                          Math.min(
                            12,
                            Math.max(
                              1,
                              Number(
                                event
                                  .target
                                  .value ||
                                  1
                              )
                            )
                          )
                        )
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.rooms ||
                      "Rooms"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={rooms}
                    onChange={(
                      event
                    ) =>
                      setRooms(
                        String(
                          Math.min(
                            6,
                            Math.max(
                              1,
                              Number(
                                event
                                  .target
                                  .value ||
                                  1
                              )
                            )
                          )
                        )
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <Button
                  type="submit"
                  disabled={
                    isHotelSearchDisabled
                  }
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-950 to-violet-800 px-4 text-sm font-bold text-white shadow-md shadow-indigo-900/30 lg:h-[54px]"
                >
                  {t.search ||
                    "Search"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
