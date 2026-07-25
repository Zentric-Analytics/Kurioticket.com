import { BriefcaseBusiness, CarFront, DoorOpen, Fuel, Gauge, MapPin, Snowflake, Star, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CarResultImage } from "@/components/results/CarResultImage";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { fuelPolicyLabels, pickupTypeLabels, transmissionLabels } from "./helpers";

export function CarDetailsHero({ car, text }: { car: NormalizedCarResult; text: Record<string, string> }) {
  const specs: Array<[LucideIcon, string]> = [
    [Users, `${car.passengers} ${text.passengers}`], [BriefcaseBusiness, `${car.bags} ${text.bags}`],
    [DoorOpen, `${car.doors} ${text.doors}`], [CarFront, transmissionLabels[car.transmission]],
    [Gauge, car.mileagePolicy === "unlimited" ? text.unlimitedMileage : `${car.limitedMileageKm ?? "—"} km ${text.included}`],
    [Fuel, fuelPolicyLabels[car.fuelPolicy]], [MapPin, pickupTypeLabels[car.pickupType]],
  ];
  if (car.airConditioning) specs.splice(4, 0, [Snowflake, text.airConditioning]);
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <figure className="min-w-0"><div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100"><CarResultImage imageUrl={car.imageUrl} imageAlt={car.imageAlt} modelName={car.modelName} category={car.category} sizes="(min-width: 1024px) 420px, (min-width: 768px) 50vw, 100vw" fit="cover" priority /></div><figcaption className="mt-2 text-center text-xs text-slate-500">{text.representativeVehicle}</figcaption></figure>
      <div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#004BB8]">{car.categoryLabel}</p><h1 className="mt-1 text-2xl font-extrabold text-[#102A43] sm:text-3xl">{car.modelName}</h1>{car.orSimilar && <p className="mt-1 text-sm text-slate-600">{text.orSimilar}</p>}</div>{car.isDemo && <span className="rounded-full bg-[#eaf2fb] px-3 py-1 text-xs font-bold text-[#004BB8]">{text.demoVehicle}</span>}</div>
      {car.supplierRating !== undefined && <p className="mt-3 flex items-center gap-1 text-sm"><Star size={16} className="fill-amber-400 text-amber-400" aria-hidden="true" /><strong>{car.supplierRating.toFixed(1)}</strong>{car.supplierReviewCount !== undefined && <span className="text-slate-500">({car.supplierReviewCount} {text.reviews})</span>}</p>}
      <ul className="mt-5 flex flex-wrap gap-2">{specs.map(([Icon,label]) => <li key={label} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700"><Icon size={15} className="text-[#004BB8]" aria-hidden="true" />{label}</li>)}</ul></div>
    </div>
  </section>;
}
