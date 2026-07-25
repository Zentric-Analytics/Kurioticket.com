"use client";

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

export function CarDetailsClient({ car, search, resultsHref }: { car: NormalizedCarResult; search: CarSearchParams; resultsHref: string }) {
  const { locale, t } = useLocale();
  const { selectedOption } = useRegion();
  const rates = useCurrencyRates();
  const copy = (key: string) => t[key] || enTranslations[key] || key;
  const text = {
    passengers: copy("carsResults.passengers").toLowerCase(),
    bags: copy("carDetails.bags"),
    doors: copy("carsResults.doors").toLowerCase(),
    airConditioning: copy("carsResults.airConditioning"),
    unlimitedMileage: copy("carDetails.unlimitedMileage"),
    included: copy("carDetails.includedShort"),
  };
  const primaryOffer = getPrimaryCarOffer(car);
  const days = calculateRentalDays(search.pickupDate, search.dropoffDate);
  const price = (amount: number, currency: string) => formatDisplayPrice({ amount, sourceCurrency: currency, displayCurrency: selectedOption.currency, convertSourceEstimate: true, maximumFractionDigits: 0, rates: rates.rates, isFallbackRate: rates.isFallback });
  return <main className="flex-1 bg-[#f6f8fb] pb-32 lg:pb-14"><div className="page-shell py-5 sm:py-7"><DetailsBackLink href={resultsHref}>{copy("carDetails.backToResults")}</DetailsBackLink>
    <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <CarDetailsHero car={car} text={text} />
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><h2 className="text-xl font-bold text-[#102A43]">{copy("carDetails.pickupReturn")}</h2><div className="relative mt-5 grid gap-6 md:grid-cols-2">
          {[[copy("carDetails.pickup"),car.pickupLocation,search.pickupDate,search.pickupTime],[copy("carDetails.return"),car.returnLocation,search.dropoffDate,search.dropoffTime]].map(([label,location,date,time])=><div key={label} className="relative border-s-2 border-blue-200 ps-5"><span className="absolute -start-[7px] top-1 size-3 rounded-full bg-[#004BB8]"/><h3 className="font-bold">{label}</h3><p className="mt-1 flex gap-2 text-sm"><MapPin size={16} className="shrink-0 text-[#004BB8]"/>{location || copy("carDetails.locationUnavailable")}</p><p className="mt-1 flex gap-2 text-sm text-slate-600"><Clock3 size={16}/><time dateTime={`${date}T${time}`}>{formatCarDate(date, locale)}{time ? ` · ${time}` : ""}</time></p></div>)}</div><p className="mt-4 text-sm font-medium">{pickupTypeLabels[car.pickupType]}{car.shuttleRequired ? ` · ${copy("carDetails.shuttleRequired")}` : ""}</p>{car.pickupInstructions && <p className="mt-2 text-sm"><strong>{copy("carDetails.pickupInstructions")}:</strong> {car.pickupInstructions}</p>}</section>
      </div>
      {primaryOffer && <aside className="hidden lg:block lg:self-start"><BookingSummary offer={primaryOffer} days={days} price={price} copy={copy}/></aside>}
    </div></div>{primaryOffer && <MobileBar offer={primaryOffer} days={days} price={price} copy={copy}/>}</main>;
}

function Term({label,value,price}:{label:string;value:string;price?:ReturnType<typeof formatDisplayPrice>}) { return <div><dt className="text-sm font-semibold text-slate-500">{label}</dt>{price ? <dd className="mt-1 whitespace-nowrap font-semibold tabular-nums" dir="ltr" title={price.title} aria-label={price.ariaLabel}>{value}</dd> : <dd className="mt-1 font-semibold">{value}</dd>}</div> }
type PriceFn=(amount:number,currency:string)=>ReturnType<typeof formatDisplayPrice>;
function BookingSummary({offer,days,price,copy}:{offer:CarOffer;days:number;price:PriceFn;copy:(k:string)=>string}) { const daily=price(offer.pricePerDay,offer.currency),total=price(offer.totalPrice,offer.currency); return <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{copy("carDetails.bookingSummary")}</p><p className="mt-3 whitespace-nowrap text-2xl font-extrabold tabular-nums text-[#102A43]" dir="ltr" title={total.title} aria-label={total.ariaLabel}>{total.formatted}</p><p className="text-sm text-slate-500">{days} {days===1?copy("carDetails.day"):copy("carDetails.days")}</p><p className="mt-1 whitespace-nowrap text-sm tabular-nums text-slate-600" dir="ltr" title={daily.title} aria-label={daily.ariaLabel}>{daily.formatted} {copy("carsResults.perDay")}</p><dl className="mt-4 space-y-3 border-t pt-4 text-sm"><Term label={copy("carsResults.rentalCompany")} value={offer.rentalCompanyName}/><Term label={copy("carsResults.bookingProvider")} value={offer.bookingProviderName}/><Term label={copy("carDetails.cancellation")} value={offer.freeCancellation?copy("carDetails.freeCancellation"):copy("carDetails.nonRefundable")}/><Term label={copy("carDetails.payment")} value={offer.payAtPickup?copy("carDetails.payAtPickup"):copy("carDetails.prepaid")}/><Term label={copy("carDetails.taxesFees")} value={offer.taxesAndFeesIncluded?copy("carDetails.includedShort"):copy("carDetails.notIncluded")}/></dl><button disabled className="mt-5 w-full rounded-lg bg-slate-200 px-4 py-3 font-bold text-slate-600 disabled:cursor-not-allowed">{copy("continueToProvider")}</button></div> }
function MobileBar({offer,days,price,copy}:{offer:CarOffer;days:number;price:PriceFn;copy:(k:string)=>string}) { const total=price(offer.totalPrice,offer.currency); return <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-3 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,.1)] lg:hidden"><div className="page-shell flex min-w-0 items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs text-slate-500">{days} {days===1?copy("carDetails.day"):copy("carDetails.days")} · {offer.bookingProviderName}</p><p className="whitespace-nowrap text-lg font-extrabold tabular-nums text-[#102A43]" dir="ltr" title={total.title} aria-label={total.ariaLabel}>{total.formatted}</p></div><button disabled className="shrink-0 rounded-lg bg-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600">{copy("continueToProvider")}</button></div></div> }
