import {
  BriefcaseBusiness,
  CarFront,
  DoorOpen,
  Fuel,
  Gauge,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Snowflake,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CarResultImage } from "@/components/results/CarResultImage";
import type { CarOffer, NormalizedCarResult } from "@/lib/cars/types";
import {
  fuelPolicyLabels,
  pickupTypeLabels,
  transmissionLabels,
} from "./helpers";

export function CarDetailsHero({
  car,
  offer,
  text,
  overlay,
}: {
  car: NormalizedCarResult;
  offer?: CarOffer;
  text: Record<string, string>;
  overlay: ReactNode;
}) {
  const specs: Array<[LucideIcon, string]> = [
    [Users, `${car.passengers} ${text.passengers}`],
    [BriefcaseBusiness, `${car.bags} ${text.bags}`],
    [DoorOpen, `${car.doors} ${text.doors}`],
    [CarFront, transmissionLabels[car.transmission]],
    [
      Gauge,
      car.mileagePolicy === "unlimited"
        ? text.unlimitedMileage
        : `${car.limitedMileageKm ?? "—"} km ${text.included}`,
    ],
    [Fuel, fuelPolicyLabels[car.fuelPolicy]],
    [MapPin, pickupTypeLabels[car.pickupType]],
  ];
  if (car.airConditioning)
    specs.splice(4, 0, [Snowflake, text.airConditioning]);
  return (
    <section className="border-y border-slate-200 bg-white py-4 sm:rounded-[13px] sm:border sm:p-6 sm:shadow-[0_3px_15px_rgba(15,23,42,0.04)]">
      <div
        className="px-4 pb-3 md:hidden"
        data-car-details-mobile-header
      >
        {overlay}
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:items-start md:gap-6">
        <figure className="min-w-0">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[11px] bg-slate-100 sm:aspect-[4/3] sm:rounded-xl">
            <CarResultImage
              imageUrl={car.imageUrl}
              imageAlt={car.imageAlt}
              modelName={car.modelName}
              category={car.category}
              sizes="(min-width: 1024px) 420px, (min-width: 768px) 50vw, 100vw"
              fit="cover"
              priority
            />
            <div className="absolute inset-x-0 top-0 z-10 hidden bg-gradient-to-b from-slate-950/80 via-slate-950/35 to-transparent px-4 pb-12 pt-3.5 md:block md:px-5 md:pt-4">
              {overlay}
            </div>
          </div>
        </figure>
        <div className="min-w-0">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2 sm:flex sm:flex-wrap sm:gap-2">
            {specs.map(([Icon, label]) => (
              <li
                key={label}
                className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700 sm:rounded-lg sm:bg-slate-100 sm:px-2.5 sm:py-1.5"
              >
                <Icon
                  size={15}
                  className="shrink-0 text-[#075EE8]"
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate sm:overflow-visible sm:whitespace-normal">
                  {label}
                </span>
              </li>
            ))}
          </ul>
          {offer && (
            <dl
              data-car-benefits
              className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3"
            >
              <div className="flex min-w-0 items-center gap-2.5 rounded-[10px] bg-slate-50 p-3 sm:gap-3 sm:border sm:border-slate-200">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${offer.freeCancellation ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                >
                  <ShieldCheck size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-slate-500">
                    {text.cancellation}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold leading-snug text-slate-800">
                    {offer.freeCancellation
                      ? text.freeCancellation
                      : text.nonRefundable}
                  </dd>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-2.5 rounded-[10px] bg-slate-50 p-3 sm:gap-3 sm:border sm:border-slate-200">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${offer.taxesAndFeesIncluded ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                >
                  <ReceiptText size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-slate-500">
                    {text.taxesFees}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold leading-snug text-slate-800">
                    {offer.taxesAndFeesIncluded
                      ? text.includedShort
                      : text.notIncluded}
                  </dd>
                </div>
              </div>
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
