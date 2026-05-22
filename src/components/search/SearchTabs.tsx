"use client";

import {
  useEffect,
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
    </section>
  );
}