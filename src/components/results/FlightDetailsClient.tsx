"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  type LucideIcon,
  Armchair,
  ArrowRight,
  Info,
  Luggage,
  Plane,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { FlightLeg, PublicFlightResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { formatTime } from "@/lib/utils";

export function FlightDetailsClient({ id }: { id: string }) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const [flight, setFlight] = useState<PublicFlightResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/flights/details?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Flight quote unavailable.");
        return data.flight as PublicFlightResult;
      })
      .then(setFlight)
      .catch((detailsError) =>
        setError(
          detailsError instanceof Error
            ? detailsError.message
            : "Flight quote unavailable.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  async function continueToProvider() {
    const response = await fetch("/api/redirect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        type: "flight",
        sourcePage: "flight_details",
      }),
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
    if (data.error) setError(data.error);
  }

  const itineraryLegs = useMemo(() => {
    if (!flight) return [];
    if (flight.legs?.length) return flight.legs;
    return [
      {
        direction: "leg",
        originAirport: flight.originAirport,
        destinationAirport: flight.destinationAirport,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        duration: flight.duration,
        durationMinutes: flight.durationMinutes,
        stops: flight.stops,
        layovers: flight.layovers,
        segments: [],
      } satisfies FlightLeg,
    ];
  }, [flight]);

  if (loading) {
    return (
      <main className="page-shell flex-1 py-10">
        <Card className="p-6 text-muted">Loading flight details...</Card>
      </main>
    );
  }

  if (error || !flight) {
    return (
      <main className="page-shell flex-1 py-10">
        <Card className="p-6">
          <h1 className="text-xl font-bold text-navy">
            Flight quote unavailable
          </h1>
          <p className="mt-2 text-muted">
            {error || "Please search again for current prices."}
          </p>
        </Card>
      </main>
    );
  }

  const displayPrice = formatDisplayPrice({
    amount: flight.price,
    sourceCurrency: flight.currency,
    displayCurrency: selectedOption.currency,
    convertUsdEstimate: true,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });

  const heroDetails = buildHeroDetails(flight);
  const routeHeading = buildRouteHeading(flight);
  const hasProviderLink = Boolean(
    flight.partnerRedirectUrl || flight.bookingUrl,
  );
  const providerDisclaimer =
    "Final price, availability, booking, and fare rules are confirmed by the provider.";

  return (
    <main className="flex-1 bg-surface-muted/40">
      <section className="border-b border-border bg-white">
        <div className="page-shell py-3 sm:py-4">
          <div className="mx-auto grid w-full max-w-5xl gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {routeHeading}
            </h1>
            <Card className="overflow-hidden border-indigo-100 p-0 shadow-[0_24px_60px_-34px_rgba(49,46,129,0.8)]">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 bg-gradient-to-br from-white via-white to-indigo-50/60 p-3 sm:p-3.5 lg:p-4">
                  <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <AirlineNameWithLogo
                          airlineName={flight.airlineName}
                          airlineLogoUrl={getAirlineLogo(flight)}
                          className="text-sm font-medium text-slate-700"
                          logoClassName="h-6 w-6"
                        />
                        {flight.flightNumber ? (
                          <>
                            <span
                              className="h-1 w-1 rounded-full bg-slate-300"
                              aria-hidden="true"
                            />
                            <span className="text-sm font-medium text-slate-700">
                              Flight {flight.flightNumber}
                            </span>
                          </>
                        ) : null}
                      </div>
                      <h1 className="flex min-w-0 flex-wrap items-center gap-2 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                        <span>{flight.originAirport}</span>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-white text-blue shadow-sm sm:h-8 sm:w-8">
                          <ArrowRight size={16} aria-hidden="true" />
                        </span>
                        <span>{flight.destinationAirport}</span>
                      </h1>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium leading-5 text-slate-600">
                      {heroDetails.map((detail) => {
                        const Icon = detail.icon;

                        return (
                          <span
                            key={detail.label}
                            className="inline-flex min-w-0 items-center gap-1.5"
                          >
                            <Icon
                              className="h-3.5 w-3.5 shrink-0 text-indigo-600"
                              aria-hidden="true"
                            />
                            <span className="min-w-0">
                              <span className="font-semibold text-slate-800">
                                {detail.label}:
                              </span>{" "}
                              <span className="font-medium text-slate-600">
                                {detail.value}
                              </span>
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <aside className="border-t border-indigo-100 bg-white p-2.5 sm:p-3 lg:border-l lg:border-t-0 lg:p-3.5">
                  <div className="flex h-full flex-col justify-center gap-2.5">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        From
                      </p>
                      <div
                        className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
                        aria-label={displayPrice.ariaLabel}
                        title={displayPrice.title}
                      >
                        {displayPrice.formatted}
                      </div>
                      {displayPrice.isConvertedEstimate ? (
                        <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                          Estimate shown. Provider price:{" "}
                          {displayPrice.providerFormatted}.
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="accent"
                      size="lg"
                      className="w-full rounded-xl px-6 text-sm font-semibold sm:text-base"
                      onClick={continueToProvider}
                      disabled={!hasProviderLink}
                    >
                      Continue to Provider <ArrowRight size={18} />
                    </Button>
                    <p className="flex items-start gap-1.5 text-xs leading-4 text-slate-500">
                      <Info size={15} className="mt-0.5 shrink-0 text-blue" />
                      <span>{providerDisclaimer}</span>
                    </p>
                  </div>
                </aside>
              </div>

              <div className="w-full lg:max-w-[760px] xl:max-w-[800px]">
                <SelectedFlightSummary
                  itineraryLegs={itineraryLegs}
                  fallbackAirlineName={flight.airlineName}
                  fallbackAirlineLogo={getAirlineLogo(flight)}
                  fallbackFlightNumber={flight.flightNumber}
                />
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function SelectedFlightSummary({
  itineraryLegs,
  fallbackAirlineName,
  fallbackAirlineLogo,
  fallbackFlightNumber,
}: {
  itineraryLegs: FlightLeg[];
  fallbackAirlineName: string;
  fallbackAirlineLogo?: string;
  fallbackFlightNumber?: string;
}) {
  return (
    <section
      className="border-t border-indigo-100 bg-white/95"
      aria-label="Selected flight itinerary"
    >
      <div className="bg-gradient-to-r from-indigo-700 to-violet-600 px-4 py-2">
        <p className="text-sm font-semibold tracking-wide text-white">
          Selected flight
        </p>
      </div>

      <div className="p-3 sm:p-3.5 lg:p-4">
        <div className="grid gap-1.5">
          {itineraryLegs.map((leg, legIndex) => (
            <div
              key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}-${legIndex}`}
              className={
                legIndex > 0
                  ? "mt-2 border-t border-violet-500/80 pt-2"
                  : ""
              }
            >
              <CompactLegSection
                leg={leg}
                legIndex={legIndex}
                legCount={itineraryLegs.length}
                fallbackAirlineName={fallbackAirlineName}
                fallbackAirlineLogo={fallbackAirlineLogo}
                fallbackFlightNumber={fallbackFlightNumber}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function buildRouteHeading(flight: PublicFlightResult) {
  const originDisplayName = getRouteEndpointDisplayName(flight, "origin");
  const destinationDisplayName = getRouteEndpointDisplayName(
    flight,
    "destination",
  );

  return `${originDisplayName} to ${destinationDisplayName}`;
}

function getRouteEndpointDisplayName(
  flight: PublicFlightResult,
  endpoint: "origin" | "destination",
) {
  const candidateGroups = getRouteEndpointCandidateGroups(endpoint);

  for (const group of candidateGroups) {
    const value = getFirstReadableRouteValue(flight, group);
    if (value) return value;
  }

  const airportCode = getRouteEndpointAirportCode(flight, endpoint);
  const resolvedCityName = resolveAirportCodeToCityName(airportCode);

  return resolvedCityName ?? airportCode;
}

type RouteEndpointCandidate = {
  directKeys?: string[];
  objectKeys?: string[];
  nestedKeys?: string[];
  cleanAirportName?: boolean;
};

function getRouteEndpointCandidateGroups(
  endpoint: "origin" | "destination",
): RouteEndpointCandidate[][] {
  if (endpoint === "origin") {
    return [
      [
        {
          directKeys: [
            "originCity",
            "originCityName",
            "fromCity",
            "fromCityName",
            "departureCity",
            "departureCityName",
          ],
          objectKeys: ["origin", "from", "departure"],
          nestedKeys: ["city", "cityName", "municipality", "municipalityName"],
        },
      ],
      [
        {
          directKeys: [
            "originDisplayName",
            "originName",
            "fromDisplayName",
            "fromName",
            "departureDisplayName",
            "departureName",
          ],
          objectKeys: ["origin", "from", "departure", "originAirport"],
          nestedKeys: ["displayName", "name", "label"],
        },
      ],
      [
        {
          directKeys: [
            "originAirportName",
            "originAirportDisplayName",
            "fromAirportName",
            "fromAirportDisplayName",
            "departureAirportName",
            "departureAirportDisplayName",
          ],
          objectKeys: ["origin", "from", "departure", "originAirport"],
          nestedKeys: ["airportName", "airportDisplayName", "fullName"],
          cleanAirportName: true,
        },
      ],
      [
        {
          directKeys: [
            "originFullName",
            "originLocationName",
            "fromFullName",
            "fromLocationName",
            "departureFullName",
            "departureLocationName",
          ],
          objectKeys: ["origin", "from", "departure", "originAirport"],
          nestedKeys: ["fullName", "locationName", "title"],
          cleanAirportName: true,
        },
      ],
    ];
  }

  return [
    [
      {
        directKeys: [
          "destinationCity",
          "destinationCityName",
          "toCity",
          "toCityName",
          "arrivalCity",
          "arrivalCityName",
        ],
        objectKeys: ["destination", "to", "arrival"],
        nestedKeys: ["city", "cityName", "municipality", "municipalityName"],
      },
    ],
    [
      {
        directKeys: [
          "destinationDisplayName",
          "destinationName",
          "toDisplayName",
          "toName",
          "arrivalDisplayName",
          "arrivalName",
        ],
        objectKeys: ["destination", "to", "arrival", "destinationAirport"],
        nestedKeys: ["displayName", "name", "label"],
      },
    ],
    [
      {
        directKeys: [
          "destinationAirportName",
          "destinationAirportDisplayName",
          "toAirportName",
          "toAirportDisplayName",
          "arrivalAirportName",
          "arrivalAirportDisplayName",
        ],
        objectKeys: ["destination", "to", "arrival", "destinationAirport"],
        nestedKeys: ["airportName", "airportDisplayName", "fullName"],
        cleanAirportName: true,
      },
    ],
    [
      {
        directKeys: [
          "destinationFullName",
          "destinationLocationName",
          "toFullName",
          "toLocationName",
          "arrivalFullName",
          "arrivalLocationName",
        ],
        objectKeys: ["destination", "to", "arrival", "destinationAirport"],
        nestedKeys: ["fullName", "locationName", "title"],
        cleanAirportName: true,
      },
    ],
  ];
}

const AIRPORT_CODE_CITY_NAMES: Record<string, string> = {
  AMS: "Amsterdam",
  ATL: "Atlanta",
  BCN: "Barcelona",
  BOS: "Boston",
  BWI: "Baltimore",
  CDG: "Paris",
  DCA: "Washington",
  DEN: "Denver",
  DFW: "Dallas",
  DOH: "Doha",
  DXB: "Dubai",
  EWR: "New York",
  FCO: "Rome",
  FRA: "Frankfurt",
  HND: "Tokyo",
  IAD: "Washington",
  IAH: "Houston",
  IST: "Istanbul",
  JFK: "New York",
  LAS: "Las Vegas",
  LAX: "Los Angeles",
  LGA: "New York",
  LGW: "London",
  LHR: "London",
  LOS: "Lagos",
  MAD: "Madrid",
  MCO: "Orlando",
  MIA: "Miami",
  MXP: "Milan",
  NRT: "Tokyo",
  ORD: "Chicago",
  ORY: "Paris",
  PHX: "Phoenix",
  SAN: "San Diego",
  SEA: "Seattle",
  SFO: "San Francisco",
  SJC: "San Jose",
  YYZ: "Toronto",
  YVR: "Vancouver",
};

function getRouteEndpointAirportCode(
  flight: PublicFlightResult,
  endpoint: "origin" | "destination",
) {
  return endpoint === "origin"
    ? flight.originAirport.trim()
    : flight.destinationAirport.trim();
}

function resolveAirportCodeToCityName(value: string) {
  if (!isAirportCodeOnly(value)) return undefined;

  return AIRPORT_CODE_CITY_NAMES[value.trim().toUpperCase()];
}

function getFirstReadableRouteValue(
  flight: PublicFlightResult,
  candidates: RouteEndpointCandidate[],
) {
  for (const candidate of candidates) {
    for (const rawValue of getRouteCandidateValues(flight, candidate)) {
      const value = candidate.cleanAirportName
        ? cleanAirportDisplayName(rawValue)
        : rawValue;

      if (value && !isAirportCodeOnly(value)) return value;
    }
  }

  return undefined;
}

function getRouteCandidateValues(
  flight: PublicFlightResult,
  candidate: RouteEndpointCandidate,
) {
  const values: string[] = [];
  const fields = flight as Record<string, unknown>;

  for (const key of candidate.directKeys ?? []) {
    const value = fields[key];

    if (typeof value === "string" && value.trim()) {
      values.push(value.trim());
    }
  }

  for (const objectKey of candidate.objectKeys ?? []) {
    const nestedSource = fields[objectKey];
    if (!nestedSource || typeof nestedSource !== "object") continue;

    const nestedFields = nestedSource as Record<string, unknown>;

    for (const nestedKey of candidate.nestedKeys ?? []) {
      const value = nestedFields[nestedKey];

      if (typeof value === "string" && value.trim()) {
        values.push(value.trim());
      }
    }
  }

  return values;
}

function cleanAirportDisplayName(value?: string) {
  if (!value) return undefined;

  let cleaned = value
    .replace(/\s*\([A-Z]{3}\)\s*$/i, "")
    .replace(/^([A-Z]{3})\s*[-–—:]\s*/i, "")
    .replace(/\s+airport\s*$/i, "")
    .replace(/\s+international\s*$/i, "")
    .replace(/\s+intl\.?\s*$/i, "")
    .trim();

  if (!cleaned || isAirportCodeOnly(cleaned)) {
    cleaned = value.trim();
  }

  return cleaned;
}

function isAirportCodeOnly(value: string) {
  return /^[A-Z]{3}$/i.test(value.trim());
}

function AirlineNameWithLogo({
  airlineName,
  airlineLogoUrl,
  className = "",
  logoClassName = "h-5 w-5",
}: {
  airlineName: string;
  airlineLogoUrl?: string | null;
  className?: string;
  logoClassName?: string;
}) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 ${className}`.trim()}
    >
      {airlineLogoUrl ? (
        <Image
          src={airlineLogoUrl}
          alt={`${airlineName} logo`}
          width={24}
          height={24}
          className={`${logoClassName} shrink-0 rounded-full object-contain`.trim()}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span className="min-w-0 truncate">{airlineName}</span>
    </span>
  );
}

function getAirlineLogo(source: unknown) {
  if (!source || typeof source !== "object") return undefined;

  const fields = source as Record<string, unknown>;
  const logoKeys = [
    "airlineLogo",
    "airlineLogoUrl",
    "airlineImage",
    "carrierLogo",
    "carrierLogoUrl",
    "logoUrl",
    "marketingCarrierLogo",
    "operatingCarrierLogo",
  ];

  for (const key of logoKeys) {
    const value = fields[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return getNestedLogo(fields, [
    "airline",
    "carrier",
    "marketingCarrier",
    "operatingCarrier",
  ]);
}

function getNestedLogo(fields: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = fields[key];

    if (!value || typeof value !== "object") continue;

    const nested = value as Record<string, unknown>;
    const logo = nested.logo ?? nested.logoUrl ?? nested.imageUrl;

    if (typeof logo === "string" && logo.trim()) {
      return logo.trim();
    }
  }

  return undefined;
}

const normalizeAirlineName = (value?: string | null) =>
  value?.trim().toLowerCase() ?? "";

function CompactLegSection({
  leg,
  legIndex,
  legCount,
  fallbackAirlineName,
  fallbackAirlineLogo,
  fallbackFlightNumber,
}: {
  leg: FlightLeg;
  legIndex: number;
  legCount: number;
  fallbackAirlineName: string;
  fallbackAirlineLogo?: string;
  fallbackFlightNumber?: string;
}) {
  const segments = leg.segments.length
    ? leg.segments
    : [
        {
          originAirport: leg.originAirport,
          destinationAirport: leg.destinationAirport,
          departureTime: leg.departureTime,
          arrivalTime: leg.arrivalTime,
          airlineName: fallbackAirlineName,
          airlineLogo: fallbackAirlineLogo,
          flightNumber: fallbackFlightNumber,
        },
      ];

  const directionLabel = formatLegDirection(leg.direction, legIndex, legCount);

  return (
    <section aria-label={directionLabel}>
      <div className="mb-1 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">
            {directionLabel}
          </p>
          <p className="text-xs font-semibold tracking-wide text-slate-600">
            {leg.originAirport} to {leg.destinationAirport}
          </p>
        </div>
        <p className="text-xs font-medium leading-5 text-slate-500">
          {leg.duration} · {formatStops(leg.stops)}
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {segments.map((segment, segmentIndex) => {
          const airlineName = segment.airlineName || fallbackAirlineName;
          const matchesFallbackAirline =
            normalizeAirlineName(airlineName) ===
            normalizeAirlineName(fallbackAirlineName);
          const airlineLogo =
            getAirlineLogo(segment) ??
            (matchesFallbackAirline ? fallbackAirlineLogo : undefined);

          return (
            <div
              key={`${segment.originAirport}-${segment.destinationAirport}-${segmentIndex}`}
            >
              <CompactFlightRow
                originAirport={segment.originAirport}
                destinationAirport={segment.destinationAirport}
                departureTime={segment.departureTime}
                arrivalTime={segment.arrivalTime}
                airlineName={airlineName}
                airlineLogo={airlineLogo}
                flightNumber={segment.flightNumber || fallbackFlightNumber}
              />
              {leg.layovers[segmentIndex] ? (
                <LayoverSeparator layover={leg.layovers[segmentIndex]} />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CompactFlightRow({
  originAirport,
  destinationAirport,
  departureTime,
  arrivalTime,
  airlineName,
  airlineLogo,
  flightNumber,
}: {
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  airlineName?: string;
  airlineLogo?: string;
  flightNumber?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-2 py-1 sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] sm:gap-3">
      <div className="min-w-0">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-tight">
          <span className="truncate text-base font-semibold text-slate-900 sm:text-lg">
            {originAirport}
          </span>
          <span className="text-sm font-medium text-slate-700">
            {formatTime(departureTime)}
          </span>
        </p>
        {airlineName || flightNumber ? (
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-medium leading-4">
            {airlineName ? (
              <AirlineNameWithLogo
                airlineName={airlineName}
                airlineLogoUrl={airlineLogo}
                className="text-xs font-medium text-slate-700"
                logoClassName="h-4 w-4"
              />
            ) : null}
            {airlineName && flightNumber ? (
              <span
                className="h-1 w-1 shrink-0 rounded-full bg-slate-300"
                aria-hidden="true"
              />
            ) : null}
            {flightNumber ? (
              <span className="min-w-0 truncate text-xs font-medium text-slate-500">
                {flightNumber}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 items-center justify-center gap-1.5 self-center text-teal">
        <span className="hidden h-px flex-1 bg-slate-200 sm:block" />
        <Plane
          className="h-3.5 w-3.5 shrink-0 text-indigo-600"
          aria-hidden="true"
        />
        <span className="hidden h-px flex-1 bg-slate-200 sm:block" />
      </div>
      <div className="min-w-0 text-right">
        <p className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 leading-tight">
          <span className="text-sm font-medium text-slate-700">
            {formatTime(arrivalTime)}
          </span>
          <span className="truncate text-base font-semibold text-slate-900 sm:text-lg">
            {destinationAirport}
          </span>
        </p>
      </div>
    </div>
  );
}

function LayoverSeparator({
  layover,
}: {
  layover: FlightLeg["layovers"][number];
}) {
  return (
    <div className="py-1 text-xs font-medium leading-4 text-slate-500">
      Layover in {layover.airport} · {layover.duration}
      {layover.quality !== "unknown" ? ` · ${layover.quality} connection` : ""}
    </div>
  );
}

type HeroDetailItem = {
  label: string;
  value: string;
  icon: LucideIcon;
};

function buildHeroDetails(flight: PublicFlightResult): HeroDetailItem[] {
  return [
    {
      label: "Baggage",
      value: formatBaggageValue(flight.baggageInfo),
      icon: Luggage,
    },
    {
      label: "Cabin",
      value: formatCabinClass(flight.cabinClass),
      icon: Armchair,
    },
    {
      label: "Seat selection",
      value: formatSeatSelectionValue(flight),
      icon: Settings,
    },
    {
      label: "Fare rules",
      value: formatFareRulesValue(flight),
      icon: ShieldCheck,
    },
  ];
}

function formatCabinClass(value?: string) {
  if (!value) return "Confirmed by provider";
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatBaggageValue(value?: string) {
  if (
    !value ||
    isProviderReviewCopy(value) ||
    /rules vary|vary by fare/i.test(value)
  ) {
    return "Confirmed by provider";
  }

  return value;
}

function formatSeatSelectionValue(flight: PublicFlightResult) {
  return (
    getOptionalStringField(flight, [
      "seatSelectionInfo",
      "seatSelectionText",
      "seatSelectionPolicy",
      "seatSelection",
    ]) || "Provider rules apply"
  );
}

function formatFareRulesValue(flight: PublicFlightResult) {
  const fareRules = getOptionalStringField(flight, [
    "fareRules",
    "fareRuleSummary",
    "fareRulesSummary",
    "changeInfo",
    "refundInfo",
  ]);

  if (!fareRules || isProviderReviewCopy(fareRules)) {
    return "Review before booking";
  }

  return fareRules;
}

function getOptionalStringField(flight: PublicFlightResult, keys: string[]) {
  const fields = flight as Record<string, unknown>;

  for (const key of keys) {
    const value = fields[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function isProviderReviewCopy(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("reviewed on the external provider") ||
    normalized.includes("shown by the external provider") ||
    normalized.includes("reviewed externally") ||
    normalized.includes("rules vary") ||
    normalized.includes("vary by fare")
  );
}

function formatStops(stops: number) {
  if (stops === 0) return "Nonstop";
  return `${stops} stop${stops > 1 ? "s" : ""}`;
}

function formatLegDirection(
  direction: FlightLeg["direction"],
  index: number,
  legCount: number,
) {
  if (direction === "outbound") return "Outbound";
  if (direction === "return") return "Return";
  return legCount > 1 ? `Leg ${index + 1}` : "Itinerary";
}
