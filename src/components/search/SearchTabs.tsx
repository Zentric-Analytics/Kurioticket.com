"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  BedDouble,
  Plane,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type TabMode = "flights" | "hotels";

type TripType =
  | "round-trip"
  | "one-way"
  | "multi-city";

type SearchTabsProps = {
  t: Record<string, string>;
  compactHero?: boolean;
};

type AirportOption = {
  city: string;
  airport: string;
  code: string;
  lat: number;
  lon: number;
};

const AIRPORTS: AirportOption[] = [
  {
    city: "Lagos",
    airport: "Murtala Muhammed",
    code: "LOS",
    lat: 6.5774,
    lon: 3.3212,
  },
  {
    city: "Abuja",
    airport: "Nnamdi Azikiwe",
    code: "ABV",
    lat: 9.0068,
    lon: 7.2632,
  },
  {
    city: "London",
    airport: "Heathrow",
    code: "LHR",
    lat: 51.47,
    lon: -0.4543,
  },
  {
    city: "Dubai",
    airport: "Dubai International",
    code: "DXB",
    lat: 25.2532,
    lon: 55.3657,
  },
  {
    city: "Toronto",
    airport: "Pearson",
    code: "YYZ",
    lat: 43.6777,
    lon: -79.6248,
  },
  {
    city: "New York",
    airport: "John F. Kennedy",
    code: "JFK",
    lat: 40.6413,
    lon: -73.7781,
  },
  {
    city: "Paris",
    airport: "Charles de Gaulle",
    code: "CDG",
    lat: 49.0097,
    lon: 2.5479,
  },
];

const formatAirport = (
  item: AirportOption
) => `${item.city} (${item.code})`;

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

  const [to, setTo] =
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
        AIRPORTS.filter((a) =>
          labelAirport(a).includes(
            from.toLowerCase()
          )
        ).slice(0, 7),
      [from]
    );

  const toSuggestions =
    useMemo(
      () =>
        AIRPORTS.filter((a) =>
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
        formatAirport(
          list[active]
        )
      );

      setOpen(false);
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
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
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
            {(
              [
                "round-trip",
                "one-way",
                "multi-city",
              ] as TripType[]
            ).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  setTripType(mode)
                }
                className={cn(
                  "focus-ring rounded-full px-3 py-1.5 capitalize",
                  tripType === mode
                    ? "bg-violet-100 text-[#5b21d6]"
                    : "bg-slate-100 text-slate-700"
                )}
              >
                {tripTypeLabel(
                  mode
                )}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setTab("hotels")
              }
              className="ml-auto text-[#5b21d6] underline-offset-2 hover:underline"
            >
              {t.searchHotelsInstead ||
                "Search hotels instead"}
            </button>
          </div>

          <form
            className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_140px]"
            onSubmit={(
              event
            ) => {
              event.preventDefault();

              const params =
                new URLSearchParams(
                  {
                    tripType,
                    origin:
                      from.trim(),
                    destination:
                      to.trim(),
                    departureDate,
                    returnDate:
                      tripType ===
                      "one-way"
                        ? ""
                        : returnDate,
                    travelers,
                    cabinClass,
                  }
                );

              router.push(
                `/flights/results?${params.toString()}`
              );
            }}
          >
            <div
              className="relative"
              ref={fromWrapRef}
            >
              <input
                value={from}
                onChange={(
                  event
                ) => {
                  setFrom(
                    event.target
                      .value
                  );

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
                required
                placeholder={
                  t.from ||
                  "From"
                }
                className="focus-ring h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold"
              />

              {fromOpen ? (
                <div className="absolute z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                  {fromSuggestions.map(
                    (
                      item,
                      index
                    ) => (
                      <button
                        key={
                          item.code
                        }
                        type="button"
                        onMouseEnter={() =>
                          setFromHighlight(
                            index
                          )
                        }
                        onClick={() => {
                          setFrom(
                            formatAirport(
                              item
                            )
                          );

                          setFromOpen(
                            false
                          );
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm",
                          fromHighlight ===
                            index
                            ? "bg-violet-100 text-[#4c1d95]"
                            : "hover:bg-violet-50"
                        )}
                      >
                        {formatAirport(
                          item
                        )}
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </div>

            <div
              className="relative"
              ref={toWrapRef}
            >
              <input
                value={to}
                onChange={(
                  event
                ) => {
                  setTo(
                    event.target
                      .value
                  );

                  setToOpen(
                    true
                  );

                  setToHighlight(
                    0
                  );
                }}
                onFocus={() =>
                  setToOpen(
                    true
                  )
                }
                onKeyDown={(
                  event
                ) =>
                  onKeyNav(
                    event,
                    false
                  )
                }
                required
                placeholder={
                  t.to ||
                  "To"
                }
                className="focus-ring h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold"
              />

              {toOpen ? (
                <div className="absolute z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                  {toSuggestions.map(
                    (
                      item,
                      index
                    ) => (
                      <button
                        key={
                          item.code
                        }
                        type="button"
                        onMouseEnter={() =>
                          setToHighlight(
                            index
                          )
                        }
                        onClick={() => {
                          setTo(
                            formatAirport(
                              item
                            )
                          );

                          setToOpen(
                            false
                          );
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm",
                          toHighlight ===
                            index
                            ? "bg-violet-100 text-[#4c1d95]"
                            : "hover:bg-violet-50"
                        )}
                      >
                        {formatAirport(
                          item
                        )}
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </div>

            <input
              type="date"
              value={
                departureDate
              }
              onChange={(
                event
              ) =>
                setDepartureDate(
                  event.target
                    .value
                )
              }
              required
              className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
            />

            <input
              type="date"
              value={returnDate}
              onChange={(
                event
              ) =>
                setReturnDate(
                  event.target
                    .value
                )
              }
              disabled={
                tripType ===
                "one-way"
              }
              className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50"
            />

            <select
              value={travelers}
              onChange={(
                event
              ) =>
                setTravelers(
                  event.target
                    .value
                )
              }
              className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
            >
              <option value="1">
                {t.oneTraveler ||
                  "1 Traveler"}
              </option>

              <option value="2">
                {t.twoTravelers ||
                  "2 Travelers"}
              </option>

              <option value="3">
                {t.threeTravelers ||
                  "3 Travelers"}
              </option>

              <option value="4">
                {t.fourTravelers ||
                  "4 Travelers"}
              </option>
            </select>

            <select
              value={cabinClass}
              onChange={(
                event
              ) =>
                setCabinClass(
                  event.target
                    .value
                )
              }
              className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
            >
              <option value="economy">
                {t.economy ||
                  "Economy"}
              </option>

              <option value="premium-economy">
                {t.premiumEconomy ||
                  "Premium economy"}
              </option>

              <option value="business">
                {t.business ||
                  "Business"}
              </option>

              <option value="first">
                {t.first ||
                  "First"}
              </option>
            </select>

            <Button
              type="submit"
              className="h-11 rounded-lg bg-[#5b21d6] font-bold text-white hover:bg-[#4c1d95]"
            >
              {t.searchFlights ||
                "Search Flights"}
            </Button>
          </form>
        </>
      ) : (
        <form
          className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(160px,1.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(90px,0.7fr)_140px]"
          onSubmit={(
            event
          ) => {
            event.preventDefault();

            const params =
              new URLSearchParams(
                {
                  destination,
                  checkIn,
                  checkOut,
                  guests,
                  rooms,
                }
              );

            router.push(
              `/hotels/results?${params.toString()}`
            );
          }}
        >
          <input
            value={destination}
            onChange={(
              event
            ) =>
              setDestination(
                event.target
                  .value
              )
            }
            required
            placeholder={
              t.destination ||
              "Destination"
            }
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          />

          <input
            type="date"
            value={checkIn}
            onChange={(
              event
            ) =>
              setCheckIn(
                event.target
                  .value
              )
            }
            required
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          />

          <input
            type="date"
            value={checkOut}
            onChange={(
              event
            ) =>
              setCheckOut(
                event.target
                  .value
              )
            }
            required
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          />

          <select
            value={guests}
            onChange={(
              event
            ) =>
              setGuests(
                event.target
                  .value
              )
            }
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          >
            <option value="1">
              1{" "}
              {t.adults ||
                "Adults"}
            </option>

            <option value="2">
              2{" "}
              {t.adults ||
                "Adults"}
            </option>

            <option value="3">
              3{" "}
              {t.adults ||
                "Adults"}
            </option>

            <option value="4">
              4{" "}
              {t.adults ||
                "Adults"}
            </option>
          </select>

          <select
            value={rooms}
            onChange={(
              event
            ) =>
              setRooms(
                event.target
                  .value
              )
            }
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          >
            <option value="1">
              1{" "}
              {t.room ||
                "Room"}
            </option>

            <option value="2">
              2{" "}
              {t.rooms ||
                "Rooms"}
            </option>

            <option value="3">
              3{" "}
              {t.rooms ||
                "Rooms"}
            </option>
          </select>

          <Button
            type="submit"
            className="h-11 rounded-lg bg-[#5b21d6] font-bold text-white hover:bg-[#4c1d95]"
          >
            {t.searchHotels ||
              "Search Hotels"}
          </Button>
        </form>
      )}
    </section>
  );
}