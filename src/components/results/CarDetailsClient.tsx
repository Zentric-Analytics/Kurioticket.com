"use client";

import type { ReactNode, Ref } from "react";
import { Clock3, MapPin } from "lucide-react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { DetailsBackLink } from "@/components/results/DetailsBackLink";
import { CarDetailsHero } from "@/components/results/carDetails/CarDetailsHero";
import { formatCarDate, pickupTypeLabels } from "@/components/results/carDetails/helpers";
import { calculateRentalDays, getPrimaryCarOffer } from "@/lib/cars/carResults";
import type { CarOffer, CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { translations as enTranslations } from "@/lib/i18n/en";
import { getDealsGuidedConfirmationActionId } from "@/lib/deals/dealsConfirmationIds";

export type CarDetailsPrimaryAction =
  | { kind: "standalone-disabled-provider"; label: string }
  | { kind: "guided-car"; enabled: boolean; pending: boolean; label: string; accessibleLabel: string; unavailableMessage: string; error: string; onActivate: () => void };

type HeadingLevel = 1 | 2 | 3 | 4;
type PriceFn = (amount: number, currency: string) => ReturnType<typeof formatDisplayPrice>;

const Heading = ({ level, className, children, headingRef }: { level: HeadingLevel; className: string; children: ReactNode; headingRef?: Ref<HTMLHeadingElement> }) => {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
  return <Tag ref={headingRef} tabIndex={headingRef ? -1 : undefined} className={className}>{children}</Tag>;
};

export function CarDetailsExperience({ car, search, primaryAction, presentation, primaryOffer: suppliedPrimaryOffer, modelHeadingLevel = 1, sectionHeadingLevel = 2, itemHeadingLevel = 3, modelHeadingRef }: { car: NormalizedCarResult; search: CarSearchParams; primaryAction: CarDetailsPrimaryAction; presentation: "standalone-content" | "guided-content"; primaryOffer?: CarOffer | null; modelHeadingLevel?: HeadingLevel; sectionHeadingLevel?: HeadingLevel; itemHeadingLevel?: HeadingLevel; modelHeadingRef?: Ref<HTMLHeadingElement> }) {
  const { locale, t } = useLocale();
  const { selectedOption } = useRegion();
  const rates = useCurrencyRates();
  const copy = (key: string) => t[key] || enTranslations[key] || key;
  const text = { passengers: copy("carsResults.passengers").toLowerCase(), bags: copy("carDetails.bags"), doors: copy("carsResults.doors").toLowerCase(), airConditioning: copy("carsResults.airConditioning"), unlimitedMileage: copy("carDetails.unlimitedMileage"), included: copy("carDetails.includedShort"), cancellation: copy("carDetails.cancellation"), freeCancellation: copy("carDetails.freeCancellation"), nonRefundable: copy("carDetails.nonRefundable"), taxesFees: copy("carDetails.taxesFees"), includedShort: copy("carDetails.includedShort"), notIncluded: copy("carDetails.notIncluded") };
  const primaryOffer = suppliedPrimaryOffer ?? getPrimaryCarOffer(car);
  const days = calculateRentalDays(search.pickupDate, search.dropoffDate);
  const price = (amount: number, currency: string) => formatDisplayPrice({ amount, sourceCurrency: currency, displayCurrency: selectedOption.currency, convertSourceEstimate: true, maximumFractionDigits: 0, rates: rates.rates, isFallbackRate: rates.isFallback });
  return <div className={presentation === "guided-content" ? "mt-6" : ""} data-car-details-experience>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4 sm:space-y-5">
        <CarDetailsHero car={car} offer={primaryOffer} text={text} headingLevel={modelHeadingLevel} headingRef={modelHeadingRef} />
        <section className="border-y border-slate-200 bg-white py-5 sm:rounded-[13px] sm:border sm:p-6 sm:shadow-[0_3px_15px_rgba(15,23,42,0.04)]"><Heading level={sectionHeadingLevel} className="text-lg font-bold tracking-[-0.015em] text-[#102A43] sm:text-xl">{copy("carDetails.pickupReturn")}</Heading><div className="relative mt-4 grid gap-5 md:grid-cols-2 md:gap-6">
          {[[copy("carDetails.pickup"), car.pickupLocation, search.pickupDate, search.pickupTime], [copy("carDetails.return"), car.returnLocation, search.dropoffDate, search.dropoffTime]].map(([label, location, date, time]) => <div key={label} className="relative border-s-2 border-blue-200 ps-5"><span className="absolute -start-[7px] top-1 size-3 rounded-full bg-[#004BB8]"/><Heading level={itemHeadingLevel} className="font-bold">{label}</Heading><p className="mt-1 flex gap-2 text-sm"><MapPin size={16} className="shrink-0 text-[#004BB8]"/>{location || copy("carDetails.locationUnavailable")}</p><p className="mt-1 flex gap-2 text-sm text-slate-600"><Clock3 size={16}/><time dateTime={`${date}T${time}`}>{formatCarDate(date, locale)}{time ? ` · ${time}` : ""}</time></p></div>)}
        </div><p className="mt-4 text-sm font-medium">{pickupTypeLabels[car.pickupType]}{car.shuttleRequired ? ` · ${copy("carDetails.shuttleRequired")}` : ""}</p>{car.pickupInstructions && <p className="mt-2 text-sm"><strong>{copy("carDetails.pickupInstructions")}:</strong> {car.pickupInstructions}</p>}</section>
      </div>
      {primaryOffer && <aside className={presentation === "standalone-content" ? "hidden self-start lg:sticky lg:top-24 lg:block" : "self-start lg:sticky lg:top-24"}><BookingSummary offer={primaryOffer} days={days} price={price} copy={copy} action={primaryAction}/></aside>}
    </div>
    {presentation === "standalone-content" && primaryOffer ? <MobileBookingDock offer={primaryOffer} days={days} price={price} copy={copy} action={primaryAction} /> : null}
  </div>;
}

export function CarDetailsClient({ car, search, resultsHref }: { car: NormalizedCarResult; search: CarSearchParams; resultsHref: string }) {
  const { t } = useLocale(); const copy = (key: string) => t[key] || enTranslations[key] || key;
  return <main className="flex-1 bg-white pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:bg-surface-muted/40 lg:pb-0"><section className="bg-white lg:border-b lg:border-border lg:pb-14"><div className="page-shell py-2 sm:py-7"><DetailsBackLink href={resultsHref} className="text-[#075EE8] hover:text-[#004BB8]">{copy("carDetails.backToResults")}</DetailsBackLink><div className="mt-2 sm:mt-5"><CarDetailsExperience car={car} search={search} presentation="standalone-content" primaryAction={{ kind: "standalone-disabled-provider", label: copy("continueToProvider") }} /></div></div></section></main>;
}

function BookingSummary({ offer, days, price, copy, action }: { offer: CarOffer; days: number; price: PriceFn; copy: (k: string) => string; action: CarDetailsPrimaryAction }) {
  const daily = price(offer.pricePerDay, offer.currency), total = price(offer.totalPrice, offer.currency);
  return <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{copy("carDetails.bookingSummary")}</p><p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-xl font-extrabold tabular-nums text-[#102A43] sm:text-2xl" dir="ltr" title={total.title} aria-label={total.ariaLabel}>{total.formatted}</p><p className="text-sm text-slate-500">{days} {days === 1 ? copy("carDetails.day") : copy("carDetails.days")}</p><p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm tabular-nums text-slate-600" dir="ltr" title={daily.title} aria-label={daily.ariaLabel}>{daily.formatted} {copy("carsResults.perDay")}</p>{action.kind === "standalone-disabled-provider" ? <button disabled className="mt-5 w-full rounded-lg bg-teal-dark px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{action.label}</button> : <div className="mt-5" aria-live="polite"><button id={getDealsGuidedConfirmationActionId("car")} type="button" disabled={!action.enabled || action.pending} aria-label={action.accessibleLabel} onClick={action.onActivate} className="focus-ring min-h-11 w-full rounded-lg bg-teal-dark px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{action.pending ? copy("deals.guided.carDetails.saving") : action.label}</button>{(!action.enabled && !action.error) ? <p className="mt-2 text-sm text-slate-600">{action.unavailableMessage}</p> : null}{action.error ? <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{action.error}</p> : null}</div>}</div>;
}

function MobileBookingDock({ offer, days, price, copy, action }: { offer: CarOffer; days: number; price: PriceFn; copy: (k: string) => string; action: CarDetailsPrimaryAction }) {
  const daily = price(offer.pricePerDay, offer.currency), total = price(offer.totalPrice, offer.currency);
  return <section className="fixed inset-x-0 bottom-0 z-[90] rounded-t-[22px] border-t border-slate-200 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_28px_rgba(15,23,42,0.14)] lg:hidden" aria-labelledby="mobile-car-rental-total-heading" data-mobile-car-booking-dock>
    <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_minmax(132px,0.9fr)] items-center gap-3">
      <div className="min-w-0"><h2 id="mobile-car-rental-total-heading" className="text-[11px] font-semibold leading-4 text-slate-600">{copy("carDetails.bookingSummary")}</h2><p className="truncate text-[clamp(1.25rem,6vw,1.5rem)] font-extrabold leading-tight text-slate-950" dir="ltr" title={total.title} aria-label={total.ariaLabel}>{total.formatted}</p><p className="truncate text-[11px] text-slate-600"><span>{days} {days === 1 ? copy("carDetails.day") : copy("carDetails.days")}</span><span aria-hidden="true"> · </span><span dir="ltr" title={daily.title} aria-label={daily.ariaLabel}>{daily.formatted} {copy("carsResults.perDay")}</span></p></div>
      {action.kind === "standalone-disabled-provider" ? <button disabled className="min-h-12 w-full rounded-lg bg-teal-dark px-3 text-xs font-bold leading-4 text-white disabled:cursor-not-allowed disabled:opacity-60">{action.label}</button> : null}
    </div>
  </section>;
}
