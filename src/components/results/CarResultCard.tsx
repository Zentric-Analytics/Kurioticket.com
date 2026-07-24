import Link from "next/link";
import { BriefcaseBusiness, CarFront, Check, DoorOpen, Fuel, Gauge, MapPin, Snowflake, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CarResultImage } from "@/components/results/CarResultImage";
import type { CarResultBadge } from "@/lib/cars/carResults";
import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import type { NormalizedCarResult } from "@/lib/cars/types";

const title = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function CarResultCard({ car, badge, detailsHref }: { car: NormalizedCarResult; badge?: CarResultBadge; detailsHref: string }) {
  const offer = getPrimaryCarOffer(car);
  if (!offer) return null;
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: offer.currency, maximumFractionDigits: 0 }).format(value);
  const specifications: Array<[LucideIcon, string]> = [
    [Users, `${car.passengers} passengers`],
    [BriefcaseBusiness, `${car.bags} bags`],
    [DoorOpen, `${car.doors} doors`],
    [CarFront, title(car.transmission)],
  ];
  if (car.airConditioning) specifications.push([Snowflake, "Air conditioning"]);

  return (
    <article className="relative w-full overflow-hidden rounded-2xl border border-[#D8E1EC] bg-white shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)] transition duration-200 hover:-translate-y-0.5 hover:border-[#CBD6E2] hover:shadow-[0_18px_38px_-26px_rgba(15,23,42,0.42)]">
      <div className="grid md:grid-cols-[250px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)_205px] xl:grid-cols-[270px_minmax(0,1fr)_205px]">
        <div className="flex items-center border-b border-[#E2E8F0] bg-slate-50 p-2.5 md:border-b-0 md:border-e">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100">
            <CarResultImage imageUrl={car.imageUrl} imageAlt={car.imageAlt} modelName={car.modelName} category={car.category} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-4">
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#004BB8]">{car.categoryLabel}</p>
              <h2 className="mt-1 break-words text-[22px] font-extrabold leading-tight text-[#102A43]">
                {car.modelName}
              </h2>
            </div>
            {badge && <span className="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-md bg-[#EAF2FB] px-2 py-0.5 text-xs font-semibold text-[#004BB8]"><Sparkles size={13} aria-hidden="true" />{badge}</span>}
          </header>

          <p className="mt-1.5 flex min-w-0 items-center gap-2 text-sm text-slate-600">
            <MapPin
              size={16}
              className="shrink-0 text-[#004BB8]"
              aria-hidden="true"
            />
            <span className="min-w-0 whitespace-normal md:whitespace-nowrap">
              <strong className="font-semibold text-slate-700">
                {title(car.pickupType)}
              </strong>
              {" · "}
              {car.pickupLocation}
              {car.shuttleRequired ? " · Shuttle required" : ""}
            </span>
          </p>

          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-sm font-medium text-slate-600">
            {specifications.map(([Icon, label]) => <li key={label} className="flex items-center gap-1.5"><Icon size={16} className="shrink-0 text-slate-500" aria-hidden="true" />{label}</li>)}
          </ul>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex min-h-6 items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"><Gauge size={13} aria-hidden="true" />{car.mileagePolicy === "unlimited" ? "Unlimited mileage" : `${car.limitedMileageKm} km included`}</span>
            <span className="inline-flex min-h-6 items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"><Fuel size={13} aria-hidden="true" />{title(car.fuelPolicy)}</span>
            {offer.freeCancellation && <span className="inline-flex min-h-6 items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><Check size={13} aria-hidden="true" />Free cancellation</span>}
            {offer.payAtPickup && <span className="inline-flex min-h-6 items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><Check size={13} aria-hidden="true" />Pay at pickup</span>}
          </div>
        </div>

        <div className="col-span-full flex min-w-0 flex-col border-t border-[#E2E8F0] bg-slate-50/45 p-4 lg:col-span-1 lg:border-s lg:border-t-0 lg:bg-white lg:text-end">
          <div className="space-y-2.5">
            {car.offers.length > 1 && <p className="w-full text-xs font-semibold text-[#004BB8]">{car.offers.length} offers available</p>}
            <div><p className="text-xs font-medium text-slate-500">Price per day</p><p className="mt-0.5 text-lg font-bold text-slate-700">{money(offer.pricePerDay)}</p></div>
            <div><p className="text-xs font-medium text-slate-500">Total</p><p className="break-words text-[28px] font-extrabold leading-none text-[#102A43]">{money(offer.totalPrice)}</p>{offer.taxesAndFeesIncluded && <p className="mt-1.5 text-xs text-slate-500">Taxes and fees included</p>}</div>
          </div>
          <Link href={detailsHref} className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#004BB8] px-5 text-sm font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 focus-visible:ring-offset-2 lg:mt-auto">View car</Link>
        </div>
      </div>
    </article>
  );
}
