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
import type { ReactNode, Ref } from "react";
import { CarResultImage } from "@/components/results/CarResultImage";
import {
  AutomaticTransmissionIcon,
  ManualTransmissionIcon,
} from "@/components/results/CarTransmissionIcon";
import { getCarSpecificationIcon } from "@/components/results/carResultCardSpecs";
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
  imageStageRef,
  guidedMobileActions,
  reserveMobileControlSafeZone = false,
}: {
  car: NormalizedCarResult;
  text: Record<string, string>;
  identity: ReactNode;
  desktopOverlay: ReactNode;
  imageStageRef?: Ref<HTMLElement>;
  guidedMobileActions?: ReactNode;
  reserveMobileControlSafeZone?: boolean;
}) {
  const transmissionIcon = /manual/i.test(car.transmission)
    ? ManualTransmissionIcon
    : /automatic/i.test(car.transmission)
      ? AutomaticTransmissionIcon
      : CarFront;

  const normalizedSpecs: Array<[LucideIcon, string]> = [
    [Users, `${car.passengers} ${text.passengers}`],
    [BriefcaseBusiness, `${car.bags} ${text.bags}`],
    [DoorOpen, `${car.doors} ${text.doors}`],
    [transmissionIcon, transmissionLabels[car.transmission]],
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
    normalizedSpecs.splice(4, 0, [Snowflake, text.airConditioning]);
  // Zero/default normalized fields are not provider claims.
  const specs: Array<[LucideIcon, string]> = car.sandboxPresentation
    ? car.sandboxPresentation.specs.map((label) => [
        getCarSpecificationIcon(label),
        label,
      ])
    : normalizedSpecs;

  return (
    <section
      className="-mx-4 border-b border-slate-200 bg-[#F5F7FB] pb-4 sm:mx-0 lg:rounded-none lg:border-0 lg:bg-[#F5F7FB] lg:p-0 lg:shadow-none"
      data-car-details-hero
    >
      <div className="min-w-0">
        <figure
          ref={imageStageRef}
          className={`relative min-w-0 bg-white ${reserveMobileControlSafeZone ? "" : "pt-5"} lg:mx-auto lg:w-full lg:max-w-[760px] lg:overflow-hidden lg:rounded-[13px] lg:border lg:border-slate-200 lg:bg-white lg:p-5 lg:pt-5 lg:shadow-[0_3px_15px_rgba(15,23,42,0.04)]`}
          data-car-details-image-stage
        >
          <div
            className={`relative w-full overflow-hidden bg-white ${reserveMobileControlSafeZone ? "" : "h-[clamp(13.75rem,58vw,16rem)]"} lg:h-[clamp(20rem,32vw,27rem)] lg:rounded-xl lg:bg-white`}
          >
            {reserveMobileControlSafeZone ? (
              <div className="lg:hidden" data-car-details-mobile-native-image-stage>
                <div
                  className="h-[var(--car-details-mobile-header-boundary)]"
                  aria-hidden="true"
                  data-car-details-mobile-control-safe-zone
                />
                <div
                  className="h-[clamp(11rem,50vw,14rem)] pb-3"
                  data-car-details-mobile-vehicle-stage
                >
                  <div className="relative h-full w-full">
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
                </div>
              </div>
            ) : (
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
            )}
            <div
              className="absolute inset-0 hidden lg:block"
              data-car-details-desktop-centered-image
            >
              <CarResultImage
                imageUrl={car.imageUrl}
                imageAlt={car.imageAlt}
                modelName={car.modelName}
                category={car.category}
                sizes="760px"
                fit="contain"
                priority
              />
            </div>
          </div>
          {guidedMobileActions ? (
            <div className="absolute right-[max(1rem,env(safe-area-inset-right))] top-3 z-20 lg:hidden">
              {guidedMobileActions}
            </div>
          ) : null}
        </figure>

        <div className="min-w-0 px-4 pt-3.5 lg:px-0 lg:pt-5">
          <div className="lg:hidden" data-car-details-mobile-identity>
            {identity}
          </div>
          <div
            className="hidden min-w-0 items-start justify-between gap-5 lg:flex"
            data-car-details-desktop-identity-row
          >
            <div className="min-w-0 flex-1 [&_h1]:truncate [&_h2]:truncate [&_h3]:truncate [&_h4]:truncate">
              {identity}
            </div>
            <div
              className="shrink-0 [&>div>div:first-child]:hidden [&_button]:!border-slate-200 [&_button]:!bg-white [&_button]:!text-[#07133B] [&_button]:shadow-sm [&_button:hover]:!bg-slate-50 [&_button[aria-pressed=true]]:!text-rose-500"
              data-car-details-desktop-actions
            >
              {desktopOverlay}
            </div>
          </div>
          <ul
            className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 lg:flex lg:flex-wrap lg:gap-2"
            data-car-details-specifications
          >
            {specs.map(([Icon, label]) => {
              const mobileTransmissionIcon =
                Icon === AutomaticTransmissionIcon ||
                Icon === ManualTransmissionIcon;

              return (
                <li
                  key={label}
                  className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold leading-[18px] text-slate-700 lg:rounded-lg lg:bg-white lg:px-2.5 lg:py-1.5 lg:ring-1 lg:ring-slate-200"
                >
                  {mobileTransmissionIcon ? (
                    <>
                      <Icon
                        size={15}
                        className="shrink-0 text-slate-600 lg:hidden"
                        aria-hidden="true"
                      />
                      <CarFront
                        size={15}
                        className="hidden shrink-0 text-slate-600 lg:block"
                        aria-hidden="true"
                      />
                    </>
                  ) : (
                    <Icon
                      size={15}
                      className="shrink-0 text-slate-600"
                      aria-hidden="true"
                    />
                  )}
                  <span className="min-w-0 break-words">{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
