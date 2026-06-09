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
import type { ExchangeRates } from "@/lib/currency/exchangeRates";
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
  const providerOffers = buildProviderComparisonOffers(flight);

  return (
    <main className="flex-1 bg-surface-muted/40">
      <section className="border-b border-border bg-white">
        <div className="page-shell py-3 sm:py-4">
          <div className="mx-auto w-full max-w-5xl">
            <div className="grid w-full grid-cols-1 items-start gap-5 lg:grid-cols-[58%_minmax(0,1fr)] lg:gap-x-6 lg:gap-y-5">
              <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                <SelectedFlightSummary
                  itineraryLegs={itineraryLegs}
                  fallbackAirlineName={flight.airlineName}
                  fallbackAirlineLogo={getAirlineLogo(flight)}
                  fallbackFlightNumber={flight.flightNumber}
                  routeHeading={routeHeading}
                />

                <Card className="mt-5 overflow-hidden border-indigo-100 p-0 shadow-[0_24px_60px_-34px_rgba(49,46,129,0.8)]">
                  <div className="grid grid-cols-1 items-stretch gap-0">
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
                          <h1 className="flex min-w-0 flex-wrap items-center gap-2 text-3xl font-medium leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-2xl lg:font-semibold">
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

                    <aside className="flex items-center justify-center border-t border-indigo-100 bg-white px-3 py-3 sm:px-3 sm:py-2 lg:px-3.5 lg:py-2.5">
                      <div className="mx-auto flex w-full max-w-[20rem] flex-col items-stretch gap-1.5 text-center sm:max-w-[320px] sm:gap-1 lg:max-w-[320px]">
                        <div className="w-full rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2 text-center shadow-sm sm:px-2.5 sm:py-1">
                          <p className="text-[10px] font-semibold uppercase leading-3 tracking-wide text-slate-500">
                            From
                          </p>
                          <div
                            className="whitespace-nowrap text-center text-[1.125rem] font-medium leading-5 tracking-tight text-slate-900 sm:text-[1.2rem] sm:leading-6 lg:font-semibold"
                            aria-label={displayPrice.ariaLabel}
                            title={displayPrice.title}
                          >
                            {displayPrice.formatted}
                          </div>
                          {displayPrice.isConvertedEstimate ? (
                            <p className="mx-auto mt-1 max-w-[17rem] text-center text-[11px] font-medium leading-[0.95rem] text-slate-600 sm:mt-0.5">
                              Estimate shown. Provider price:{" "}
                              {displayPrice.providerFormatted}.
                            </p>
                          ) : null}
                        </div>
                        <Button
                          variant="accent"
                          size="lg"
                          className="h-11 w-full justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm font-semibold sm:h-9 sm:text-[13px]"
                          onClick={continueToProvider}
                          disabled={!hasProviderLink}
                        >
                          Continue to Provider <ArrowRight size={16} />
                        </Button>
                        <p className="flex w-full items-start justify-center gap-1.5 text-center text-xs leading-4 text-slate-500">
                          <Info
                            size={14}
                            className="mt-0.5 shrink-0 text-blue"
                          />
                          <span className="min-w-0">{providerDisclaimer}</span>
                        </p>
                      </div>
                    </aside>
                  </div>
                </Card>
              </div>

              <div className="min-w-0 lg:col-start-2 lg:row-start-1">
                <ProviderComparisonPanel
                  offers={providerOffers}
                  selectedCurrency={selectedOption.currency}
                  currencyRates={currencyRates.rates}
                  isFallbackRate={currencyRates.isFallback}
                  onContinueToProvider={continueToProvider}
                />
              </div>
            </div>
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
  routeHeading,
}: {
  itineraryLegs: FlightLeg[];
  fallbackAirlineName: string;
  fallbackAirlineLogo?: string;
  fallbackFlightNumber?: string;
  routeHeading: string;
}) {
  return (
    <section className="min-w-0" aria-label="Selected flight itinerary">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
        Selected Flights
      </h2>
      <h1 className="mt-2 text-2xl font-medium leading-snug text-slate-800 sm:text-2xl">
        {routeHeading}
      </h1>
      <div className="mt-3.5 rounded-2xl border border-slate-200/80 bg-white/50 px-4 py-4 sm:px-5">
        <div className="relative border-l border-slate-200 pl-5 sm:pl-6">
          {itineraryLegs.map((leg, legIndex) => (
            <div
              key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}-${legIndex}`}
              className={`relative ${legIndex > 0 ? "mt-4 border-t border-slate-200/80 pt-4" : ""}`}
            >
              <span
                className={`absolute -left-[1.8125rem] h-3 w-3 rounded-full border-2 border-white bg-slate-400 shadow-[0_0_0_1px_rgba(148,163,184,0.42)] sm:-left-[2.0625rem] ${
                  legIndex > 0 ? "top-5" : "top-1"
                }`}
                aria-hidden="true"
              />
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

type ProviderComparisonOffer = {
  key: string;
  title: string;
  providerName?: string;
  logoUrl?: string;
  baggageInfo?: string;
  cabinClass?: string;
  stops?: number;
  duration?: string;
  price?: number;
  currency?: string;
  bookingUrl?: string;
  partnerRedirectUrl?: string;
  useSelectedFlightRedirect?: boolean;
};

function ProviderComparisonPanel({
  offers,
  selectedCurrency,
  currencyRates,
  isFallbackRate,
  onContinueToProvider,
}: {
  offers: ProviderComparisonOffer[];
  selectedCurrency: string;
  currencyRates: ExchangeRates;
  isFallbackRate: boolean;
  onContinueToProvider: () => void;
}) {
  return (
    <aside className="min-w-0 lg:mt-1" aria-label="Compare more providers">
      <div>
        <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-900 sm:text-lg">
          Compare more providers
        </h2>
        <p className="mt-1.5 text-sm leading-5 text-slate-700 sm:mt-2 sm:leading-6">
          Kurioticket can compare from different providers.
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200/70 bg-white/70 p-3 shadow-none sm:mt-3.5 sm:p-4">
        {offers.length ? (
          <div className="divide-y divide-slate-100/80">
            {offers.map((offer) => {
              const priceDisplay =
                typeof offer.price === "number" && offer.currency
                  ? formatDisplayPrice({
                      amount: offer.price,
                      sourceCurrency: offer.currency,
                      displayCurrency: selectedCurrency,
                      convertUsdEstimate: true,
                      rates: currencyRates,
                      isFallbackRate,
                    })
                  : null;
              const details = [
                offer.cabinClass ? formatCabinClass(offer.cabinClass) : null,
                offer.baggageInfo ? formatBaggageValue(offer.baggageInfo) : null,
                typeof offer.stops === "number" ? formatStops(offer.stops) : null,
                offer.duration,
              ].filter(
                (detail): detail is string =>
                  Boolean(detail) && detail !== "Confirmed by provider",
              );
              const providerUrl = offer.partnerRedirectUrl || offer.bookingUrl;
              const canBook =
                offer.useSelectedFlightRedirect || Boolean(providerUrl);
              const showProviderByline =
                offer.providerName &&
                normalizeAirlineName(offer.providerName) !==
                  normalizeAirlineName(offer.title);

              return (
                <div
                  key={offer.key}
                  className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {offer.logoUrl ? (
                      <Image
                        src={offer.logoUrl}
                        alt={`${offer.title} logo`}
                        width={36}
                        height={36}
                        className="h-8 w-8 shrink-0 rounded-full border border-slate-100 bg-white object-contain p-1"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {offer.title}
                      </p>
                      {details.length ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">
                          {details.join(" · ")}
                        </p>
                      ) : null}
                      {showProviderByline ? (
                        <p className="mt-1 truncate text-[11px] leading-4 text-slate-400">
                          Provided by {offer.providerName}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    {priceDisplay ? (
                      <p
                        className="text-sm font-semibold text-slate-900"
                        aria-label={priceDisplay.ariaLabel}
                        title={priceDisplay.title}
                      >
                        {priceDisplay.formatted}
                      </p>
                    ) : null}
                    {canBook ? (
                      <Button
                        variant="accent"
                        size="sm"
                        className="rounded-full bg-indigo-600 px-3 text-xs font-semibold shadow-none hover:bg-indigo-700"
                        onClick={() => {
                          if (offer.useSelectedFlightRedirect) {
                            onContinueToProvider();
                            return;
                          }

                          if (providerUrl) window.location.href = providerUrl;
                        }}
                      >
                        Book now
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50/70 px-3 py-2 text-sm leading-5 text-slate-700 sm:py-2.5 sm:leading-6">
            No additional live provider options are available for this flight
            right now.
          </p>
        )}
      </div>
    </aside>
  );
}

function buildProviderComparisonOffers(
  flight: PublicFlightResult,
): ProviderComparisonOffer[] {
  const selectedOffer = normalizeSelectedProviderComparisonOffer(flight);
  const offers = getNestedProviderOffers(flight)
    .map((offer, index) =>
      normalizeProviderComparisonOffer(offer, index, flight),
    )
    .filter((offer): offer is ProviderComparisonOffer => Boolean(offer));

  const seen = new Set<string>();
  const uniqueOffers = offers.filter((offer) => {
    const dedupeKey = buildProviderComparisonDedupeKey(offer);

    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });

  const alternatives = uniqueOffers.filter(
    (offer) => !providerComparisonOffersMatch(offer, selectedOffer),
  );

  return alternatives.length > 0 ? alternatives : [];
}

function normalizeSelectedProviderComparisonOffer(
  flight: PublicFlightResult,
): ProviderComparisonOffer {
  return {
    key: `selected-${flight.id}`,
    title: flight.airlineName,
    providerName: flight.provider,
    logoUrl: getProviderComparisonLogo(flight),
    baggageInfo: flight.baggageInfo,
    cabinClass: flight.cabinClass,
    stops: flight.stops,
    duration: flight.duration,
    price: flight.price,
    currency: flight.currency,
    bookingUrl: flight.bookingUrl,
    partnerRedirectUrl: flight.partnerRedirectUrl,
    useSelectedFlightRedirect: Boolean(
      flight.partnerRedirectUrl || flight.bookingUrl,
    ),
  };
}

function buildProviderComparisonDedupeKey(offer: ProviderComparisonOffer) {
  return [
    offer.title.trim().toLowerCase(),
    offer.providerName?.trim().toLowerCase() ?? "",
    offer.price ?? "",
    offer.currency ?? "",
    offer.bookingUrl ?? "",
    offer.partnerRedirectUrl ?? "",
  ].join("|");
}

function providerComparisonOffersMatch(
  offer: ProviderComparisonOffer,
  selectedOffer: ProviderComparisonOffer,
) {
  const sameUrl = Boolean(
    (offer.bookingUrl && offer.bookingUrl === selectedOffer.bookingUrl) ||
    (offer.partnerRedirectUrl &&
      offer.partnerRedirectUrl === selectedOffer.partnerRedirectUrl),
  );
  const samePrice =
    typeof offer.price === "number" &&
    typeof selectedOffer.price === "number" &&
    offer.price === selectedOffer.price &&
    offer.currency === selectedOffer.currency;
  const sameTitle =
    normalizeAirlineName(offer.title) ===
    normalizeAirlineName(selectedOffer.title);
  const sameProvider =
    normalizeAirlineName(offer.providerName) ===
    normalizeAirlineName(selectedOffer.providerName);

  return sameUrl || (samePrice && (sameTitle || sameProvider));
}

function getNestedProviderOffers(flight: PublicFlightResult) {
  const fields = flight as Record<string, unknown>;
  const offerKeys = [
    "providerOffers",
    "providerOptions",
    "bookingOptions",
    "bookingOffers",
    "alternativeOffers",
    "alternatives",
    "alternativeFlights",
    "flightAlternatives",
    "results",
    "offers",
    "fares",
  ];

  return offerKeys.flatMap((key) => {
    const value = fields[key];
    return Array.isArray(value) ? value : [];
  });
}

function normalizeProviderComparisonOffer(
  source: unknown,
  index: number,
  selectedFlight: PublicFlightResult,
): ProviderComparisonOffer | null {
  if (!source || typeof source !== "object") return null;

  const fields = source as Record<string, unknown>;
  const providerName = getFirstStringValue(fields, [
    "providerDisplayName",
    "offerDisplayName",
    "displayName",
    "providerName",
    "provider",
    "name",
    "partnerName",
    "partner",
    "supplierName",
    "supplier",
    "sourceName",
    "source",
  ]);
  const title = getCustomerFacingOfferName(fields) ?? providerName;

  if (!title) return null;

  const price = getNumericValue(fields, [
    "price",
    "amount",
    "totalPrice",
    "totalAmount",
    "grandTotal",
    "total_amount",
  ]);
  const currency = getFirstStringValue(fields, [
    "currency",
    "priceCurrency",
    "totalCurrency",
    "total_currency",
  ]);

  return {
    key: `offer-${title}-${providerName ?? "provider"}-${price ?? ""}-${currency ?? ""}-${index}`,
    title,
    providerName,
    logoUrl: getProviderComparisonLogo(source, selectedFlight),
    baggageInfo: getFirstStringValue(fields, [
      "baggageInfo",
      "baggage",
      "includedBaggage",
      "includedCheckedBags",
    ]),
    cabinClass: getFirstStringValue(fields, [
      "cabinClass",
      "cabin",
      "fareClass",
      "fareType",
      "fareFamily",
    ]),
    stops: getNumericValue(fields, ["stops", "stopCount", "numberOfStops"]),
    duration: getFirstStringValue(fields, ["duration", "totalDuration"]),
    price,
    currency,
    bookingUrl: getFirstStringValue(fields, [
      "bookingUrl",
      "booking_url",
      "deepLink",
      "deep_link",
      "url",
    ]),
    partnerRedirectUrl: getFirstStringValue(fields, [
      "partnerRedirectUrl",
      "redirectUrl",
      "redirect_url",
    ]),
  };
}

function getCustomerFacingOfferName(
  fields: Record<string, unknown>,
): string | undefined {
  return (
    getFirstStringValue(fields, ["airlineName", "airline", "carrierName"]) ??
    getNestedString(
      fields,
      ["airline", "carrier"],
      ["displayName", "name", "label"],
    ) ??
    getFirstStringValue(fields, [
      "marketingCarrierName",
      "marketingCarrier",
      "marketingAirlineName",
    ]) ??
    getNestedString(
      fields,
      ["marketingCarrier", "marketingAirline"],
      ["displayName", "name", "label"],
    ) ??
    getFirstStringValue(fields, [
      "validatingCarrierName",
      "validatingCarrier",
      "validatingAirlineName",
    ]) ??
    getNestedString(
      fields,
      ["validatingCarrier", "validatingAirline"],
      ["displayName", "name", "label"],
    ) ??
    getItineraryCarrierName(fields) ??
    getFirstStringValue(fields, ["offerDisplayName", "displayName", "name"])
  );
}

function getItineraryCarrierName(
  fields: Record<string, unknown>,
): string | undefined {
  for (const candidate of getItineraryCarrierCandidates(fields)) {
    const carrierName = getCustomerFacingOfferName(candidate);
    if (carrierName) return carrierName;
  }

  return undefined;
}

function getItineraryCarrierLogo(
  fields: Record<string, unknown>,
): string | undefined {
  for (const candidate of getItineraryCarrierCandidates(fields)) {
    const logo = getAirlineLogo(candidate);
    if (logo) return logo;
  }

  return undefined;
}

function getItineraryCarrierCandidates(fields: Record<string, unknown>) {
  const candidates: Record<string, unknown>[] = [];
  const directSegments = fields.segments;

  if (Array.isArray(directSegments)) {
    candidates.push(...getRecordItems(directSegments));
  }

  const legs = fields.legs;

  if (Array.isArray(legs)) {
    for (const leg of getRecordItems(legs)) {
      const legSegments = leg.segments;

      if (Array.isArray(legSegments)) {
        candidates.push(...getRecordItems(legSegments));
      }
    }
  }

  return candidates;
}

function getRecordItems(values: unknown[]) {
  return values.filter(
    (value): value is Record<string, unknown> =>
      Boolean(value) && typeof value === "object",
  );
}

function getProviderComparisonLogo(
  source: unknown,
  selectedFlight?: PublicFlightResult,
): string | undefined {
  const directLogo = getAirlineLogo(source);
  if (directLogo) return directLogo;

  if (!source || typeof source !== "object") return undefined;

  const fields = source as Record<string, unknown>;
  const itineraryLogo = getItineraryCarrierLogo(fields);
  if (itineraryLogo) return itineraryLogo;

  const providerLogo =
    getFirstStringValue(fields, [
      "providerLogo",
      "providerLogoUrl",
      "partnerLogo",
      "partnerLogoUrl",
      "supplierLogo",
      "supplierLogoUrl",
    ]) ?? getNestedLogo(fields, ["provider", "partner", "supplier"]);
  if (providerLogo) return providerLogo;

  const sourceAirlineName = getCustomerFacingOfferName(fields);
  const selectedAirlineName = selectedFlight?.airlineName;

  if (
    selectedFlight &&
    sourceAirlineName &&
    selectedAirlineName &&
    normalizeAirlineName(sourceAirlineName) ===
      normalizeAirlineName(selectedAirlineName)
  ) {
    return getAirlineLogo(selectedFlight);
  }

  return undefined;
}

function getNestedString(
  fields: Record<string, unknown>,
  objectKeys: string[],
  nestedKeys: string[],
): string | undefined {
  for (const objectKey of objectKeys) {
    const value = fields[objectKey];

    if (!value || typeof value !== "object") continue;

    const nested = value as Record<string, unknown>;

    for (const nestedKey of nestedKeys) {
      const nestedValue = nested[nestedKey];

      if (typeof nestedValue === "string" && nestedValue.trim()) {
        return nestedValue.trim();
      }
    }
  }

  return undefined;
}

function getFirstStringValue(
  fields: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = fields[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      const nestedValue = nested.amount ?? nested.value ?? nested.total;

      if (typeof nestedValue === "string" && nestedValue.trim()) {
        return nestedValue.trim();
      }
    }
  }

  return undefined;
}

function getNumericValue(fields: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = fields[key];
    const numericValue = readNumericValue(value);

    if (typeof numericValue === "number") return numericValue;
  }

  return undefined;
}

function readNumericValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  if (value && typeof value === "object") {
    const nested = value as Record<string, unknown>;
    return readNumericValue(nested.amount ?? nested.value ?? nested.total);
  }

  return undefined;
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
    "marketingCarrierLogoUrl",
    "validatingCarrierLogo",
    "validatingCarrierLogoUrl",
    "operatingCarrierLogo",
    "operatingCarrierLogoUrl",
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
    "validatingCarrier",
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
                className="flex-1 text-xs font-medium text-slate-700"
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
              <span className="shrink-0 whitespace-nowrap text-xs font-medium text-slate-500">
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
