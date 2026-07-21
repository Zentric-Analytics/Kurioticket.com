import {
  AirVent,
  Armchair,
  Bike,
  BusFront,
  CircleDot,
  CircleParking,
  Clock3,
  Coffee,
  ConciergeBell,
  CookingPot,
  Dumbbell,
  Flower2,
  Laptop,
  Trees,
  UtensilsCrossed,
  VolumeX,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  HotelAmenityIconKey,
  HotelAmenityPresentationItem,
} from "@/components/results/hotelAmenityPresentation";

const amenityIcons: Record<HotelAmenityIconKey, LucideIcon> = {
  wifi: Wifi,
  breakfast: Coffee,
  pool: Waves,
  spa: Flower2,
  airportShuttle: BusFront,
  parking: CircleParking,
  fitness: Dumbbell,
  workspace: Laptop,
  quietRooms: VolumeX,
  frontDesk: ConciergeBell,
  lateCheckIn: Clock3,
  kitchenette: CookingPot,
  bikeStorage: Bike,
  courtyard: Trees,
  lounge: Armchair,
  restaurant: UtensilsCrossed,
  airConditioning: AirVent,
  generic: CircleDot,
};

export function HotelDetailsSections({
  roomTitle,
  roomItems,
  cancellationTitle,
  cancellationItems,
  amenitiesTitle,
  amenityItems,
}: {
  roomTitle: string;
  roomItems: string[];
  cancellationTitle: string;
  cancellationItems: string[];
  amenitiesTitle: string;
  amenityItems: HotelAmenityPresentationItem[];
}) {
  return (
    <div
      className={
        amenityItems.length > 0
          ? "grid min-w-0 items-stretch gap-6 lg:grid-cols-2 lg:gap-8"
          : "min-w-0"
      }
    >
      <StayDetailsSection
        roomTitle={roomTitle}
        roomItems={roomItems}
        cancellationTitle={cancellationTitle}
        cancellationItems={cancellationItems}
      />
      {amenityItems.length > 0 ? (
        <AmenitySection title={amenitiesTitle} items={amenityItems} />
      ) : null}
    </div>
  );
}

type StayDetailsSectionProps = {
  roomTitle: string;
  roomItems: string[];
  cancellationTitle: string;
  cancellationItems: string[];
};

function StayDetailsSection({
  roomTitle,
  roomItems,
  cancellationTitle,
  cancellationItems,
}: StayDetailsSectionProps) {
  const sections = [
    {
      title: roomTitle,
      items: roomItems.map((item) => item.trim()).filter(Boolean),
    },
    {
      title: cancellationTitle,
      items: cancellationItems.map((item) => item.trim()).filter(Boolean),
    },
  ].filter((section) => section.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <Card
      variant="flat"
      className="h-full p-5 shadow-[0_12px_32px_-26px_rgba(2,28,43,0.28)] sm:p-6"
    >
      <div
        className={
          sections.length > 1 ? "grid gap-6 lg:grid-cols-2 lg:gap-0" : ""
        }
      >
        {sections.map((section, index) => (
          <section
            key={section.title}
            className={
              index > 0 ? "lg:border-s lg:border-border lg:ps-6" : "lg:pe-6"
            }
          >
            <h2 className="text-lg font-bold text-slate-950">
              {section.title}
            </h2>
            <ul className="mt-3 space-y-2 text-sm font-medium leading-6 text-slate-700">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}

function AmenitySection({
  title,
  items,
}: {
  title: string;
  items: HotelAmenityPresentationItem[];
}) {
  return (
    <Card
      variant="flat"
      className="h-full p-5 shadow-[0_12px_32px_-26px_rgba(2,28,43,0.28)] sm:p-6"
    >
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <ul
        className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2"
        role="list"
      >
        {items.map((item) => {
          const Icon = amenityIcons[item.iconKey];
          return (
            <li
              key={item.key}
              className="flex min-w-0 items-start gap-2.5 text-sm font-medium leading-5 text-slate-700"
            >
              <Icon
                className="mt-0.5 h-4 w-4 shrink-0 text-blue"
                aria-hidden="true"
              />
              <span className="min-w-0 break-words">{item.label}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
