import Link from "next/link";
import { BriefcaseBusiness, Car, Check, Fuel, MapPin, Snowflake, Star, Users } from "lucide-react";
import type { CarResultBadge } from "@/lib/cars/carResults";
import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import type { NormalizedCarResult } from "@/lib/cars/types";

const title = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function CarResultCard({ car, badge, detailsHref }: { car: NormalizedCarResult; badge?: CarResultBadge; detailsHref: string }) {
  const offer = getPrimaryCarOffer(car);
  if (!offer) return null;
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: offer.currency, maximumFractionDigits: 0 }).format(value);
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_38px_-28px_rgba(2,28,43,.25)]">
      <div className="grid md:grid-cols-[210px_minmax(0,1fr)_190px]">
        <div className="flex min-h-44 items-center justify-center bg-gradient-to-br from-slate-100 to-[#eaf2fb] p-6" role="img" aria-label={car.imageAlt}>
          <Car className="h-24 w-24 text-[#004BB8]/70" strokeWidth={1.25} aria-hidden="true" />
        </div>
        <div className="min-w-0 p-4">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#004BB8]">{car.categoryLabel}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{car.modelName} {car.orSimilar && <span className="text-sm font-medium text-slate-500">or similar</span>}</h2></div>
            {badge && <span className="shrink-0 rounded-full bg-[#eaf2fb] px-2.5 py-1 text-xs font-bold text-[#004BB8]">{badge}</span>}
          </header>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-1.5"><Users size={16} aria-hidden="true" />{car.passengers} passengers</li>
            <li className="flex items-center gap-1.5"><BriefcaseBusiness size={16} aria-hidden="true" />{car.bags} bags</li>
            <li>{car.doors} doors</li><li>{title(car.transmission)}</li>
            {car.airConditioning && <li className="flex items-center gap-1.5"><Snowflake size={16} aria-hidden="true" />Air conditioning</li>}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{car.mileagePolicy === "unlimited" ? "Unlimited mileage" : `${car.limitedMileageKm} km included`}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1"><Fuel size={13} className="inline me-1" aria-hidden="true" />{title(car.fuelPolicy)}</span>
            {offer.freeCancellation && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700"><Check size={13} className="inline me-1" aria-hidden="true" />Free cancellation</span>}
            {offer.payAtPickup && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Pay at pickup</span>}
          </div>
          <p className="mt-4 flex items-start gap-1.5 text-sm text-slate-600"><MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{title(car.pickupType)} · {car.pickupLocation}{car.shuttleRequired ? " · Shuttle required" : ""}</span></p>
          <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600"><p><strong>Rental company:</strong> {car.rentalCompanyName}</p><p><strong>Booking provider:</strong> {offer.bookingProviderName}</p>{car.supplierRating !== undefined && <p className="mt-1 flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" aria-hidden="true" /><strong>{car.supplierRating.toFixed(1)}</strong>{car.supplierReviewCount !== undefined ? ` (${car.supplierReviewCount} reviews)` : ""}</p>}</div>
        </div>
        <div className="flex flex-col justify-end border-t border-slate-200 p-4 text-end md:border-s md:border-t-0">
          {car.offers.length > 1 && <p className="text-xs font-semibold text-slate-500">{car.offers.length} offers</p>}
          <p className="mt-2 text-sm text-slate-600">{money(offer.pricePerDay)} per day</p><p className="text-2xl font-extrabold text-slate-950"><span className="sr-only">Total </span>{money(offer.totalPrice)}</p>
          {offer.taxesAndFeesIncluded && <p className="mt-1 text-xs text-slate-500">Taxes and fees included</p>}
          <Link href={detailsHref} className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-[#004BB8] px-4 font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40">View car</Link>
        </div>
      </div>
    </article>
  );
}
