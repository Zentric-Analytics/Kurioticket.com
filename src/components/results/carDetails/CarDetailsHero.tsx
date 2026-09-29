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
  desktopBackControl,
  desktopImageActions,
  imageStageRef,
  guidedMobileActions,
  reserveMobileControlSafeZone = false,
}: {
  car: NormalizedCarResult;
  text: Record<string, string>;
  identity: ReactNode;
  desktopOverlay?: ReactNode;
  desktopBackControl?: ReactNode;
  desktopImageActions?: ReactNode;
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
    <section className="-mx-4 border-b border-slate-200 bg-[#F5F7FB] pb-4 sm:mx-0 lg:rounded-[13px] lg:border lg:bg-white lg:p-6 lg:shadow-[0_3px_15px_rgba(15,23,42,0.04)]">
      {reserveMobileControlSafeZone ? (
        <style>{`
          @media (min-width: 1024px) {
            [data-car-details-experience] {
              padding-bottom: 7rem;
            }

            [data-car-details-experience] > div.grid {
              display: block;
            }

            [data-car-details-experience] > div.grid > aside {
              display: block !important;
              position: fixed !important;
              inset-inline: 0;
              bottom: 0;
              top: auto !important;
              z-index: 90;
              width: 100%;
              padding: 0.75rem 1.5rem;
              border-top: 1px solid #e2e8f0;
              background: rgba(255, 255, 255, 0.98);
              box-shadow: 0 -8px 28px rgba(15, 23, 42, 0.12);
              backdrop-filter: blur(14px);
            }

            [data-car-details-experience] > div.grid > aside > div {
              display: grid;
              grid-template-columns: minmax(180px, auto) minmax(0, 1fr) minmax(180px, 240px);
              grid-template-rows: auto auto;
              column-gap: 2rem;
              align-items: center;
              width: 100%;
              max-width: 1180px;
              margin: 0 auto;
              padding: 0;
              border: 0;
              border-radius: 0;
              background: transparent;
              box-shadow: none;
            }

            [data-car-details-experience] > div.grid > aside > div > p:nth-child(1) {
              grid-column: 1;
              grid-row: 2;
              margin: 0;
              font-size: 0.75rem;
              line-height: 1rem;
              color: #56658e;
            }

            [data-car-details-experience] > div.grid > aside > div > p:nth-child(2) {
              grid-column: 1;
              grid-row: 1;
              margin: 0;
              font-size: 1.25rem;
              line-height: 1.5rem;
              color: #071a48;
            }

            [data-car-details-experience] > div.grid > aside > div > p:nth-child(3) {
              grid-column: 2;
              grid-row: 1;
              margin: 0;
              align-self: end;
              font-size: 0.8125rem;
              line-height: 1.125rem;
              color: #475569;
            }

            [data-car-details-experience] > div.grid > aside > div > p:nth-child(4) {
              grid-column: 2;
              grid-row: 2;
              margin: 0;
              align-self: start;
              font-size: 0.75rem;
              line-height: 1rem;
              color: #56658e;
            }

            [data-car-details-experience] > div.grid > aside > div > a,
            [data-car-details-experience] > div.grid > aside > div > button,
            [data-car-details-experience] > div.grid > aside > div > div {
              grid-column: 3;
              grid-row: 1 / span 2;
              width: 100%;
              margin-top: 0 !important;
              align-self: center;
            }
          }
        `}</style>
      ) : null}
      <div className="min-w-0">
        <figure
          ref={imageStageRef}
          className={`relative min-w-0 bg-white ${reserveMobileControlSafeZone ? "" : "pt-5"} lg:mx-auto lg:w-full lg:max-w-[760px] lg:pt-0`}
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
          {desktopBackControl ? (
            <div
              className="absolute left-4 top-4 z-30 hidden lg:block"
              data-car-details-desktop-back
            >
              {desktopBackControl}
            </div>
          ) : null}
          {desktopImageActions ? (
            <div
              className="absolute right-4 top-4 z-30 hidden lg:block"
              data-car-details-desktop-hero-actions
            >
              {desktopImageActions}
            </div>
          ) : null}
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
            {desktopOverlay ? (
              <div
                className="shrink-0 [&>div>div:first-child]:hidden [&_button]:!border-slate-200 [&_button]:!bg-white [&_button]:!text-[#07133B] [&_button]:shadow-sm [&_button:hover]:!bg-slate-50 [&_button[aria-pressed=true]]:!text-rose-500"
                data-car-details-desktop-actions
              >
                {desktopOverlay}
              </div>
            ) : null}
          </div>
          <ul
            className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 lg:mx-auto lg:max-w-[760px] lg:grid-cols-2 lg:gap-x-10 lg:gap-y-3"
            data-car-details-specifications
          >
            {specs.map(([Icon, label]) => {
              const mobileTransmissionIcon =
                Icon === AutomaticTransmissionIcon ||
                Icon === ManualTransmissionIcon;

              return (
                <li
                  key={label}
                  className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold leading-[18px] text-slate-700 lg:rounded-lg lg:bg-slate-100 lg:px-2.5 lg:py-1.5"
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
