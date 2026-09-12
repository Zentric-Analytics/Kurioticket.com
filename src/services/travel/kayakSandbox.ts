import { z } from "zod";
import { isIP } from "node:net";

/** Sandbox transport. Never use this module for live inventory or booking. */
export const KAYAK_SANDBOX_ORIGIN = "https://sandbox-en-us.kayakaffiliates.com";
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
};
export type SandboxPlace = { label: string; value: string };
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ObjectValue)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

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

/** Drop supplier URLs containing credentials; never follow arbitrary supplier hosts. */
export function sandboxBookingUrl(value: unknown): string | null {
  try {
    const url = new URL(text(value));
    if (url.href === "https://affiliates.kayak.com/sandbox-clickout")
      return url.href;
    if (
      url.origin !== KAYAK_SANDBOX_ORIGIN ||
      url.pathname !== "/in" ||
      url.username ||
      url.password
    )
      return null;
    const decoded = decodeURIComponent(url.search);
    if (/api[-_]?key|authorization|access[-_]?token/i.test(decoded))
      return null;
    return url.href;
  } catch {
    return null;
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
      offers.push({
        id: `${text(result.id) || index}:${optionIndex}`,
        title: title || "KAYAK test result",
        description,
        details,
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
      return [{ label: text(row.fullName) || text(row.name), value }];
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
        responseOptions: "toprates",
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
      )
        return normalizeSandboxOffers(search.vertical, data);
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
