import { z } from "zod";
import { isIP } from "node:net";
import { kayakImages, kayakFlightLegs, kayakFlightCabin, kayakFlightAttributes, kayakAttributes, kayakCarFilterOptions, kayakHotelAmenities, kayakHotelAmenityStatus, type KayakAttribute, type KayakImage, type KayakFlightLeg } from "./kayakPresentation";
import { KAYAK_SANDBOX_ORIGIN, sandboxBookingUrl } from "./kayakSandboxPublic";
import type { FlightFareTerm, FlightOptionalService, FlightProviderCondition } from "@/lib/types";
export { KAYAK_SANDBOX_ORIGIN, sandboxBookingUrl } from "./kayakSandboxPublic";

/** Sandbox transport. Never use this module for live inventory or booking. */
export const kayakVertical = z.enum(["flights", "hotels", "cars"]);
const date = z.iso.date();
const airport = z.string().regex(/^[A-Z]{3}$/);
export const kayakSearchSchema = z
  .discriminatedUnion("vertical", [
    z.object({
      vertical: z.literal("flights"),
      origin: airport,
      destination: airport,
      departure: date,
      returnDate: date.optional(),
      adults: z.number().int().min(1).max(6).default(1),
    }),
    z.object({
      vertical: z.literal("hotels"),
      destination: z.string().regex(/^kplace:\d+$/),
      departure: date,
      returnDate: date,
      adults: z.number().int().min(1).max(6).default(1),
    }),
    z.object({
      vertical: z.literal("cars"),
      origin: airport,
      departure: date,
      returnDate: date,
      pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
      dropoffTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    }),
  ])
  .superRefine((value, ctx) => {
    if (value.departure < new Date().toISOString().slice(0, 10))
      ctx.addIssue({ code: "custom", message: "Choose a future date." });
    if (value.returnDate && value.returnDate <= value.departure)
      ctx.addIssue({
        code: "custom",
        message: "The end date must follow the start date.",
      });
    if (value.vertical === "flights" && value.origin === value.destination)
      ctx.addIssue({ code: "custom", message: "Choose different airports." });
  });
export type KayakSearch = z.infer<typeof kayakSearchSchema>;
export type KayakVertical = z.infer<typeof kayakVertical>;
export type SandboxOffer = {
  id: string;
  title: string;
  description: string;
  details: string[];
  price: number;
  currency: string;
  priceBasis: string;
  testUrl: string;
  images?: KayakImage[];
  flightLegs?: KayakFlightLeg[];
  flightCabin?: string;
  flightFareFamily?: string;
  flightCarryOnIncluded?: boolean;
  /** Normalized offer-specific facts only; raw KAYAK fee objects never cross the service boundary. */
  flightFareTerms?: FlightFareTerm[];
  flightConditions?: FlightProviderCondition[];
  flightOptionalServices?: FlightOptionalService[];
  /** Provider-supplied booking seller for customer-facing deal presentation. */
  bookingProviderName?: string;
  attributes?: KayakAttribute[];
  carSpecs?: string[];
  carFilterOptions?: string[];
  hotelStars?: number;
  hotelReviewScore?: number;
  hotelReviewCount?: number;
  amenities?: string[];
  hotelLocation?: {
    address?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
  };
};
export type SandboxPlace = { label: string; value: string; kind?: string };
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ObjectValue)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

function fareFamilyName(value: unknown) {
  if (typeof value === "string") return value.trim() || undefined;
  const family = object(value);
  return text(family.displayName || family.name).trim() || undefined;
}

function money(value: unknown, fallbackCurrency: string) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0)
    return { amount:value, currency:fallbackCurrency };
  const source = object(value);
  const amount = typeof source.price === "number" ? source.price : typeof source.amount === "number" ? source.amount : undefined;
  const currency = text(source.currency || source.currencyCode) || fallbackCurrency;
  return amount !== undefined && Number.isFinite(amount) && amount >= 0 && /^[A-Z]{3}$/.test(currency) ? { amount, currency } : undefined;
}

function kayakFareTerms(fees: unknown, currency: string): FlightFareTerm[] {
  const terms: FlightFareTerm[] = [];
  for (const [key, label] of [["carryOnBag", "carry-on"], ["checkedBag", "checked bag"]] as const) {
    for (const raw of list(object(fees)[key])) {
      const bag = object(raw);
      const restriction = text(bag.restriction);
      if (!restriction) continue;
      const first = text(bag.bagNumber) === "first";
      const bagNumber = text(bag.bagNumber).replace(/([a-z])([A-Z])/g, "$1 $2").trim();
      const subject = first ? `1 ${label}` : `${bagNumber ? `${bagNumber} ` : ""}${label}`;
      const charge = money(bag.price || bag.fee || bag.amount, currency);
      if (restriction === "included") terms.push({ category:"baggage", semantic:"positive", text:`${subject} included` });
      else if (/^(notIncluded|excluded|notAllowed)$/i.test(restriction)) terms.push({
        category:"baggage", semantic:"negative",
        text: charge ? `${subject} not included · ${charge.currency} ${charge.amount.toFixed(2)}` : `${subject} not included`,
      });
      else terms.push({ category:"baggage", semantic:"informational", text:charge ? `${subject}: ${charge.currency} ${charge.amount.toFixed(2)}` : `${subject}: ${restriction.replace(/([a-z])([A-Z])/g, "$1 $2")}` });
    }
  }
  return terms;
}

function kayakConditions(value: unknown, currency: string): FlightProviderCondition[] {
  const source = object(value);
  return (["change", "refund"] as const).flatMap((category) => {
    const condition = object(source[category]);
    const restriction = text(condition.restriction || condition.state);
    const state = /^(allowed|included)$/i.test(restriction) ? "allowed" : /^(notAllowed|not-allowed|excluded)$/i.test(restriction) ? "not-allowed" : undefined;
    if (!state) return [];
    const penalty = money(condition.penalty || condition.fee, currency);
    return [{ category, scope:"trip" as const, state, ...(penalty ? {penaltyAmount:penalty.amount,penaltyCurrency:penalty.currency} : {}) }];
  });
}

function kayakOptionalServices(value: unknown, currency: string): FlightOptionalService[] {
  return list(value).flatMap((raw) => {
    const service = object(raw);
    const description = text(service.description || service.displayName).trim();
    const price = money(service.price, currency);
    if (!description || !price || service.optional !== true) return [];
    return [{type:text(service.type) || "service",description,price:price.amount,currency:price.currency}];
  });
}

function finiteCoordinate(value: unknown, min: number, max: number): number | undefined {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

function kayakHotelLocation(result: ObjectValue): SandboxOffer["hotelLocation"] | undefined {
  const candidates = [
    result,
    object(result.coordinates),
    object(result.location),
    object(result.geo),
    object(result.geoLocation),
  ];
  let latitude: number | undefined;
  let longitude: number | undefined;
  for (const candidate of candidates) {
    const nextLatitude = finiteCoordinate(candidate.latitude ?? candidate.lat, -90, 90);
    const nextLongitude = finiteCoordinate(candidate.longitude ?? candidate.lon ?? candidate.lng, -180, 180);
    if (nextLatitude !== undefined && nextLongitude !== undefined) {
      latitude = nextLatitude;
      longitude = nextLongitude;
      break;
    }
  }
  const address = text(result.address).trim() || undefined;
  const countryCode = text(result.hotelCountryCode).trim().toUpperCase() || undefined;
  if (!address && !countryCode && latitude === undefined && longitude === undefined) return undefined;
  return {
    ...(address ? { address } : {}),
    ...(countryCode ? { countryCode } : {}),
    ...(latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {}),
  };
}

function kayakSegmentCabins(data: ObjectValue, result: ObjectValue, option: ObjectValue) {
  const fares = list(option.segmentFares).map(object);
  return list(result.legs).map((reference) => {
    const leg = object(object(data.legs)[text(object(reference).id)]);
    return list(leg.segments).map((segmentReference) => {
      const segmentId = text(object(segmentReference).id);
      const matches = fares.filter((fare) => text(fare.segmentId) === segmentId);
      if (matches.length !== 1) return undefined;
      return text(object(matches[0].cabin).displayName).trim() || undefined;
    });
  });
}

export class KayakError extends Error {
  constructor(
    public readonly code:
      | "unavailable"
      | "unauthorized"
      | "rate_limited"
      | "timeout"
      | "invalid_response",
  ) {
    super(`KAYAK sandbox ${code.replaceAll("_", " ")}.`);
  }
}

export function isKayakSandboxEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.KAYAK_SANDBOX_ENABLED !== "true" ||
    !env.KAYAK_SANDBOX_API_KEY?.trim()
  )
    return false;
  try {
    const host = new URL(env.NEXT_PUBLIC_APP_URL || "").hostname;
    return (
      host === "staging.kurioticket.com" ||
      (env.NODE_ENV === "development" &&
        ["localhost", "127.0.0.1"].includes(host))
    );
  } catch {
    return false;
  }
}

export function normalizeSandboxOffers(
  vertical: KayakVertical,
  value: unknown,
): SandboxOffer[] {
  const data = object(value);
  if (!Array.isArray(data.results)) throw new KayakError("invalid_response");
  const currency = text(data.currency ?? data.currencyCode);
  if (!/^[A-Z]{3}$/.test(currency)) throw new KayakError("invalid_response");
  if (
    vertical !== "hotels" &&
    !(
      vertical === "cars" ? ["total", "perDayTotal"] : ["total", "perPerson"]
    ).includes(text(data.priceMode))
  )
    throw new KayakError("invalid_response");
  const offers: SandboxOffer[] = [];
  for (const [index, raw] of list(data.results).entries()) {
    const result = object(raw);
    const options = list(
      vertical === "hotels" ? result.rates : result.bookingOptions,
    );
    for (const [optionIndex, rawOption] of options.entries()) {
      const option = object(rawOption);
      if (vertical === "flights" && option.type !== "regular") continue;
      const url = sandboxBookingUrl(
        vertical === "hotels" ? option.bookUri : option.bookingUrl,
      );
      const amount =
        vertical === "hotels"
          ? option.totalRate
          : object(vertical === "flights" ? option.displayPrice : option.price)
              .price;
      if (
        !url ||
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0
      )
        continue;
      const car = object(option.car);
      const journey = list(result.legs).map((rawLeg) => {
        const leg = object(object(data.legs)[text(object(rawLeg).id)]);
        const segments = list(leg.segments).map((segment) =>
          object(object(data.segments)[text(object(segment).id)]),
        );
        return {
          route: segments.length
            ? `${text(segments[0].origin)} → ${text(segments[segments.length - 1].destination)}`
            : "",
          details: segments.map(
            (segment) =>
              `${text(segment.origin)} → ${text(segment.destination)} · ${text(segment.departureTime)} – ${text(segment.arrivalTime)} · ${text(segment.airline)} ${text(segment.flightNumber)}`,
          ),
        };
      });
      const title =
        vertical === "hotels"
          ? text(result.name)
          : vertical === "cars"
            ? text(car.brand) || text(object(car.type).displayName)
            : journey
                .map((leg) => leg.route)
                .filter(Boolean)
                .join(" / ") || "Flight itinerary";
      const provider = object(
        object(data.providers)[text(option.providerCode)],
      );
      const description =
        vertical === "hotels"
          ? text(option.roomName)
          : text(provider.displayName) || text(option.providerCode);
      const details =
        vertical === "flights"
          ? journey.flatMap((leg) => leg.details)
          : vertical === "hotels"
            ? [text(result.address)]
            : [
                text(object(car.type).displayName),
                text(
                  object(object(data.agencies)[text(option.agencyCode)])
                    .displayName,
                ),
              ].filter(Boolean);
      const flightCabin = vertical === "flights" ? kayakFlightCabin(data, result, option) : undefined;
      const flightFareFamily = vertical === "flights" ? fareFamilyName(option.fareFamily) : undefined;
      const flightFareTerms = vertical === "flights" ? kayakFareTerms(option.fees, currency) : [];
      const flightConditions = vertical === "flights" ? kayakConditions(option.conditions, currency) : [];
      const flightOptionalServices = vertical === "flights" ? kayakOptionalServices(option.optionalServices, currency) : [];
      const flightSegmentCabins = vertical === "flights" ? kayakSegmentCabins(data, result, option) : [];
      offers.push({
        id: `${text(result.id) || index}:${optionIndex}`,
        title: title || "KAYAK test result",
        description,
        details,
        images: kayakImages(vertical, result, car, title),
        attributes: vertical === "cars" ? [
          ...kayakAttributes(car,["type","brand","sipp","fuel","bags","passengers","doors","transmission","features"]),
          ...kayakAttributes(option,["policy","paymentType","rateType","badges"]),
          ...kayakAttributes(object(object(data.carLocations)[text(option.pickupLocationId)]),["address","cityName","countryCode","locationType","displayDistance","airport"]),
        ] : vertical === "hotels" ? [
          { label: "Amenity information", value: kayakHotelAmenityStatus(result.features, data.amenityDictionary) },
          ...kayakAttributes({...result, amenities: kayakHotelAmenities(result.features, data.amenityDictionary)},["address","hotelCountryCode","starRating","isSelfRated","amenities","policies","guestRating","guestRatingSentiment","reviewQuotes","place"]),
          ...kayakAttributes(option,["roomName","hasFreeCancellation","canPayLater","isBundledRate","rateBreakdown","conditions"]),
        ] : [...kayakAttributes(option,["fees","badges","segmentFares","fareFamily"]), ...kayakFlightAttributes(data,result)],
        ...(vertical === "cars" ? { carFilterOptions: kayakCarFilterOptions(car), carSpecs: [
          typeof car.passengers === "number" ? `${car.passengers} passengers` : "Passengers not supplied",
          typeof car.bags === "number" ? `${car.bags} bags` : "Baggage capacity not supplied",
          /^doors\d+$/.test(text(car.doors)) ? `${text(car.doors).slice(5)} doors` : text(car.doors) || "Doors not supplied",
          text(car.transmission) ? text(car.transmission).replace(/^./,letter=>letter.toUpperCase()) : "Transmission not supplied",
        ] } : {}),
        ...(vertical === "hotels" && typeof result.starRating === "number" ? {hotelStars:result.starRating} : {}),
        // KAYAK Hotels Search guestRating is a ten-point score; -1 means unrated.
        ...(vertical === "hotels" && typeof result.guestRating === "number" && Number.isFinite(result.guestRating) && result.guestRating >= 0 && result.guestRating <= 10
          ? { hotelReviewScore: result.guestRating } : {}),
        ...(vertical === "hotels" && typeof result.numberOfReviews === "number" && Number.isInteger(result.numberOfReviews) && result.numberOfReviews >= 0
          ? { hotelReviewCount: result.numberOfReviews } : {}),
        ...(vertical === "hotels" ? {
          amenities: kayakHotelAmenities(result.features, data.amenityDictionary),
          ...(kayakHotelLocation(result) ? { hotelLocation: kayakHotelLocation(result) } : {}),
        } : {}),
        ...(vertical === "flights" ? { flightLegs: kayakFlightLegs(data, result).map((leg, legIndex) => ({
          ...leg,
          segments:leg.segments.map((segment, segmentIndex) => {
            const segmentCabin = flightSegmentCabins[legIndex]?.[segmentIndex];
            return {
              ...segment,
              ...(segmentCabin || flightFareFamily ? {cabinDetails:{
                ...(segmentCabin ? {cabinClass:segmentCabin} : {}),
                ...(flightFareFamily ? {fareBrandName:flightFareFamily} : {}),
              }} : {}),
            };
          }),
        })) } : {}),
        ...(vertical === "flights" && description ? { bookingProviderName: description } : {}),
        ...(vertical === "flights" ? {flightCabin} : {}),
        ...(flightFareFamily ? {flightFareFamily} : {}),
        ...(vertical === "flights" && list(object(option.fees).carryOnBag).some(bag => object(bag).bagNumber === "first" && text(object(bag).restriction))
          ? {flightCarryOnIncluded: list(object(option.fees).carryOnBag).filter(bag => object(bag).bagNumber === "first").every(bag => object(bag).restriction === "included")} : {}),
        ...(flightFareTerms.length ? {flightFareTerms} : {}),
        ...(flightConditions.length ? {flightConditions} : {}),
        ...(flightOptionalServices.length ? {flightOptionalServices} : {}),
        price: amount,
        currency,
        priceBasis:
          vertical === "hotels"
            ? "total stay"
            : text(data.priceMode) === "perPerson"
              ? "per person"
              : text(data.priceMode) === "perDayTotal"
                ? "per day"
                : "total",
        testUrl: url,
      });
    }
  }
  return offers.sort((a, b) => a.price - b.price);
}

export class KayakSandboxClient {
  constructor(
    private readonly key: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly pause = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms)),
    private readonly userAgent = "kayakaffiliateapp",
    private readonly clientIp = "",
  ) {}

  private async request(
    path: string,
    userTrackId: string,
    query: Record<string, string>,
    body: unknown,
    signal: AbortSignal,
    empty = false,
  ): Promise<ObjectValue> {
    if (!this.key.trim()) throw new KayakError("unauthorized");
    const url = new URL(path, KAYAK_SANDBOX_ORIGIN);
    url.search = new URLSearchParams({
      ...query,
      apiKey: this.key,
      userTrackId,
    }).toString();
    try {
      const response = await this.fetcher(url, {
        method: body ? "POST" : "GET",
        cache: "no-store",
        redirect: "error",
        signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.userAgent,
          ...(isIP(this.clientIp)
            ? { "x-original-client-ip": this.clientIp }
            : {}),
          ...(empty ? { "sandbox-api-empty": "true" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok)
        throw new KayakError(
          response.status === 429
            ? "rate_limited"
            : [401, 403].includes(response.status)
              ? "unauthorized"
              : "unavailable",
        );
      const parsed: unknown = await response.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new KayakError("invalid_response");
      return parsed as ObjectValue;
    } catch (error) {
      if (error instanceof KayakError) throw error;
      // Fetch exceptions can contain the credential-bearing request URL. Never log/rethrow them.
      throw new KayakError(signal.aborted ? "timeout" : "unavailable");
    }
  }

  async places(
    vertical: KayakVertical,
    term: string,
    trackId: string,
    signal = AbortSignal.timeout(12000),
  ): Promise<SandboxPlace[]> {
    const data = await this.request(
      `/api/affiliate/autocomplete/v1/${vertical}`,
      trackId,
      { searchTerm: term },
      null,
      signal,
    );
    if (!Array.isArray(data.results)) throw new KayakError("invalid_response");
    return list(data.results).flatMap((raw) => {
      const row = object(raw);
      const value = text(vertical === "hotels" ? row.entityKey : row.iataCode);
      if (
        !(vertical === "hotels"
          ? /^kplace:\d+$/.test(value) && row.primaryPlaceType !== "hotel"
          : /^[A-Z]{3}$/.test(value))
      )
        return [];
      return [{ label: text(row.fullName) || text(row.name), value, kind: text(row.primaryPlaceType) || undefined }];
    });
  }

  async search(
    search: KayakSearch,
    trackId: string,
    externalSignal?: AbortSignal,
    empty = false,
  ): Promise<SandboxOffer[]> {
    const signal = AbortSignal.any([
      AbortSignal.timeout(30000),
      ...(externalSignal ? [externalSignal] : []),
    ]);
    let body: unknown;
    let path: string;
    let query: Record<string, string> = {};
    const resultParameters =
      search.vertical === "cars"
        ? { priceMode: "total", currency: "USD", pageSize: 10 }
        : undefined;
    if (search.vertical === "hotels") {
      path = "/api/3.0/hotels";
      query = {
        destination: search.destination,
        checkin: search.departure,
        checkout: search.returnDate,
        rooms: String(search.adults),
        currencyCode: "USD",
        responseOptions: "multipleHotelsAllRates,images,features,rateBreakdown,reviews,hotelPlace",
        onlyIfComplete: "false",
        pageSize: "10",
      };
    } else {
      path = `/i/api/affiliate/search/${search.vertical === "flights" ? "flight" : "car"}/v1/poll`;
      if (search.vertical === "flights") {
        const leg = (origin: string, destination: string, date: string) => ({
          origin: { locationType: "airports", airports: [origin] },
          destination: { locationType: "airports", airports: [destination] },
          date,
          flex: "exact",
        });
        body = {
          searchStartParameters: {
            cabin: "economy",
            passengers: Array(search.adults).fill("ADT"),
            legs: [
              leg(search.origin, search.destination, search.departure),
              ...(search.returnDate
                ? [leg(search.destination, search.origin, search.returnDate)]
                : []),
            ],
            filters: { includeSplit: false },
          },
        };
      } else
        body = {
          searchStartParameters: {
            pickup: {
              location: { type: "airport", value: search.origin },
              date: search.departure,
              hour: Number((search.pickupTime || "12:00").split(":")[0]),
              minute: Number((search.pickupTime || "12:00").split(":")[1]),
            },
            dropoff: { date: search.returnDate, hour: Number((search.dropoffTime || "12:00").split(":")[0]), minute: Number((search.dropoffTime || "12:00").split(":")[1]) },
          },
        };
    }
    for (let attempt = 0; attempt < 12; attempt++) {
      if (signal.aborted) throw new KayakError("timeout");
      const data = await this.request(
        path,
        trackId,
        query,
        body && resultParameters ? { ...object(body), resultParameters } : body,
        signal,
        empty,
      );
      if (
        search.vertical === "hotels"
          ? data.isComplete === true
          : data.status === "complete"
      ) {
        if (search.vertical === "hotels") {
          try {
            const constants = await this.request("/api/4.0/constants-mapping", trackId,
              {types:"facility",languageCode:"en"}, null, signal);
            data.amenityDictionary = object(constants.facility).features;
          } catch {
            // Metadata failure must not discard otherwise valid hotel rates.
            data.amenityDictionary = [];
          }
        }
        return normalizeSandboxOffers(search.vertical, data);
      }
      if (search.vertical !== "hotels") {
        if (
          !["first-phase", "second-phase"].includes(text(data.status)) ||
          !text(data.searchId) ||
          !text(data.cluster)
        )
          throw new KayakError("invalid_response");
        body = { searchId: data.searchId };
        query = { cluster: text(data.cluster) };
      }
      await this.pause(750);
    }
    throw new KayakError("timeout");
  }
}