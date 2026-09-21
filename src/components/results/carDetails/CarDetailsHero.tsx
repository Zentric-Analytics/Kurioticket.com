import {
  BriefcaseBusiness,
  CarFront,
  DoorOpen,
  Fuel,
  Gauge,
  MapPin,
  Snowflake,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CarResultImage } from "@/components/results/CarResultImage";
import type { NormalizedCarResult } from "@/lib/cars/types";
import {
  fuelPolicyLabels,
  pickupTypeLabels,
  transmissionLabels,
} from "./helpers";

export function CarDetailsHero({
  car,
  text,
  identity,
  desktopOverlay,
  mobileBackControl,
  mobileActions,
}: {
  car: NormalizedCarResult;
  text: Record<string, string>;
  identity: ReactNode;
  desktopOverlay: ReactNode;
  mobileBackControl?: ReactNode;
  mobileActions: ReactNode;
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
    <section className="-mx-4 border-b border-slate-200 bg-[#F5F7FB] pb-4 sm:mx-0 lg:rounded-[13px] lg:border lg:bg-white lg:p-6 lg:shadow-[0_3px_15px_rgba(15,23,42,0.04)]">
      <div className="grid gap-0 lg:grid-cols-2 lg:items-start lg:gap-6">
        <figure
          className="relative min-w-0 bg-white"
          data-car-details-image-stage
        >
          <div className="relative h-[clamp(13.75rem,58vw,16rem)] w-full overflow-hidden bg-white lg:aspect-[4/3] lg:h-auto lg:rounded-xl lg:bg-slate-100">
            <div className="absolute inset-0 lg:hidden">
              <CarResultImage
                imageUrl={car.imageUrl}
                imageAlt={car.imageAlt}
                modelName={car.modelName}
                category={car.category}
                sizes="100vw"
                fit="contain"
                priority
              />
            </div>
            <div className="absolute inset-0 hidden lg:block">
              <CarResultImage
                imageUrl={car.imageUrl}
                imageAlt={car.imageAlt}
                modelName={car.modelName}
                category={car.category}
                sizes="420px"
                fit="cover"
                priority
              />
            </div>
            <div className="absolute inset-x-0 top-0 z-10 hidden bg-gradient-to-b from-slate-950/80 via-slate-950/35 to-transparent px-5 pb-12 pt-4 lg:block">
              {desktopOverlay}
            </div>
          </div>
          <div
            className="absolute inset-x-0 top-0 z-20 flex items-start justify-between pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3 lg:hidden"
            data-car-details-mobile-controls
          >
            {mobileBackControl}
            {mobileActions}
          </div>
        </figure>
        <div className="min-w-0 px-4 pt-3.5 lg:px-0 lg:pt-0">
          <div className="lg:hidden" data-car-details-mobile-identity>
            {identity}
          </div>
          <ul
            className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 lg:mt-0 lg:flex lg:flex-wrap lg:gap-2"
            data-car-details-specifications
          >
            {specs.map(([Icon, label]) => (
              <li
                key={label}
                className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold leading-[18px] text-slate-700 lg:rounded-lg lg:bg-slate-100 lg:px-2.5 lg:py-1.5"
              >
                <Icon
                  size={15}
                  className="shrink-0 text-slate-600"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
