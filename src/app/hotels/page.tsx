"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  Minus,
  Plus,
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { validateDestinationImages } from "@/data/destinationImageValidation";

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

const moreHotelDestinationCards: HotelDestinationCard[] = [
  {
    title: "Italy",
    subtitle: "Rome stays",
    destinationQuery: "Rome",
    image:
      "https://images.pexels.com/photos/1701595/pexels-photo-1701595.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "The Colosseum in Rome beneath a clear blue sky",
    linkLabel: "Search hotels in Rome, Italy",
  },
  {
    title: "United Arab Emirates",
    subtitle: "Dubai stays",
    destinationQuery: "Dubai",
    image:
      "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Dubai skyline with the Burj Khalifa rising above skyscrapers",
    linkLabel: "Search hotels in Dubai, United Arab Emirates",
  },
  {
    title: "Singapore",
    subtitle: "Singapore stays",
    destinationQuery: "Singapore",
    image:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Marina Bay skyline in Singapore at dusk",
    linkLabel: "Search hotels in Singapore, Singapore",
  },
  {
    title: "Spain",
    subtitle: "Barcelona stays",
    destinationQuery: "Barcelona",
    image:
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Barcelona cityscape with Sagrada Familia in daylight",
    linkLabel: "Search hotels in Barcelona, Spain",
  },
];

const globalHotelDestinationCards: HotelDestinationCard[] = [
  {
    title: "Canada",
    subtitle: "Toronto stays",
    destinationQuery: "Toronto",
    image:
      "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Toronto skyline with the CN Tower beside Lake Ontario",
    linkLabel: "Search hotels in Toronto, Canada",
  },
  {
    title: "Netherlands",
    subtitle: "Amsterdam stays",
    destinationQuery: "Amsterdam",
    image:
      "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Amsterdam canal houses and bridge along the water",
    linkLabel: "Search hotels in Amsterdam, Netherlands",
  },
  {
    title: "Thailand",
    subtitle: "Bangkok stays",
    destinationQuery: "Bangkok",
    image:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Bangkok city skyline and Chao Phraya river at sunset",
    linkLabel: "Search hotels in Bangkok, Thailand",
  },
  {
    title: "Mexico",
    subtitle: "Cancun stays",
    destinationQuery: "Cancun",
    image:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Cancun beach with white sand and turquoise water",
    linkLabel: "Search hotels in Cancun, Mexico",
  },
  {
    title: "Turkey",
    subtitle: "Istanbul stays",
    destinationQuery: "Istanbul",
    image:
      "https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Istanbul waterfront with domes and minarets at golden hour",
    linkLabel: "Search hotels in Istanbul, Turkey",
  },
];

const hotelInspirationCategoryChips = [
  "Beach",
  "City breaks",
  "Family trips",
  "Relaxed stays",
  "Weekend ideas",
] as const;

type HotelInspirationCategory = (typeof hotelInspirationCategoryChips)[number];

type HotelInspirationCard = HotelDestinationCard & {
  badge: string;
  detail: string;
};

const destinationImageCatalog = [
  ...hotelDestinationCards,
  ...moreHotelDestinationCards,
  ...globalHotelDestinationCards,
];

const getDestinationCard = (destinationQuery: string) => {
  const card = destinationImageCatalog.find(
    (item) => item.destinationQuery === destinationQuery,
  );

  if (!card) {
    throw new Error(
      `Hotel inspiration category references unknown destination: ${destinationQuery}`,
    );
  }

  return card;
};

const createHotelInspirationCard = (
  destinationQuery: string,
  badge: string,
): HotelInspirationCard => {
  const card = getDestinationCard(destinationQuery);

  return {
    ...card,
    title: card.destinationQuery,
    subtitle: card.title,
    badge,
    detail: card.title,
  };
};

const hotelInspirationCardsByCategory: Record<
  HotelInspirationCategory,
  HotelInspirationCard[]
> = {
  Beach: [
    createHotelInspirationCard("Cancun", "Coastal stays"),
    createHotelInspirationCard("Barcelona", "City coast"),
    createHotelInspirationCard("Dubai", "Waterfront stays"),
    createHotelInspirationCard("Singapore", "Harbor city"),
    createHotelInspirationCard("Bangkok", "Warm escape"),
    createHotelInspirationCard("Tokyo", "Bay city"),
  ],
  "City breaks": [
    createHotelInspirationCard("London", "Capital stays"),
    createHotelInspirationCard("Paris", "Classic city"),
    createHotelInspirationCard("Toronto", "City ideas"),
    createHotelInspirationCard("Istanbul", "Culture stays"),
    createHotelInspirationCard("Rome", "Historic city"),
    createHotelInspirationCard("Amsterdam", "Canal stays"),
  ],
  "Family trips": [
    createHotelInspirationCard("Toronto", "Family city"),
    createHotelInspirationCard("Singapore", "Easy exploring"),
    createHotelInspirationCard("Cancun", "Beach time"),
    createHotelInspirationCard("London", "City exploring"),
    createHotelInspirationCard("Dubai", "Waterfront stays"),
    createHotelInspirationCard("Tokyo", "City adventure"),
  ],
  "Relaxed stays": [
    createHotelInspirationCard("Cancun", "Coastal stays"),
    createHotelInspirationCard("Dubai", "Waterfront stays"),
    createHotelInspirationCard("Singapore", "Harbor city"),
    createHotelInspirationCard("Amsterdam", "Canal stays"),
    createHotelInspirationCard("Bangkok", "Warm escape"),
    createHotelInspirationCard("Paris", "Slow city days"),
  ],
  "Weekend ideas": [
    createHotelInspirationCard("Rome", "Historic city"),
    createHotelInspirationCard("Amsterdam", "Canal stays"),
    createHotelInspirationCard("Barcelona", "City coast"),
    createHotelInspirationCard("Istanbul", "Culture stays"),
    createHotelInspirationCard("Paris", "Classic city"),
    createHotelInspirationCard("Toronto", "City ideas"),
  ],
};

type HotelDestinationLink = HotelDestinationCard & {
  href: string;
};

type DestinationCardProps = {
  card: HotelDestinationLink;
  imageSizes: string;
  isCompact?: boolean;
  isFeatured?: boolean;
};

function DestinationCard({
  card,
  imageSizes,
  isCompact = false,
  isFeatured = false,
}: DestinationCardProps) {
  return (
    <Link
      href={card.href}
      aria-label={card.linkLabel}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-26px_rgba(15,23,42,0.34)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_-26px_rgba(15,23,42,0.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
    >
      <div
        className={`relative w-full overflow-hidden bg-slate-100 ${
          isFeatured
            ? "h-[18rem] sm:h-[20rem] md:h-[24rem] lg:h-[25rem]"
            : isCompact
              ? "aspect-[16/11]"
              : "aspect-[4/3]"
        }`}
      >
        <Image
          src={card.image}
          alt={card.imageAlt}
          fill
          sizes={imageSizes}
          className="object-cover saturate-[1.08] contrast-[1.02] transition duration-700 group-hover:scale-[1.03] group-hover:saturate-[1.12]"
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-slate-900/5" />
      </div>
      <div className={isCompact ? "p-3.5 sm:p-4" : "p-4 md:p-5"}>
        <p
          className={
            isCompact
              ? "text-base font-semibold leading-tight tracking-[-0.012em] text-slate-900 sm:text-lg"
              : "text-lg font-semibold leading-tight tracking-[-0.012em] text-slate-900 md:text-xl"
          }
        >
          {card.title}
        </p>
        <p
          className={
            isCompact
              ? "mt-1.5 text-xs font-medium leading-5 text-slate-600 sm:text-sm"
              : "mt-2 text-sm font-medium leading-5 text-slate-600"
          }
        >
          {card.subtitle}
        </p>
      </div>
    </Link>
  );
}

type InspirationCardProps = {
  card: HotelDestinationLink & Pick<HotelInspirationCard, "badge" | "detail">;
};

function InspirationCard({ card }: InspirationCardProps) {
  return (
    <Link
      href={card.href}
      aria-label={card.linkLabel}
      className="group flex h-full min-w-0 flex-col rounded-2xl bg-white p-2 transition duration-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-50 sm:p-2.5"
    >
      <div className="relative h-[6.75rem] w-full overflow-hidden rounded-xl bg-slate-100 sm:h-32 md:h-44 lg:h-48">
        <Image
          src={card.image}
          alt={card.imageAlt}
          fill
          sizes="(min-width: 1024px) 31vw, (min-width: 768px) 45vw, 42vw"
          className="object-cover saturate-[1.06] contrast-[1.02] transition duration-700 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-slate-900/5" />
      </div>
      <div className="px-1 pb-1 pt-2.5 sm:pb-1.5 sm:pt-3">
        <span className="mb-1.5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.68rem] font-semibold leading-5 text-slate-700 sm:mb-2 sm:px-2.5 sm:py-1 sm:text-xs">
          {card.badge}
        </span>
        <p className="text-[0.95rem] font-semibold leading-tight tracking-[-0.012em] text-slate-900 sm:text-base md:text-lg">
          {card.title}
        </p>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-600 sm:mt-1.5 sm:text-sm">
          {card.detail}
        </p>
      </div>
    </Link>
  );
}

validateDestinationImages(
  "hotel destination cards",
  destinationImageCatalog.map((card) => ({
    id: card.destinationQuery,
    image: card.image,
  })),
);

hotelInspirationCategoryChips.forEach((category) => {
  validateDestinationImages(
    `hotel inspiration ${category} cards`,
    hotelInspirationCardsByCategory[category].map((card) => ({
      id: card.destinationQuery,
      image: card.image,
    })),
  );
});

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
  const [selectedInspirationCategory, setSelectedInspirationCategory] =
    useState<HotelInspirationCategory>("Beach");
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

  const destinationCardHref = useMemo(() => {
    const baseDate = new Date();
    const defaultCheckIn = addDays(baseDate, 21);
    const defaultCheckOut = addDays(baseDate, 24);

    return (destinationQuery: string) =>
      `/hotels/results?${new URLSearchParams({
        destination: destinationQuery,
        checkIn: defaultCheckIn,
        checkOut: defaultCheckOut,
        guests: "2",
        rooms: "1",
      }).toString()}`;
  }, []);

  const hotelDestinationLinks = useMemo(
    () =>
      hotelDestinationCards.map((card) => ({
        ...card,
        href: destinationCardHref(card.destinationQuery),
      })),
    [destinationCardHref],
  );

  const moreHotelDestinationLinks = useMemo(
    () =>
      moreHotelDestinationCards.map((card) => ({
        ...card,
        href: destinationCardHref(card.destinationQuery),
      })),
    [destinationCardHref],
  );

  const globalHotelDestinationLinks = useMemo(
    () =>
      globalHotelDestinationCards.map((card) => ({
        ...card,
        href: destinationCardHref(card.destinationQuery),
      })),
    [destinationCardHref],
  );

  const hotelInspirationLinks = useMemo(
    () =>
      hotelInspirationCardsByCategory[selectedInspirationCategory].map(
        (card) => ({
          ...card,
          href: destinationCardHref(card.destinationQuery),
        }),
      ),
    [destinationCardHref, selectedInspirationCategory],
  );

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
      <main className="page-shell relative isolate flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f6f7fb_48%,#f8fafc_100%)] pb-16 pt-8 sm:pt-10 lg:pt-12">
        <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-64 w-[min(50rem,88vw)] -translate-x-1/2 rounded-full bg-white/55 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-28 -z-10 h-80 w-80 rounded-full bg-slate-200/14 blur-3xl" />
        <div className="relative mx-auto max-w-6xl space-y-11 md:space-y-14">
          <section className="mx-auto w-full max-w-[1040px] space-y-3">
            <p className="px-1 text-sm font-medium text-slate-600">
              Compare hotel options
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
                      className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 lg:h-full lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-600/20"
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

          <section
            className="space-y-4"
            aria-labelledby="hotel-destinations-heading"
          >
            <h2
              id="hotel-destinations-heading"
              className="px-1 text-[1.35rem] font-semibold leading-[1.18] tracking-[-0.014em] text-slate-800 md:text-[2rem]"
            >
              Explore hotel stays by destination
            </h2>
            <div className="border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.28)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="grid auto-cols-[minmax(260px,86vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                {hotelDestinationLinks.map((card) => (
                  <DestinationCard
                    key={card.title}
                    card={card}
                    imageSizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 86vw"
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            className="space-y-4"
            aria-labelledby="more-hotel-destinations-heading"
          >
            <h2
              id="more-hotel-destinations-heading"
              className="px-1 text-[1.2rem] font-semibold leading-[1.2] tracking-[-0.012em] text-slate-800 md:text-[1.85rem]"
            >
              Featured hotel destinations
            </h2>
            <div className="border border-slate-200/80 bg-slate-50/85 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="grid auto-cols-[minmax(250px,84vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                {moreHotelDestinationLinks.map((card) => (
                  <DestinationCard
                    key={card.title}
                    card={card}
                    imageSizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 84vw"
                    isFeatured
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            className="space-y-5"
            aria-labelledby="hotel-inspiration-heading"
          >
            <div className="border border-slate-200/80 bg-slate-50/90 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <h2
                    id="hotel-inspiration-heading"
                    className="text-[1.2rem] font-semibold leading-[1.2] tracking-[-0.012em] text-slate-800 md:text-[1.85rem]"
                  >
                    Find stays for every kind of trip
                  </h2>
                  <p className="mt-1.5 max-w-xl text-[0.9rem] leading-5 text-slate-600 md:mt-2 md:text-base md:leading-6">
                    Browse destination ideas by the kind of stay you have in
                    mind.
                  </p>
                </div>
                <div
                  className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] md:flex-wrap md:justify-end md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden"
                  aria-label="Hotel inspiration categories"
                >
                  {hotelInspirationCategoryChips.map((chip) => {
                    const isSelected = chip === selectedInspirationCategory;

                    return (
                      <button
                        key={chip}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedInspirationCategory(chip)}
                        className={`focus-ring whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:overflow-visible md:px-0 md:pb-0 md:pt-0 [&::-webkit-scrollbar]:hidden">
                <div className="grid auto-cols-[minmax(148px,42vw)] grid-flow-col grid-rows-2 gap-3 sm:auto-cols-[minmax(170px,34vw)] sm:gap-4 md:grid-flow-row md:auto-cols-auto md:grid-cols-3 md:grid-rows-none">
                  {hotelInspirationLinks.map((card) => (
                    <InspirationCard key={card.title} card={card} />
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section className="relative isolate rounded-[1.5rem] border border-slate-200/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,250,252,0.72)_54%,rgba(241,245,249,0.58))] p-2 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.34)] ring-1 ring-white/80 sm:rounded-[2rem] sm:p-4">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
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
                  body: "When you choose an option, continue with the provider to confirm final price, availability, fees, and cancellation rules.",
                  icon: Calendar,
                },
              ].map((item, index) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className={`relative isolate cursor-default overflow-hidden rounded-[1rem] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(248,250,252,0.7)_58%,rgba(241,245,249,0.78))] p-2.5 shadow-[0_14px_34px_-32px_rgba(15,23,42,0.38)] ring-1 ring-white/70 backdrop-blur-sm sm:rounded-[1.5rem] sm:p-6 ${
                      index === 2 ? "col-span-2 md:col-span-1" : ""
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent" />
                    <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-slate-200/30 blur-3xl" />
                    <div
                      className="relative mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-[0.8rem] border border-indigo-200/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72)_52%,rgba(248,250,252,0.92))] text-indigo-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_22px_-18px_rgba(79,70,229,0.55),0_8px_18px_-20px_rgba(15,23,42,0.55)] sm:mb-5 sm:h-12 sm:w-12 sm:rounded-[1rem]"
                      aria-hidden="true"
                    >
                      <span className="pointer-events-none absolute inset-[3px] rounded-[0.62rem] border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.88)] sm:inset-1 sm:rounded-[0.78rem]" />
                      <span className="pointer-events-none absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(129,140,248,0.18)] sm:left-2 sm:top-2 sm:h-2 sm:w-2" />
                      <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-lg bg-white/45 ring-1 ring-indigo-100/70 sm:h-8 sm:w-8 sm:rounded-xl">
                        <Icon className="h-3.5 w-3.5 stroke-[1.8] sm:h-5 sm:w-5" />
                      </span>
                    </div>
                    <h2 className="relative text-[0.82rem] font-semibold leading-snug tracking-[-0.01em] text-slate-800 sm:text-base">
                      {item.title}
                    </h2>
                    <p className="relative mt-1.5 text-[0.75rem] leading-4 text-slate-700 sm:mt-2 sm:text-sm sm:leading-6">
                      {item.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section
            className="space-y-4"
            aria-labelledby="global-hotel-destinations-heading"
          >
            <h2
              id="global-hotel-destinations-heading"
              className="px-1 text-[1.2rem] font-semibold leading-[1.2] tracking-[-0.012em] text-slate-800 md:text-[1.85rem]"
            >
              Explore stays around the world
            </h2>
            <div className="border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="grid auto-cols-[minmax(220px,76vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
                {globalHotelDestinationLinks.map((card) => (
                  <DestinationCard
                    key={card.title}
                    card={card}
                    imageSizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 76vw"
                    isCompact
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
