import type { Ref } from "react";
import { BriefcaseBusiness, CarFront, DoorOpen, Fuel, Gauge, MapPin, ReceiptText, ShieldCheck, Snowflake, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CarResultImage } from "@/components/results/CarResultImage";
import type { CarOffer, NormalizedCarResult } from "@/lib/cars/types";
import { fuelPolicyLabels, pickupTypeLabels, transmissionLabels } from "./helpers";

export function CarDetailsHero({ car, offer, text, headingLevel = 1, headingRef }: { car: NormalizedCarResult; offer?: CarOffer; text: Record<string, string>; headingLevel?: 1 | 2 | 3 | 4; headingRef?: Ref<HTMLHeadingElement> }) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3" | "h4";
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
      <div className="min-w-0"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#004BB8]">{car.categoryLabel}</p><Heading ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="mt-1 scroll-mt-24 text-2xl font-extrabold text-[#102A43] outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8] sm:text-3xl">{car.modelName}</Heading></div>
      <ul className="mt-5 flex flex-wrap gap-2">{specs.map(([Icon,label]) => <li key={label} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700"><Icon size={15} className="text-[#004BB8]" aria-hidden="true" />{label}</li>)}</ul>
      {offer && <dl data-car-benefits className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${offer.freeCancellation ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}><ShieldCheck size={18} aria-hidden="true" /></span>
          <div className="min-w-0"><dt className="text-xs font-medium text-slate-500">{text.cancellation}</dt><dd className="mt-0.5 text-sm font-semibold leading-snug text-slate-800">{offer.freeCancellation ? text.freeCancellation : text.nonRefundable}</dd></div>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${offer.taxesAndFeesIncluded ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}><ReceiptText size={18} aria-hidden="true" /></span>
          <div className="min-w-0"><dt className="text-xs font-medium text-slate-500">{text.taxesFees}</dt><dd className="mt-0.5 text-sm font-semibold leading-snug text-slate-800">{offer.taxesAndFeesIncluded ? text.includedShort : text.notIncluded}</dd></div>
        </div>
      </dl>}
      </div>
    </div>
  </section>;
}
