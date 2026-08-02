import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import {
  normalizeHotelClassificationStars,
  normalizeHotelReviewCount,
} from "@/lib/hotels/hotelRatingSemantics";
import type { DealsSearch } from "./dealsSearchParams";
import type {
  DealsPackageCandidate,
  DealsPackageProduct,
} from "./dealsPackageCandidates";

export type DealsPackageFlightLegView = {
  direction: "outbound" | "return" | "other";
  routeLabel: string;
  scheduleLabel: string;
  duration: string;
  stops: number;
  layoverLabel: string | null;
};

export type DealsPackageCardView = {
  headingId: string;
  header: {
    modeLabel: string;
    dateRangeLabel: string;
    stayDurationLabel?: string;
    accessibleSummary: string;
  };
  flight: null | {
    airlineLabel: string;
    cabinAndBaggageLabel: string;
    detailsPath: string | null;
    legs: DealsPackageFlightLegView[];
  };
  hotel: null | {
    name: string;
    image: string | undefined;
    ratingLabel: string;
    location: string;
    roomLabel: string;
    stayLabel: string;
    cancellation: string;
    amenities: string[];
    detailsPath: string | null;
  };
  car: null | {
    modelLabel: string;
    company: string;
    routeLabel: string;
    capacityLabel: string;
    rentalLabel: string;
    policyLabels: string[];
    detailsPath: string | null;
  };
  routeNotice: null | { label: string };
};

const internalPath = (href: unknown, product: DealsPackageProduct) => {
  const directory = product === "car" ? "cars" : `${product}s`;
  if (
    typeof href !== "string" ||
    !href.startsWith(`/${directory}/details/`) ||
    href.startsWith("//") ||
    href.includes("\\") ||
    href.includes("#")
  ) return null;
  try {
    const url = new URL(href, "https://kurioticket.invalid");
    return url.origin === "https://kurioticket.invalid"
      ? `${url.pathname}${url.search}`
      : null;
  } catch {
    return null;
  }
};

const actionHref = (action: unknown) =>
  typeof action === "object" && action !== null && "href" in action &&
  typeof action.href === "string" ? action.href : undefined;

const dayCount = (start: string, end: string) => {
  const from = Date.parse(`${start}T00:00:00Z`);
  const to = Date.parse(`${end}T00:00:00Z`);
  return Number.isFinite(from) && Number.isFinite(to) && to > from
    ? Math.round((to - from) / 86_400_000)
    : null;
};

const dateValue = (value: string) => {
  const result = Date.parse(value.includes("T") ? value : `${value}T00:00:00Z`);
  return Number.isFinite(result) ? result : null;
};

const formatDate = (value: string, locale: string) => {
  const parsed = dateValue(value);
  return parsed === null ? value : new Intl.DateTimeFormat(locale, {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(parsed);
};

const formatTime = (value: string, locale: string) => {
  const parsed = dateValue(value);
  return parsed === null ? value : new Intl.DateTimeFormat(locale, {
    hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }).format(parsed);
};

const titleCaseProviderText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed.toLocaleLowerCase().replace(/(^|[\s/(-])\p{L}/gu, letter => letter.toLocaleUpperCase());
};

const normalizedReview = (score?: number, scale?: number) =>
  score == null ? null : score * (10 / (scale || 10));

export function getDealsPackageCardPresentation(
  candidate: DealsPackageCandidate,
  search: DealsSearch,
  locale = "en",
): DealsPackageCardView {
  const flight = candidate.flight;
  const hotel = candidate.hotel;
  const car = candidate.car;
  const offer = car ? getPrimaryCarOffer(car) : undefined;
  const legs = flight
    ? (flight.legs?.length ? flight.legs : [{
        direction: "outbound" as const,
        originAirport: flight.originAirport,
        destinationAirport: flight.destinationAirport,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        duration: flight.duration,
        stops: flight.stops,
        layovers: flight.layovers,
        segments: [],
      }])
    : [];
  const outbound = legs.find(leg => leg.direction === "outbound") ?? legs[0];
  const actualDestination = outbound?.destinationAirport;

  const bounds = [
    ...legs.flatMap(leg => [leg.departureTime, leg.arrivalTime]),
    hotel && search.hotelCheckIn, hotel && search.hotelCheckOut,
    car && search.carPickupDate, car && search.carReturnDate,
  ].filter((value): value is string => Boolean(value)).map(value => ({ value, time: dateValue(value) }))
    .filter((item): item is { value: string; time: number } => item.time !== null)
    .sort((a, b) => a.time - b.time);
  const dateRangeLabel = bounds.length
    ? `${formatDate(bounds[0].value, locale)}${bounds.length > 1 ? ` – ${formatDate(bounds.at(-1)!.value, locale)}` : ""}`
    : "Dates not provided";
  const nights = hotel ? dayCount(search.hotelCheckIn, search.hotelCheckOut) : null;
  const modeLabel = candidate.mode.split("-").map(value => value[0].toUpperCase() + value.slice(1)).join(" + ");
  const stayDurationLabel = nights === null ? undefined : `${nights} ${nights === 1 ? "night" : "nights"}`;

  const expectedCode = search.flightDestinationCode.toUpperCase();
  const routeDiffers = Boolean(expectedCode && actualDestination && expectedCode !== actualDestination.toUpperCase());
  const routeNotice = routeDiffers
    ? { label: `Your selected destination is ${expectedCode}; this flight arrives at ${actualDestination}.` }
    : null;

  return {
    headingId: `package-${candidate.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    header: {
      modeLabel,
      dateRangeLabel,
      stayDurationLabel,
      accessibleSummary: `${[dateRangeLabel, stayDurationLabel].filter(Boolean).join(". ")}.`,
    },
    flight: flight ? {
      airlineLabel: `${flight.airlineName}${flight.flightNumber ? ` · ${flight.flightNumber}` : ""}`,
      cabinAndBaggageLabel: [titleCaseProviderText(flight.cabinClass), flight.baggageInfo].filter(Boolean).join(" · "),
      detailsPath: internalPath(actionHref(flight.searchPolicy.action), "flight"),
      legs: legs.map((leg, index) => {
        const departureDay = formatDate(leg.departureTime, locale);
        const arrivalDay = formatDate(leg.arrivalTime, locale);
        return {
          direction: leg.direction === "return" ? "return" : index === 0 ? "outbound" : "other",
          routeLabel: `${leg.originAirport} → ${leg.destinationAirport}`,
          scheduleLabel: `${departureDay} · ${formatTime(leg.departureTime, locale)} → ${departureDay === arrivalDay ? "" : `${arrivalDay} · `}${formatTime(leg.arrivalTime, locale)}`,
          duration: leg.duration,
          stops: leg.stops,
          layoverLabel: leg.layovers.length ? leg.layovers.map(item => `${item.duration} ${item.airport}`).join(" · ") : null,
        };
      }),
    } : null,
    hotel: hotel ? {
      name: hotel.name,
      image: [hotel.imageUrl, ...(hotel.imageUrls ?? [])].find(Boolean),
      ratingLabel: (() => {
        const stars = normalizeHotelClassificationStars(hotel.classificationStars);
        const review = normalizedReview(hotel.reviewScore, hotel.reviewScale);
        const count = normalizeHotelReviewCount(hotel.reviewCount);
        return [stars ? `${stars}-star` : "Unclassified", review === null ? "" : `${review.toFixed(1)}/10${count === undefined ? "" : ` (${count} reviews)`}`].filter(Boolean).join(" · ");
      })(),
      location: hotel.neighbourhood || hotel.location,
      roomLabel: titleCaseProviderText(hotel.roomType),
      stayLabel: `${formatDate(search.hotelCheckIn, locale)} – ${formatDate(search.hotelCheckOut, locale)} · ${nights ?? "—"} nights · ${search.hotelRooms} ${search.hotelRooms === 1 ? "room" : "rooms"} · ${search.hotelAdults + search.hotelChildren} guests`,
      cancellation: hotel.cancellationInfo,
      amenities: hotel.amenities.slice(0, 3),
      detailsPath: internalPath(actionHref(hotel.searchPolicy.action), "hotel"),
    } : null,
    car: car ? {
      modelLabel: `${car.modelName}${car.orSimilar ? " or similar" : ""} · ${car.categoryLabel}`,
      company: car.rentalCompanyName,
      routeLabel: `${car.pickupLocation} → ${car.returnLocation}`,
      capacityLabel: `${car.passengers} passengers · ${car.bags} bags`,
      rentalLabel: `${formatDate(search.carPickupDate, locale)} ${search.carPickupTime} – ${formatDate(search.carReturnDate, locale)} ${search.carReturnTime} · ${dayCount(search.carPickupDate, search.carReturnDate) ?? "—"} rental days`,
      policyLabels: [offer?.freeCancellation ? "Free cancellation" : "Cancellation restrictions", offer?.payAtPickup ? "Pay at pickup" : "Prepayment may apply"],
      detailsPath: internalPath(actionHref(car.searchPolicy.action), "car"),
    } : null,
    routeNotice,
  };
}
