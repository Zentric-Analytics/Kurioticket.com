import { Award, Bed, Laptop, Sparkles, UtensilsCrossed, Wifi, Wine, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";

function iconFor(item: HotelAmenityPresentationItem): LucideIcon {
  if (item.iconKey === "wifi") return Wifi;
  if (item.iconKey === "restaurant") return UtensilsCrossed;
  if (item.iconKey === "workspace") return Laptop;
  if (/bar|lounge/i.test(item.label)) return Wine;
  if (/bed|room/i.test(item.label)) return Bed;
  return Sparkles;
}

export function HotelAboutSection({
  description,
  amenities,
  starRating,
  propertyType,
  roomSummary,
  bedSummary,
  accessibility = [],
  mobilePolicies = [],
  providerRoomName = "",
  mobileAfterDescription,
}: {
  description: string;
  amenities: HotelAmenityPresentationItem[];
  starRating: number | null;
  propertyType?: string;
  roomSummary?: string;
  bedSummary?: string;
  accessibility?: string[];
  mobilePolicies?: string[];
  providerRoomName?: string;
  mobileAfterDescription?: ReactNode;
}) {
  const mobilePopularAmenities = amenities.slice(0, 4);
  const mobileRemainingAmenities = amenities.slice(4);
  const desktopHighlights = amenities.slice(0, 6);
  const desktopRemainingAmenities = amenities.slice(6);

  return (
    <section
      id="hotel-about"
      className="scroll-mt-16 border-b border-slate-200 px-4 py-6 lg:px-0 lg:py-10"
      aria-labelledby="hotel-about-heading"
      data-hotel-about-section
    >
      <h2
        id="hotel-about-heading"
        className="text-[18px] font-extrabold tracking-tight text-slate-950 sm:text-xl"
      >
        About this hotel
      </h2>
      {description ? (
        <p className="mt-2 text-[14px] leading-[21px] text-slate-600 sm:mt-3 sm:leading-6">
          {description}
        </p>
      ) : (
        <p className="mt-2 text-[14px] leading-5 text-slate-600 sm:mt-3">
          A property description is not available yet.
        </p>
      )}

      {mobilePolicies.length ? (
        <ul className="mt-3 space-y-1.5 text-[14px] leading-5 text-slate-600 lg:hidden" data-mobile-hotel-provider-policies>
          {mobilePolicies.map((policy) => (
            <li key={policy} className="flex items-start gap-2">
              <span aria-hidden="true" className="w-3 shrink-0">•</span>
              <span>{policy}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {mobileAfterDescription ? (
        <div className="-mx-4 mt-5 lg:hidden" data-mobile-hotel-overview-location-slot>
          {mobileAfterDescription}
        </div>
      ) : null}

      <div className="lg:hidden" data-mobile-hotel-overview-core>
        <h3 className="mt-5 text-[16px] font-bold leading-6 text-slate-950">
          Popular amenities
        </h3>
        {mobilePopularAmenities.length ? (
          <div className="mt-2 space-y-2" data-mobile-popular-amenities>
            {mobilePopularAmenities.map((item) => {
              const Icon = iconFor(item);
              return (
                <div key={item.key} className="flex min-h-7 items-center gap-2.5">
                  <Icon className="h-[18px] w-[18px] shrink-0 text-slate-700" strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-[14px] leading-5 text-slate-700">{item.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-[14px] leading-5 text-slate-600">
            Property highlights are not available yet.
          </p>
        )}

        {amenities.length > 4 ? (
          <details className="group mt-2" data-mobile-all-amenities>
            <summary className="focus-ring inline-flex min-h-11 cursor-pointer list-none items-center text-[14px] font-semibold text-blue [&::-webkit-details-marker]:hidden">
              See all amenities
            </summary>
            <ul className="grid grid-cols-1 gap-y-2 pb-1 text-[14px] leading-5 text-slate-700">
              {mobileRemainingAmenities.map((item) => {
                const Icon = iconFor(item);
                return (
                  <li key={item.key} className="flex items-center gap-2.5">
                    <Icon className="h-[18px] w-[18px] shrink-0 text-slate-700" strokeWidth={1.5} aria-hidden="true" />
                    <span>{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}

        <h3 className="mt-6 text-[16px] font-bold leading-6 text-slate-950">
          Room &amp; comfort
        </h3>
        <div className="mt-2 space-y-2 text-[14px] leading-5 text-slate-700">
          {roomSummary ? (
            <p className="flex items-start gap-2.5">
              <Bed className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-700" strokeWidth={1.5} aria-hidden="true" />
              <span>{roomSummary}</span>
            </p>
          ) : null}
          {bedSummary ? (
            <p className="flex items-start gap-2.5">
              <Bed className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-700" strokeWidth={1.5} aria-hidden="true" />
              <span>{bedSummary}</span>
            </p>
          ) : null}
          {providerRoomName && providerRoomName !== roomSummary && providerRoomName !== bedSummary ? (
            <p className="flex items-start gap-2.5">
              <Bed className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-700" strokeWidth={1.5} aria-hidden="true" />
              <span>{providerRoomName}</span>
            </p>
          ) : null}
          {!roomSummary && !bedSummary && !providerRoomName ? (
            <p>Room details are confirmed when you choose a room.</p>
          ) : null}
        </div>

        <h3 className="mt-6 text-[16px] font-bold leading-6 text-slate-950">
          Accessibility
        </h3>
        {accessibility.length ? (
          <ul className="mt-2 space-y-1.5 text-[14px] leading-[21px] text-slate-700">
            {accessibility.map((detail) => (
              <li key={detail} className="flex items-start gap-2">
                <span aria-hidden="true" className="w-3 shrink-0">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[14px] leading-[21px] text-slate-600">
            Specific accessibility features should be confirmed before booking.
          </p>
        )}
      </div>

      <div className="hidden lg:block" data-desktop-hotel-about-details>
        <h3 className="mt-7 text-base font-bold text-slate-950">Property highlights</h3>
        {desktopHighlights.length ? (
          <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-3" data-property-highlights>
            {desktopHighlights.map((item) => {
              const Icon = iconFor(item);
              return (
                <div key={item.key} className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Icon className="h-[18px] w-[18px] shrink-0 text-blue" aria-hidden="true" />
                  <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Property highlights are not available yet.</p>
        )}

        <h3 className="mt-7 text-base font-bold text-slate-950">All amenities</h3>
        {desktopRemainingAmenities.length ? (
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-700 lg:grid-cols-3">
            {desktopRemainingAmenities.map((item) => (
              <li key={item.key} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue" aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">All available amenities are shown in Property highlights.</p>
        )}

        <h3 className="mt-7 text-base font-bold text-slate-950">Room &amp; comfort</h3>
        <div className="mt-3 space-y-3 text-sm text-slate-700">
          {roomSummary ? <p className="flex items-start gap-3"><Bed className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-500" aria-hidden="true" /><span>{roomSummary}</span></p> : null}
          {bedSummary ? <p className="flex items-start gap-3"><Bed className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-500" aria-hidden="true" /><span>{bedSummary}</span></p> : null}
          {!roomSummary && !bedSummary ? <p>Room details are confirmed when you choose a room.</p> : null}
        </div>

        <h3 className="mt-7 text-base font-bold text-slate-950">Hotel information</h3>
        <div className="mt-3 space-y-3 text-sm text-slate-700">
          {propertyType ? <p className="flex items-center gap-3"><Award className="h-[18px] w-[18px] shrink-0 text-slate-500" aria-hidden="true" />{propertyType}</p> : null}
          <p className="flex items-center gap-3"><Award className="h-[18px] w-[18px] shrink-0 text-slate-500" aria-hidden="true" />{starRating ? `${starRating}-star classification` : "Hotel classification is not available."}</p>
        </div>

        <h3 className="mt-7 text-base font-bold text-slate-950">Accessibility</h3>
        {accessibility.length ? (
          <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-6 text-slate-700">
            {accessibility.map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-600">Specific accessibility features should be confirmed before booking.</p>
        )}
      </div>
    </section>
  );
}
