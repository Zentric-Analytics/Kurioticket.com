import { z } from "zod";
import { normalizeKayakFlightInformation, sanitizeKayakFlightText } from "./kayakFlightInformation";
import { isIP } from "node:net";
import { kayakImageUrl, kayakImages, kayakFlightLegs, kayakFlightAttributes, kayakAttributes, kayakCarFilterOptions, kayakHotelAmenities, kayakHotelAmenityStatus, type KayakAttribute, type KayakImage, type KayakFlightLeg } from "./kayakPresentation";
import { KAYAK_SANDBOX_ORIGIN, sandboxBookingUrl } from "./kayakSandboxPublic";
import type { FlightFareTerm, FlightOptionalService, FlightProviderCondition, FlightAirlineBaggagePolicy, FlightProviderDetails } from "@/lib/types";
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
    const utcNow = new Date();
    const utcToday = utcNow.toISOString().slice(0, 10);
    const utcYesterday = new Date(
      utcNow.getTime() - 86_400_000,
    ).toISOString().slice(0, 10);
    if (
      value.departure < (value.vertical === "cars" ? utcYesterday : utcToday)
    )
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
  hotelPropertyKey?: string;
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
  flightAirlineBaggagePolicies?: FlightAirlineBaggagePolicy[];
  flightPrice?: FlightProviderDetails["price"];
  /** Sanitized unmapped diagnostics; never customer Flight Details data. */
  flightUnmappedFacts?: KayakAttribute[];
  /** Provider-supplied booking seller for customer-facing deal presentation. */
  bookingProviderName?: string;
  bookingProviderLogoUrl?: string;
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

export class KayakError extends Error {
  constructor(
    public readonly code:
      | "unavailable"
      | "unauthorized"
      | "rate_limited"
      | "timeout"
      | "invalid_response"
      | "server_error"
      | "request_rejected",
  ) {
    super(`KAYAK sandbox ${code.replaceAll("_", " ")}.`);
  }
}

/** Retain validated completed pages without claiming the search completed. */
export class KayakPartialSearchError extends KayakError {
  constructor(code: KayakError["code"], public readonly offers: SandboxOffer[]) {
    super(code);
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
  resultOffset = 0,
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
      const hotelLocation = vertical === "hotels" ? kayakHotelLocation(result) : undefined;
      const flightInformation = vertical === "flights" ? normalizeKayakFlightInformation(data, result, option, currency) : undefined;
      const flightCabin = flightInformation?.cabin;
      const flightFareFamily = flightInformation?.fareFamily;
      const flightFareTerms = flightInformation?.fareTerms ?? [];
      const flightConditions = flightInformation?.conditions ?? [];
      const flightOptionalServices = flightInformation?.optionalServices ?? [];
      offers.push({
        id: `${text(result.id) || (index + resultOffset)}:${optionIndex}`,
        ...(vertical === "hotels" ? { hotelPropertyKey: String(index + resultOffset) } : {}),
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
        ] : [...kayakAttributes(option,["fees","badges","segmentFares","fareFamily"]), ...kayakFlightAttributes(data,result)].filter(fact => sanitizeKayakFlightText(fact.value)),
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
          ...(hotelLocation ? { hotelLocation } : {}),
        } : {}),
        ...(vertical === "flights" ? { flightLegs: kayakFlightLegs(data, result).map((leg, legIndex) => {
          const rawLeg = object(object(data.legs)[text(object(list(result.legs)[legIndex]).id)]);
          return { ...leg, segments: leg.segments.map((segment, segmentIndex) => {
            const segmentId = text(object(list(rawLeg.segments)[segmentIndex]).id);
            return { ...segment, ...flightInformation?.segments[segmentId] };
          }) };
        }) } : {}),
        ...((vertical === "flights" || vertical === "hotels" || vertical === "cars") && (text(provider.displayName) || text(option.providerCode))
          ? { bookingProviderName: text(provider.displayName) || text(option.providerCode) }
          : {}),
        ...((vertical === "flights" || vertical === "hotels" || vertical === "cars") && kayakImageUrl(provider.logoUrl)
          ? { bookingProviderLogoUrl: kayakImageUrl(provider.logoUrl) }
          : {}),
        ...(vertical === "flights" ? {flightCabin} : {}),
        ...(flightFareFamily ? {flightFareFamily} : {}),
        ...(vertical === "flights" && list(object(option.fees).carryOnBag).some(bag => object(bag).bagNumber === "first" && text(object(bag).restriction))
          ? {flightCarryOnIncluded: list(object(option.fees).carryOnBag).filter(bag => object(bag).bagNumber === "first").every(bag => object(bag).restriction === "included")} : {}),
        ...(flightFareTerms.length ? {flightFareTerms} : {}),
        ...(flightConditions.length ? {flightConditions} : {}),
        ...(flightOptionalServices.length ? {flightOptionalServices} : {}),
        ...(flightInformation?.airlineBaggagePolicies.length ? {flightAirlineBaggagePolicies:flightInformation.airlineBaggagePolicies} : {}),
        ...(flightInformation?.price ? {flightPrice:flightInformation.price} : {}),
        ...(flightInformation?.unmappedFacts.length ? {flightUnmappedFacts:flightInformation.unmappedFacts} : {}),
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

// KAYAK Hotels Search API permits 1–250 results per page (default 25).
// Use its documented maximum to reduce sequential round trips without
// increasing concurrency or dropping any property/rate from the search.
const HOTEL_PAGE_SIZE = 250;
// Match SearchResultsParameters.pageSize's documented request default.
// https://developers.kayak.com/cars-search-api (verified 2026-10-11).
// Keep sequential paging and use the response's actual size for later pages.
const CAR_PAGE_SIZE = 50;

type SearchStage = "initial" | "poll" | "pages" | "metadata";
export type KayakSearchTiming = {
  vertical: KayakVertical;
  status: "success" | "partial" | "failed";
  resultCount: number;
  elapsedMs: number;
  waitMs: number;
  stages: Record<SearchStage, { operations: number; elapsedMs: number }>;
};

export class KayakSandboxClient {
  constructor(
    private readonly key: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly pause = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms)),
    private readonly userAgent = "kayakaffiliateapp",
    private readonly clientIp = "",
    private readonly reportTiming: (timing: KayakSearchTiming) => void = timing =>
      console.info("[kayak-search:stage-timing]", JSON.stringify(timing)),
  ) {}

  private async request(
    path: string,
    userTrackId: string,
    query: Record<string, string>,
    body: unknown,
    signal: AbortSignal,
    empty = false,
    retryTransient = false,
    pause = this.pause,
  ): Promise<ObjectValue> {
    if (!this.key.trim()) throw new KayakError("unauthorized");
    const url = new URL(path, KAYAK_SANDBOX_ORIGIN);
    url.search = new URLSearchParams({
      ...query,
      apiKey: this.key,
      userTrackId,
    }).toString();
    // The sandbox car poll has a documented history of occasionally dropping a
    // connection before returning a response. Retry that narrow, transient
    // transport/edge failure once, with the same track id. Do not retry auth,
    // quota, validation, cancellation, or malformed provider responses.
    for (let attempt = 0; attempt < 2; attempt++) {
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
        if (!response.ok) {
          const code = response.status === 429
            ? "rate_limited"
            : [401, 403].includes(response.status)
              ? "unauthorized"
              : response.status >= 500
                ? "server_error"
                : "request_rejected";
          if (retryTransient && code === "server_error" && attempt === 0 && !signal.aborted) {
            await pause(300);
            continue;
          }
          throw new KayakError(code);
        }
        let parsed: unknown;
        try {
          parsed = await response.json();
        } catch (error) {
          if (error instanceof SyntaxError) throw new KayakError("invalid_response");
          throw error;
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
          throw new KayakError("invalid_response");
        return parsed as ObjectValue;
      } catch (error) {
        if (error instanceof KayakError) throw error;
        // Fetch exceptions can contain the credential-bearing request URL. Never log/rethrow them.
        if (signal.aborted) throw new KayakError("timeout");
        if (retryTransient && attempt === 0) {
          await pause(300);
          continue;
        }
        throw new KayakError("unavailable");
      }
    }
    throw new KayakError("unavailable");
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
    const started = performance.now();
    const timing: KayakSearchTiming = {
      vertical: search.vertical, status: "failed", resultCount: 0, elapsedMs: 0, waitMs: 0,
      stages: { initial: { operations: 0, elapsedMs: 0 }, poll: { operations: 0, elapsedMs: 0 },
        pages: { operations: 0, elapsedMs: 0 }, metadata: { operations: 0, elapsedMs: 0 } },
    };
    const request = async (...args: Parameters<KayakSandboxClient["request"]>) => {
      const [path, , query, body] = args;
      const stage: SearchStage = path.includes("constants-mapping") ? "metadata"
        : Number(query.pageIndex) > 0 || object(object(body).resultParameters).pageNumber !== undefined ? "pages"
        : object(body).searchId || timing.stages.initial.operations > 0 ? "poll" : "initial";
      const entry = timing.stages[stage];
      entry.operations++;
      const start = performance.now();
      const previousWait = timing.waitMs;
      try { return await this.request(args[0], args[1], args[2], args[3], args[4], args[5], args[6], pause); }
      finally { entry.elapsedMs += Math.max(0, performance.now() - start - (timing.waitMs - previousWait)); }
    };
    const pause = async (ms: number) => {
      const start = performance.now();
      try { await this.pause(ms); }
      finally { timing.waitMs += performance.now() - start; }
    };
    try {
      const offers = await this.performSearch(search, trackId, externalSignal, empty, request, pause);
      timing.status = "success";
      timing.resultCount = offers.length;
      return offers;
    } catch (error) {
      if (error instanceof KayakPartialSearchError) {
        timing.status = "partial";
        timing.resultCount = error.offers.length;
      }
      throw error;
    } finally {
      timing.elapsedMs = Math.round(performance.now() - started);
      timing.waitMs = Math.round(timing.waitMs);
      for (const entry of Object.values(timing.stages)) entry.elapsedMs = Math.round(entry.elapsedMs);
      // Numeric, bounded diagnostics only: never log query, track ID, IP, URL or credentials.
      // Observability failures must not turn a successful search into a failed one.
      try { this.reportTiming(timing); } catch { /* diagnostic sink unavailable */ }
    }
  }

  private async performSearch(
    search: KayakSearch,
    trackId: string,
    externalSignal: AbortSignal | undefined,
    empty: boolean,
    request: KayakSandboxClient["request"],
    pause: (ms: number) => Promise<void>,
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
        ? { priceMode: "total", currency: "USD", pageSize: CAR_PAGE_SIZE }
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
        pageSize: String(HOTEL_PAGE_SIZE),
        pageIndex: "0",
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
    if (search.vertical === "hotels") {
      const offers: SandboxOffer[] = [];
      const seenPages = new Set<string>();
      let offset = 0;
      let expectedTotal: number | undefined;
      let dictionary: unknown = [];
      try {
      for (let pageIndex = 0; ; pageIndex++) {
        let page: ObjectValue | undefined;
        for (let attempt = 0; attempt < 12; attempt++) {
          if (signal.aborted) throw new KayakError("timeout");
          const response = await request(path, trackId,
            { ...query, pageIndex: String(pageIndex) }, undefined, signal, empty);
          if (response.isComplete === true) { page = response; break; }
          if (attempt < 11) await pause(750);
        }
        if (!page) throw new KayakError("timeout");
        if (!Array.isArray(page.results)) throw new KayakError("invalid_response");
        const count = page.results.length;
        const total = page.totalFilteredResults;
        if (total !== undefined) {
          if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0 ||
              (expectedTotal !== undefined && total !== expectedTotal)) {
            throw new KayakError("invalid_response");
          }
          expectedTotal = total;
        }
        const fingerprint = JSON.stringify(page.results);
        if (count > 0 && seenPages.has(fingerprint)) throw new KayakError("invalid_response");
        seenPages.add(fingerprint);
        if (pageIndex === 0 && count > 0) {
          try {
            const constants = await request("/api/4.0/constants-mapping", trackId,
              { types: "facility", languageCode: "en" }, null, signal);
            dictionary = object(constants.facility).features;
          } catch { /* Missing metadata must not discard otherwise valid rates. */ }
        }
        offers.push(...normalizeSandboxOffers("hotels", { ...page, amenityDictionary: dictionary }, offset));
        offset += count;
        if (expectedTotal !== undefined) {
          if (offset > expectedTotal || (count === 0 && offset < expectedTotal)) throw new KayakError("invalid_response");
          if (offset === expectedTotal) return offers.sort((a, b) => a.price - b.price);
          if (count !== HOTEL_PAGE_SIZE) throw new KayakError("invalid_response");
        } else {
          // Legacy short responses are terminal; a full page needs a provider total.
          if (count < HOTEL_PAGE_SIZE) return offers.sort((a, b) => a.price - b.price);
          throw new KayakError("invalid_response");
        }
      }
      } catch (error) {
        if (offers.length && error instanceof KayakError && error.code !== "invalid_response") {
          throw new KayakPartialSearchError(error.code, offers);
        }
        throw error;
      }
    }
    const offers: SandboxOffer[] = [];
    try {
    for (let attempt = 0; attempt < 12; attempt++) {
      if (signal.aborted) throw new KayakError("timeout");
      const data = await request(
        path,
        trackId,
        query,
        body && resultParameters ? { ...object(body), resultParameters } : body,
        signal,
        empty,
        search.vertical === "cars",
      );
      if (data.status === "complete") {
        offers.push(...normalizeSandboxOffers(search.vertical, data));
        const total = data.totalCount;
        if (total === undefined) return offers;
        if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) throw new KayakError("invalid_response");
        let offset = list(data.results).length;
        const size = data.pageSize;
        const seenPages = new Set([JSON.stringify(data.results)]);
        for (let pageNumber = search.vertical === "cars" ? 1 : 2; offset < total; pageNumber++) {
          if (!Number.isSafeInteger(size) || typeof size !== "number" || size <= 0 || !text(data.searchId) || !text(data.cluster)) throw new KayakError("invalid_response");
          let page: ObjectValue | undefined;
          for (let poll = 0; poll < 12; poll++) {
            if (signal.aborted) throw new KayakError("timeout");
            const response = await request(path, trackId, { cluster: text(data.cluster) }, {
              searchId: data.searchId,
              resultParameters: { ...resultParameters, pageSize: size, pageNumber },
            }, signal, empty, search.vertical === "cars");
            if (response.status === "complete") { page = response; break; }
            if (!["first-phase", "second-phase"].includes(text(response.status))) {
              throw new KayakError("invalid_response");
            }
            if (poll < 11) await pause(750);
          }
          if (!page) throw new KayakError("timeout");
          if (!Array.isArray(page.results) || page.results.length === 0 || page.totalCount !== total || seenPages.has(JSON.stringify(page.results))) throw new KayakError("invalid_response");
          seenPages.add(JSON.stringify(page.results));
          offers.push(...normalizeSandboxOffers(search.vertical, page, offset));
          offset += page.results.length;
        }
        if (offset !== total) throw new KayakError("invalid_response");
        return offers.sort((a, b) => a.price - b.price);
      }
      {
        if (
          !["first-phase", "second-phase"].includes(text(data.status)) ||
          !text(data.searchId) ||
          !text(data.cluster)
        )
          throw new KayakError("invalid_response");
        body = { searchId: data.searchId };
        query = { cluster: text(data.cluster) };
      }
      if (attempt < 11) await pause(750);
    }
    throw new KayakError("timeout");
    } catch (error) {
      // A later transport failure must not erase completed, validated pages.
      // Inconsistent/malformed inventory still fails closed.
      if (offers.length && error instanceof KayakError && error.code !== "invalid_response") {
        throw new KayakPartialSearchError(error.code, offers);
      }
      throw error;
    }
  }
}
