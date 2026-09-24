"use client";

import { Check, ExternalLink, Leaf } from "lucide-react";

import { formatDisplayPrice, formatFlightResultCurrency } from "@/lib/currency/formatCurrency";
import type { ExchangeRates } from "@/lib/currency/exchangeRates";
import type { FlightDetailsFareChoice, FlightDetailsOffer } from "@/lib/flights/flightDetailsContract";
import type { FlightProviderCondition } from "@/lib/types";

export type MobileFareInfoTab = "deals" | "details" | "conditions" | "extras";

const tabs: Array<{ id: MobileFareInfoTab; label: string }> = [
  { id: "deals", label: "Compare deals" },
  { id: "details", label: "Fare details" },
  { id: "conditions", label: "Fare conditions" },
  { id: "extras", label: "Optional extras" },
];

export function MobileNativeFareInformationDeck({
  activeTab,
  onTabChange,
  fare,
  activeOffer,
  selectedDealOfferId,
  onSelectDeal,
  selectedCurrency,
  currencyRates,
  isFallbackRate,
  locale,
  pricesReady,
}: {
  activeTab: MobileFareInfoTab;
  onTabChange: (tab: MobileFareInfoTab) => void;
  fare?: FlightDetailsFareChoice;
  activeOffer: FlightDetailsOffer;
  selectedDealOfferId: string | null;
  onSelectDeal: (offerId: string) => void;
  selectedCurrency: string;
  currencyRates: ExchangeRates;
  isFallbackRate: boolean;
  locale: string;
  pricesReady: boolean;
}) {
  return (
    <section data-mobile-native-fare-information-deck className="mt-3 sm:hidden">
      <div className="-mx-[10px] overflow-x-auto border-b border-[#D8E1EC] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Fare information" className="flex w-max min-w-full gap-[22px] px-0">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`mobile-fare-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`mobile-fare-panel-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                style={{
                  color: "#536B92",
                  fontWeight: 600,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
                className="relative min-h-[48px] shrink-0 whitespace-nowrap px-0 text-[14px] leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0754F7]/35"
              >
                {tab.label}
                {selected ? <span className="absolute -bottom-px left-0.5 right-0.5 h-[3px] rounded-[2px] bg-[#0754F7]" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div data-mobile-native-fare-information-active-content className="px-1 pb-1 pt-[7px]">
        {activeTab === "deals" ? (
          <DealsSurface
            fare={fare}
            selectedDealOfferId={selectedDealOfferId}
            onSelectDeal={onSelectDeal}
            selectedCurrency={selectedCurrency}
            currencyRates={currencyRates}
            isFallbackRate={isFallbackRate}
            pricesReady={pricesReady}
          />
        ) : null}
        {activeTab === "details" ? <DetailsSurface offer={activeOffer} locale={locale} /> : null}
        {activeTab === "conditions" ? <ConditionsSurface offer={activeOffer} locale={locale} /> : null}
        {activeTab === "extras" ? <ExtrasSurface offer={activeOffer} locale={locale} /> : null}
      </div>
    </section>
  );
}

function DealsSurface({
  fare,
  selectedDealOfferId,
  onSelectDeal,
  selectedCurrency,
  currencyRates,
  isFallbackRate,
  pricesReady,
}: {
  fare?: FlightDetailsFareChoice;
  selectedDealOfferId: string | null;
  onSelectDeal: (offerId: string) => void;
  selectedCurrency: string;
  currencyRates: ExchangeRates;
  isFallbackRate: boolean;
  pricesReady: boolean;
}) {
  const deals = fare?.deals ?? [];
  if (!deals.length) {
    return <EmptyState title="No booking deals available" description="No additional live provider deals were supplied for this fare." />;
  }

  return (
    <div role="radiogroup" aria-label="Flight deal options" className="space-y-[10px] py-3">
      {deals.map((deal) => {
        const selected = deal.offerId === selectedDealOfferId;
        const price = formatDisplayPrice({
          amount: deal.price,
          sourceCurrency: deal.currency,
          displayCurrency: selectedCurrency,
          convertSourceEstimate: true,
          useFlightResultSymbols: true,
          maximumFractionDigits: 0,
          rates: currencyRates,
          isFallbackRate,
        });
        const priceAvailable = pricesReady && (
          deal.currency.toUpperCase() === selectedCurrency.toUpperCase()
          || (!isFallbackRate && price.currency.toUpperCase() === selectedCurrency.toUpperCase())
        );
        return (
          <button
            key={deal.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${deal.providerName}, ${priceAvailable ? price.ariaLabel : "price unavailable"}, ${fare?.label ?? "fare"}`}
            onClick={() => onSelectDeal(deal.offerId)}
            className={`flex min-h-24 w-full flex-col justify-between gap-[14px] rounded-[14px] border px-[15px] py-[13px] text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35 ${
              selected
                ? "border-[#075EE8] bg-[#F4F8FF] shadow-[0_4px_10px_rgba(7,19,59,0.12)]"
                : "border-[#D8E1EC] bg-white"
            }`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0 flex-1 text-[15px] font-bold leading-5 text-[#1A1A1A]">{deal.providerName}</span>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${selected ? "border-[#075EE8]" : "border-[#64748B]"}`}>
                {selected ? <span className="h-2 w-2 rounded-full bg-[#075EE8]" aria-hidden="true" /> : null}
              </span>
            </span>
            <span className="flex items-end justify-between gap-3">
              <span className="min-w-0 flex-1 text-[12px] font-medium leading-[17px] text-[#536B92]">{fare?.label}</span>
              <span className="max-w-[60%] shrink-0 text-right text-[18px] font-extrabold leading-[22px] tabular-nums text-[#1A1A1A]" aria-label={price.ariaLabel}>{priceAvailable ? price.formatted : "—"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DetailsSurface({ offer, locale }: { offer: FlightDetailsOffer; locale: string }) {
  const provider = offer.providerDetails;
  const cabins = (offer.legs ?? []).flatMap((leg) => leg.segments.flatMap((segment) =>
    (segment.cabinDetails ?? []).map((cabin) => ({ segment, cabin })),
  ));

  return (
    <div className="divide-y divide-[#D8E1EC]">
      <section className="py-3">
        {cabins.length ? cabins.map(({ segment, cabin }, index) => {
          const seat = [
            cabin.amenities?.seat?.type && titleCase(cabin.amenities.seat.type),
            cabin.amenities?.seat?.pitch && `${cabin.amenities.seat.pitch} in pitch`,
            cabin.amenities?.seat?.legroom && `${titleCase(cabin.amenities.seat.legroom)} legroom`,
          ].filter(Boolean).join(" · ");
          const wifi = cabin.amenities?.wifi;
          const wifiValue = wifi ? `${amenityState(wifi.state)}${wifi.state === "included" && wifi.cost ? ` (${titleCase(wifi.cost)})` : ""}` : undefined;
          const hasCabin = Boolean(cabin.fareBrandName || cabin.cabinClass || cabin.cabinMarketingName || cabin.fareBasisCode);
          const hasOnBoard = Boolean(seat || cabin.amenities?.wifi || cabin.amenities?.power);
          return (
            <div key={`${segment.departureTime}-${index}`} className={`py-[10px] ${index ? "border-t border-[#D8E1EC]" : ""}`}>
              <p className="mb-[11px] text-[14px] font-semibold leading-[19px] text-[#1A1A1A]">
                {segment.originAirport} → {segment.destinationAirport}
                {segment.marketingFlightNumber || segment.flightNumber ? ` · ${segment.marketingFlightNumber || segment.flightNumber}` : ""}
              </p>
              {hasCabin ? (
                <div className="space-y-2">
                  <GroupLabel>Cabin</GroupLabel>
                  <DetailRow label="Fare brand" value={cabin.fareBrandName} />
                  <DetailRow label="Cabin" value={cabin.cabinClass && titleCase(cabin.cabinClass)} />
                  <DetailRow label="Cabin product" value={cabin.cabinMarketingName} />
                  <DetailRow label="Fare basis" value={cabin.fareBasisCode} />
                </div>
              ) : null}
              {hasCabin && hasOnBoard ? <div className="my-[11px] h-px bg-[#D8E1EC]" /> : null}
              {hasOnBoard ? (
                <div className="space-y-2">
                  <GroupLabel>On board</GroupLabel>
                  <DetailRow label="Seat" value={seat || undefined} />
                  <DetailRow label="Wi-Fi" value={wifiValue} />
                  <DetailRow label="Power" value={cabin.amenities?.power ? amenityState(cabin.amenities.power.state) : undefined} />
                </div>
              ) : null}
            </div>
          );
        }) : <QuietText>Additional cabin details not supplied by the provider.</QuietText>}
      </section>

      <section className="py-3">
        <GroupLabel>Price breakdown</GroupLabel>
        {provider?.price ? (
          <div className="space-y-2">
            {provider.price.baseAmount !== undefined && provider.price.baseCurrency ? <DetailRow label="Base fare" value={formatSourceMoney(provider.price.baseAmount, provider.price.baseCurrency, locale)} /> : null}
            {provider.price.taxAmount !== undefined && provider.price.taxCurrency ? <DetailRow label="Taxes" value={formatSourceMoney(provider.price.taxAmount, provider.price.taxCurrency, locale)} /> : null}
            <DetailRow label="Trip total" value={formatSourceMoney(provider.price.totalAmount, provider.price.totalCurrency, locale)} strong />
          </div>
        ) : <QuietText>Price breakdown not supplied by the provider.</QuietText>}
      </section>

      {provider?.totalEmissionsKg !== undefined ? (
        <section className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-[11px] py-[9px]">
            <span className="flex min-w-[180px] flex-1 items-center gap-[7px] text-[13px] font-semibold leading-[18px] text-emerald-700">
              <Leaf className="h-[17px] w-[17px]" aria-hidden="true" /> Estimated CO₂ emissions
            </span>
            <span className="ml-auto text-right">
              <span className="block text-[14px] font-semibold leading-[18px] text-[#1A1A1A]">{provider.totalEmissionsKg.toLocaleString(locale)} kg</span>
              <span className="block text-[11px] leading-[15px] text-[#536B92]">for this offer</span>
            </span>
          </div>
        </section>
      ) : null}

      {provider?.updatedAt ? (
        <section className="py-[11px]">
          <p className="text-[11px] font-medium leading-4 text-[#536B92]">Provider offer last updated</p>
          <p className="text-[11px] leading-4 text-[#536B92]">{formatProviderTimestamp(provider.updatedAt, locale)}</p>
        </section>
      ) : null}
    </div>
  );
}

function ConditionsSurface({ offer, locale }: { offer: FlightDetailsOffer; locale: string }) {
  const provider = offer.providerDetails;
  const conditions = provider?.conditions ?? [];
  const groups = [...new Set(conditions.map((condition) => condition.category))].map((category) => ({
    category,
    conditions: conditions.filter((condition) => condition.category === category),
  }));
  const links = carrierConditionsLinks(offer);

  return (
    <div className="divide-y divide-[#D8E1EC]">
      <section>
        {groups.length ? groups.map((group, groupIndex) => (
          <div key={group.category} className={`py-3 ${groupIndex ? "border-t border-[#D8E1EC]" : ""}`}>
            <GroupLabel>{conditionCategory(group.conditions[0])}</GroupLabel>
            {group.conditions.map((condition, index) => {
              const semantic = condition.state === "allowed" ? "positive" : condition.state === "not-allowed" ? "negative" : "informational";
              const penalty = condition.penaltyAmount !== undefined && condition.penaltyCurrency
                ? `${formatSourceMoney(condition.penaltyAmount, condition.penaltyCurrency, locale)} penalty`
                : null;
              return (
                <div key={`${condition.scope}-${condition.category}-${index}`} className={`flex items-start gap-[11px] py-[9px] ${index ? "border-t border-[#D8E1EC]" : ""}`}>
                  <StatusIcon semantic={semantic} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-[18px] text-[#1A1A1A]">{conditionState(condition)}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-[#536B92]">{conditionScope(condition)}</p>
                    {penalty ? <p className="mt-0.5 text-[11px] font-medium leading-4 text-[#536B92]">{penalty}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )) : <EmptyState title="Fare conditions unavailable" description="Conditions were not supplied by the provider." />}
      </section>

      {(provider?.passengerIdentityDocumentsRequired || provider?.supportedIdentityDocumentTypes?.length) ? (
        <section className="py-3">
          <GroupLabel>Travel documents</GroupLabel>
          {provider.passengerIdentityDocumentsRequired ? <p className="mb-[7px] text-[13px] leading-[19px] text-[#1A1A1A]">Passport or identity information is required to complete booking.</p> : null}
          {provider.supportedIdentityDocumentTypes?.length ? <DetailRow label="Supported documents" value={provider.supportedIdentityDocumentTypes.map(titleCase).join(", ")} /> : null}
        </section>
      ) : null}

      {(provider?.offerOwner || links.length) ? (
        <section className="py-3">
          <GroupLabel>Airline</GroupLabel>
          {provider?.offerOwner ? <p className="mb-[3px] text-[13px] font-medium leading-[19px] text-[#1A1A1A]">{provider.offerOwner.name}{provider.offerOwner.iataCode ? ` • ${provider.offerOwner.iataCode}` : ""}</p> : null}
          {links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between gap-3 text-[13px] font-semibold leading-[18px] text-[#075EE8]">
              <span className="min-w-0 flex-1">{link.name} conditions of carriage</span>
              <ExternalLink className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
            </a>
          ))}
        </section>
      ) : null}

      {provider?.updatedAt ? (
        <section className="py-[11px]">
          <p className="text-[11px] font-medium leading-4 text-[#536B92]">Provider offer last updated</p>
          <p className="text-[11px] leading-4 text-[#536B92]">{formatProviderTimestamp(provider.updatedAt, locale)}</p>
        </section>
      ) : null}
    </div>
  );
}

function ExtrasSurface({ offer, locale }: { offer: FlightDetailsOffer; locale: string }) {
  const provider = offer.providerDetails;
  const services = provider?.optionalServices ?? [];
  return (
    <div className="divide-y divide-[#D8E1EC]">
      <section className="py-3">
        <GroupLabel>Optional services</GroupLabel>
        {services.length ? services.map((service, index) => (
          <div key={`${service.type}-${service.description}-${index}`} className={`py-3 ${index ? "border-t border-[#D8E1EC]" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 text-[13px] font-semibold leading-[19px] text-[#1A1A1A]">{service.description}</p>
              <p className="max-w-[42%] shrink-0 text-right text-[13px] font-bold leading-[19px] tabular-nums text-[#1A1A1A]">{formatSourceMoney(service.price, service.currency, locale)}{service.pricedPerTraveler ? " each" : ""}</p>
            </div>
            {service.travelerCount ? <p className="mt-1 text-[12px] leading-[17px] text-[#536B92]">Available for {service.travelerCount} traveler{service.travelerCount === 1 ? "" : "s"}</p> : null}
            {service.maximumQuantity !== undefined ? <p className="mt-1 text-[12px] leading-[17px] text-[#536B92]">{service.pricedPerTraveler ? "Maximum quantity per traveler" : "Maximum quantity"}: {service.maximumQuantity}</p> : null}
            {service.journeyContext ? <p className="mt-1 text-[12px] leading-[17px] text-[#536B92]">{service.journeyContext}</p> : null}
          </div>
        )) : <QuietText>No optional services were supplied by this provider.</QuietText>}
      </section>

      {provider?.supportedLoyaltyProgrammes?.length ? (
        <section className="py-3">
          <GroupLabel>Loyalty programmes</GroupLabel>
          <p className="text-[13px] font-medium leading-[19px] text-[#1A1A1A]">{provider.supportedLoyaltyProgrammes.join(", ")}</p>
        </section>
      ) : null}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-[9px] text-[11px] font-bold uppercase leading-[15px] tracking-[0.85px] text-[#536B92]">{children}</p>;
}

function DetailRow({ label, value, strong = false }: { label: string; value?: string | null; strong?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={`shrink-0 text-[13px] leading-[19px] text-[#536B92] ${strong ? "font-bold" : "font-normal"}`}>{label}</span>
      <span className={`min-w-0 flex-1 text-right text-[13px] leading-[19px] text-[#1A1A1A] ${strong ? "font-bold" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function QuietText({ children }: { children: React.ReactNode }) {
  return <p className="py-[18px] text-[13px] leading-[19px] text-[#536B92]">{children}</p>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-[10px] py-[18px] text-center">
      <p className="text-[14px] font-semibold leading-[19px] text-[#1A1A1A]">{title}</p>
      <p className="mt-[5px] text-[13px] leading-[19px] text-[#536B92]">{description}</p>
    </div>
  );
}

function StatusIcon({ semantic }: { semantic: "positive" | "negative" | "informational" }) {
  return (
    <span className={`mt-0.5 flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border ${semantic === "positive" ? "border-emerald-500" : "border-slate-400"}`}>
      {semantic === "positive" ? <Check className="h-2.5 w-2.5 text-emerald-600" strokeWidth={2.2} aria-hidden="true" />
        : semantic === "negative" ? <span className="h-[1.5px] w-[7px] rounded bg-slate-500" aria-hidden="true" />
          : <span className="h-[3px] w-[3px] rounded-full bg-slate-500" aria-hidden="true" />}
    </span>
  );
}

function amenityState(value: "included" | "not-included" | "unknown") {
  return value === "included" ? "Available" : value === "not-included" ? "Not available" : "Not supplied by provider";
}

function conditionCategory(condition?: FlightProviderCondition) {
  if (!condition) return "Fare conditions";
  return condition.category === "change" ? "Changes"
    : condition.category === "refund" ? "Refunds"
      : titleCase(condition.category);
}

function conditionState(condition: FlightProviderCondition) {
  const permission = condition.category === "change" || condition.category === "refund";
  return condition.state === "allowed" ? (permission ? "Allowed" : "Included")
    : condition.state === "not-allowed" ? (permission ? "Not allowed" : "Not included")
      : "Not supplied by provider";
}

function conditionScope(condition: FlightProviderCondition) {
  return condition.scope === "trip" ? "Whole trip"
    : condition.legIndex !== undefined ? `Flight ${condition.legIndex + 1}`
      : condition.scope === "outbound" ? "Outbound only"
        : condition.scope === "return" ? "Return only"
          : "Leg";
}

function carrierConditionsLinks(offer: FlightDetailsOffer) {
  const entries = (offer.legs ?? [])
    .flatMap((leg) => leg.segments.flatMap((segment) => [segment.marketingCarrier, segment.operatingCarrier]))
    .flatMap((carrier) => carrier?.conditionsOfCarriageUrl ? [{ name: carrier.name, url: carrier.conditionsOfCarriageUrl }] : []);
  if (offer.providerDetails?.offerOwner?.conditionsOfCarriageUrl) {
    entries.push({ name: offer.providerDetails.offerOwner.name, url: offer.providerDetails.offerOwner.conditionsOfCarriageUrl });
  }
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSourceMoney(amount: number, currency: string, locale: string) {
  try {
    return formatFlightResultCurrency(amount, currency, { maximumFractionDigits: 0, locale });
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
  }
}

function formatProviderTimestamp(value: string, locale: string) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(timestamp);
}
