import { BriefcaseBusiness, CarFront, DoorOpen, Fuel, Gauge, MapPin, ReceiptText, ShieldCheck, Snowflake, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CarResultImage } from "@/components/results/CarResultImage";
import type { CarOffer, NormalizedCarResult } from "@/lib/cars/types";
import { fuelPolicyLabels, pickupTypeLabels, transmissionLabels } from "./helpers";

export function CarOfferBenefits({ offer, text }: { offer?: CarOffer; text: Record<string, string> }) {
  if (!offer) return null;
  const benefits: Array<[LucideIcon, string, string, boolean]> = [
    [ReceiptText, text.taxesFees, offer.taxesAndFeesIncluded ? text.included : text.notIncluded, offer.taxesAndFeesIncluded],
    [ShieldCheck, text.cancellation, offer.freeCancellation ? text.freeCancellation : text.nonRefundable, offer.freeCancellation],
  ];
  return <dl className="mt-4 grid gap-2.5 min-[390px]:grid-cols-2">
    {benefits.map(([Icon, label, value, positive]) => <div key={label} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${positive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}><Icon size={17} aria-hidden="true" /></span>
      <div className="min-w-0"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className={`mt-0.5 text-sm font-semibold leading-snug ${positive ? "text-emerald-800" : "text-slate-800"}`}>{value}</dd></div>
    </div>)}
  </dl>;
}

export function CarDetailsHero({ car, offer, text }: { car: NormalizedCarResult; offer?: CarOffer; text: Record<string, string> }) {
  const specs: Array<[LucideIcon, string]> = [
    [Users, `${car.passengers} ${text.passengers}`], [BriefcaseBusiness, `${car.bags} ${text.bags}`],
    [DoorOpen, `${car.doors} ${text.doors}`], [CarFront, transmissionLabels[car.transmission]],
    [Gauge, car.mileagePolicy === "unlimited" ? text.unlimitedMileage : `${car.limitedMileageKm ?? "—"} km ${text.included}`],
    [Fuel, fuelPolicyLabels[car.fuelPolicy]], [MapPin, pickupTypeLabels[car.pickupType]],
  ];
  if (car.airConditioning) specs.splice(4, 0, [Snowflake, text.airConditioning]);
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <figure className="min-w-0"><div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100"><CarResultImage imageUrl={car.imageUrl} imageAlt={car.imageAlt} modelName={car.modelName} category={car.category} sizes="(min-width: 1024px) 420px, (min-width: 768px) 50vw, 100vw" fit="cover" priority /></div></figure>
      <div className="min-w-0"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#004BB8]">{car.categoryLabel}</p><h1 className="mt-1 text-2xl font-extrabold text-[#102A43] sm:text-3xl">{car.modelName}</h1></div>
      <ul className="mt-5 flex flex-wrap gap-2">{specs.map(([Icon,label]) => <li key={label} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700"><Icon size={15} className="text-[#004BB8]" aria-hidden="true" />{label}</li>)}</ul>
      <CarOfferBenefits offer={offer} text={text} /></div>
    </div>
  </section>;
}
