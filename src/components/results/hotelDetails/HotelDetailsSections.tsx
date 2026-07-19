import {
  AirVent, Armchair, BedDouble, Bike, BusFront, CircleDot, CircleParking,
  Clock3, Coffee, ConciergeBell, CookingPot, CreditCard, Database, Dumbbell,
  Flower2, Laptop, MapPin, ReceiptText, ShieldCheck, Sparkles, Trees,
  UtensilsCrossed, VolumeX, Waves, Wifi, type LucideIcon,
} from "lucide-react";
import type { HotelAmenityIconKey, HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getRoomAndStayValues,
  normalizeHotelDetailsSectionValues,
} from "./hotelDetailsSectionsPresentation";

const amenityIcons: Record<HotelAmenityIconKey, LucideIcon> = {
  wifi: Wifi, breakfast: Coffee, pool: Waves, spa: Flower2, airportShuttle: BusFront,
  parking: CircleParking, fitness: Dumbbell, workspace: Laptop, quietRooms: VolumeX,
  frontDesk: ConciergeBell, lateCheckIn: Clock3, kitchenette: CookingPot, bikeStorage: Bike,
  courtyard: Trees, lounge: Armchair, restaurant: UtensilsCrossed,
  airConditioning: AirVent, generic: CircleDot,
};

type SourceAttribution = { provider: string; providerUri?: string };

type HotelDetailsSectionsProps = {
  roomTitle: string;
  roomType: string;
  mealPlan: string;
  cancellationTitle: string;
  cancellationItems: string[];
  cancellationClarification: string;
  amenitiesTitle: string;
  amenityItems: HotelAmenityPresentationItem[];
  locationTitle: string;
  locationParts: string[];
  mapHref: string;
  mapHotelLabel: string;
  mapActionText: string;
  tripFitTitle: string;
  tripFitDisclosure: string;
  recommendationReasons: string[];
  sourcesTitle: string;
  propertyDataLabel: string;
  isGoogleMapsProvider: boolean;
  sourceAttributions: SourceAttribution[];
  isSafeAttributionUrl: (value?: string) => boolean;
};

export function HotelDetailsSections(props: HotelDetailsSectionsProps) {
  const roomItems = getRoomAndStayValues(props.roomType, props.mealPlan);
  const cancellationItems = normalizeHotelDetailsSectionValues(props.cancellationItems);
  const locationParts = normalizeHotelDetailsSectionValues(props.locationParts);
  const recommendationReasons = normalizeHotelDetailsSectionValues(props.recommendationReasons);
  const hasLocation = locationParts.length > 0 || Boolean(props.mapHref);
  const hasSources = props.isGoogleMapsProvider || props.sourceAttributions.length > 0;

  return (
    <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-3">
      {(roomItems.length > 0 || cancellationItems.length > 0) ? (
        <div className={roomItems.length > 0 && cancellationItems.length > 0 ? "grid gap-5 md:grid-cols-2" : ""}>
          {roomItems.length > 0 ? <RoomSection title={props.roomTitle} items={roomItems} /> : null}
          {cancellationItems.length > 0 ? <CancellationSection title={props.cancellationTitle} items={cancellationItems} clarification={props.cancellationClarification} /> : null}
        </div>
      ) : null}
      {props.amenityItems.length > 0 ? <AmenitySection title={props.amenitiesTitle} items={props.amenityItems} /> : null}
      {(hasLocation || recommendationReasons.length > 0) ? (
        <div className={hasLocation && recommendationReasons.length > 0 ? "grid gap-5 md:grid-cols-2" : ""}>
          {hasLocation ? <LocationSection title={props.locationTitle} parts={locationParts} mapHref={props.mapHref} mapHotelLabel={props.mapHotelLabel} mapActionText={props.mapActionText} /> : null}
          {recommendationReasons.length > 0 ? <TripFitSection title={props.tripFitTitle} disclosure={props.tripFitDisclosure} items={recommendationReasons} /> : null}
        </div>
      ) : null}
      {hasSources ? <SourcesSection title={props.sourcesTitle} propertyDataLabel={props.propertyDataLabel} isGoogleMapsProvider={props.isGoogleMapsProvider} attributions={props.sourceAttributions} isSafeUrl={props.isSafeAttributionUrl} /> : null}
    </div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return <div className="flex items-center gap-2"><Icon className="h-5 w-5 shrink-0 text-blue" aria-hidden="true" /><h2 className="text-base font-bold text-slate-950">{title}</h2></div>;
}

function RoomSection({ title, items }: { title: string; items: string[] }) {
  return <Card variant="flat" className="h-full p-4 sm:p-6"><SectionHeading icon={BedDouble} title={title} /><ul className="mt-4 space-y-3 text-sm font-medium leading-6 text-slate-700">{items.map((item, index) => <li key={`${item}-${index}`} className="flex min-w-0 items-start gap-3">{index === 0 ? <BedDouble className="mt-1 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /> : <Coffee className="mt-1 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />}<span className="min-w-0 break-words">{item}</span></li>)}</ul></Card>;
}

function CancellationSection({ title, items, clarification }: { title: string; items: string[]; clarification: string }) {
  return <Card variant="flat" className="h-full p-4 sm:p-6"><SectionHeading icon={ShieldCheck} title={title} /><ul className="mt-4 space-y-3 text-sm font-medium leading-6 text-slate-700">{items.map((item, index) => <li key={`${item}-${index}`} className="flex min-w-0 items-start gap-3">{index === 0 ? <CreditCard className="mt-1 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /> : <ReceiptText className="mt-1 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />}<span className="min-w-0 break-words">{item}</span></li>)}</ul><p className="mt-4 text-xs leading-5 text-slate-600">{clarification}</p></Card>;
}

function AmenitySection({ title, items }: { title: string; items: HotelAmenityPresentationItem[] }) {
  return <Card variant="flat" className="p-4 sm:p-6"><SectionHeading icon={Sparkles} title={title} /><ul className="mt-4 grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 xl:grid-cols-3" role="list">{items.map((item) => { const Icon = amenityIcons[item.iconKey]; return <li key={item.key} className="flex min-w-0 items-start gap-3 text-sm font-medium leading-5 text-slate-700"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted"><Icon className="h-4 w-4 text-slate-600" aria-hidden="true" /></span><span className="min-w-0 break-words pt-1.5">{item.label}</span></li>; })}</ul></Card>;
}

function LocationSection({ title, parts, mapHref, mapHotelLabel, mapActionText }: { title: string; parts: string[]; mapHref: string; mapHotelLabel: string; mapActionText: string }) {
  return <Card variant="flat" className="h-full p-4 sm:p-6"><SectionHeading icon={MapPin} title={title} />{parts.length > 0 ? <ul className="mt-4 space-y-2 text-sm font-medium leading-6 text-slate-700">{parts.map((part) => <li key={part} className="flex items-start gap-2"><MapPin className="mt-1 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /><span>{part}</span></li>)}</ul> : null}{mapHref ? <LinkButton href={mapHref} variant="secondary" size="md" className="mt-4 w-full sm:w-auto" target="_blank" rel="noopener noreferrer" aria-label={mapHotelLabel} title={mapHotelLabel}><MapPin className="h-4 w-4" aria-hidden="true" /><span>{mapActionText}</span></LinkButton> : null}</Card>;
}

function TripFitSection({ title, disclosure, items }: { title: string; disclosure: string; items: string[] }) {
  return <Card variant="subtle" className="h-full p-4 sm:p-6"><SectionHeading icon={Sparkles} title={title} /><p className="mt-3 text-xs leading-5 text-slate-600">{disclosure}</p><ul className="mt-4 space-y-2 text-sm font-medium leading-6 text-slate-700">{items.map((item) => <li key={item} className="flex items-start gap-2"><Sparkles className="mt-1 h-4 w-4 shrink-0 text-blue" aria-hidden="true" /><span>{item}</span></li>)}</ul></Card>;
}

function SourcesSection({ title, propertyDataLabel, isGoogleMapsProvider, attributions, isSafeUrl }: { title: string; propertyDataLabel: string; isGoogleMapsProvider: boolean; attributions: SourceAttribution[]; isSafeUrl: (value?: string) => boolean }) {
  return <Card variant="flat" className="p-4 sm:p-5"><SectionHeading icon={Database} title={title} /><div className="mt-3 space-y-3 text-sm leading-5 text-slate-600">{isGoogleMapsProvider ? <p>Hotel discovery data provided by <span translate="no" className="whitespace-nowrap">Google Maps</span></p> : null}{attributions.length > 0 ? <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-slate-700">{propertyDataLabel}:</span>{attributions.map((attribution, index) => <span key={`${attribution.provider}-${index}`} className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 ring-1 ring-slate-200">{isSafeUrl(attribution.providerUri) ? <a href={attribution.providerUri} target="_blank" rel="noopener noreferrer" translate="no" className="focus-ring rounded text-[#004BB8] hover:underline">{attribution.provider}</a> : <span translate="no">{attribution.provider}</span>}</span>)}</div> : null}</div></Card>;
}
