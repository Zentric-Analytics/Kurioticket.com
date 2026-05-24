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
        "rounded-2xl bg-white",
        compactHero
          ? "p-0"
          : "border border-slate-200 p-4"
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
      <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() =>
            setTab("flights")
          }
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold",
            tab === "flights"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-600"
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
            "focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold",
            tab === "hotels"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-600"
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
          className={cn(
            "space-y-4",
            compactHero
              ? "rounded-2xl border border-slate-200 p-4"
              : ""
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
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
                  "focus-ring rounded-full border px-3 py-1.5 text-sm font-semibold",
                  tripType ===
                    mode
                    ? "border-navy bg-navy text-white"
                    : "border-slate-300 text-slate-700"
                )}
              >
                {tripTypeLabel(
                  mode
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div
              ref={fromWrapRef}
              className="relative"
            >
              <label className="mb-1 block text-xs font-semibold text-slate-600">
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
                className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                required
              />
              {fromOpen &&
              fromSuggestions.length ? (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
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
                          "block w-full px-3 py-2 text-left text-sm",
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

            <div
              ref={toWrapRef}
              className="relative"
            >
              <label className="mb-1 block text-xs font-semibold text-slate-600">
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
                className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                required
              />
              {toOpen &&
              toSuggestions.length ? (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
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
                          "block w-full px-3 py-2 text-left text-sm",
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

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
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
                className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                required
              />
            </div>

            {tripType ===
            "round-trip" ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {t.returnDate ||
                    "Return"}
                </label>
                <input
                  type="date"
                  value={
                    returnDate
                  }
                  onChange={(
                    event
                  ) =>
                    setReturnDate(
                      event
                        .target
                        .value
                    )
                  }
                  className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                  required
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t.travelers ||
                  "Travelers"}
              </label>
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
                className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
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
                className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
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

            <div className="flex items-end">
              <Button
                type="submit"
                disabled={
                  isFlightSearchDisabled
                }
                className="h-11 w-full"
              >
                {t.search ||
                  "Search"}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <form
          onSubmit={
            onHotelSubmit
          }
          className={cn(
            "space-y-4",
            compactHero
              ? "rounded-2xl border border-slate-200 p-4"
              : ""
          )}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
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
                className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
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
                className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
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
                className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
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
                className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
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
                className="focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                required
              />
            </div>

            <div className="flex items-end">
              <Button
                type="submit"
                disabled={
                  isHotelSearchDisabled
                }
                className="h-11 w-full"
              >
                {t.search ||
                  "Search"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
