import {
  AirVent,
  Armchair,
  BedDouble,
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
  FileText,
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

type DetailsSection =
  | {
      key: "room" | "cancellation";
      title: string;
      kind: "text";
      items: string[];
    }
  | {
      key: "amenities";
      title: string;
      kind: "amenities";
      items: HotelAmenityPresentationItem[];
    };

export function HotelDetailsSections({
  embedded = false,
  roomTitle,
  roomItems,
  cancellationTitle,
  cancellationItems,
  amenitiesTitle,
  amenityItems,
}: {
  embedded?: boolean;
  roomTitle: string;
  roomItems: string[];
  cancellationTitle: string;
  cancellationItems: string[];
  amenitiesTitle: string;
  amenityItems: HotelAmenityPresentationItem[];
}) {
  const normalizedRoomItems = roomItems
    .map((item) => item.trim())
    .filter(Boolean);
  const normalizedCancellationItems = cancellationItems
    .map((item) => item.trim())
    .filter(Boolean);

  const hasRoom = normalizedRoomItems.length > 0;
  const hasCancellation = normalizedCancellationItems.length > 0;
  const hasAmenities = amenityItems.length > 0;

  if (!hasRoom && !hasCancellation && !hasAmenities) return null;

  const sections: DetailsSection[] = [];
  if (hasRoom) {
    sections.push({
      key: "room",
      title: roomTitle,
      kind: "text",
      items: normalizedRoomItems,
    });
  }
  if (hasCancellation) {
    sections.push({
      key: "cancellation",
      title: cancellationTitle,
      kind: "text",
      items: normalizedCancellationItems,
    });
  }
  if (hasAmenities) {
    sections.push({
      key: "amenities",
      title: amenitiesTitle,
      kind: "amenities",
      items: amenityItems,
    });
  }

  const gridColumns =
    sections.length === 3
      ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]"
      : sections.length === 2 && hasAmenities
        ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
        : sections.length === 2
          ? "lg:grid-cols-2"
          : "lg:grid-cols-1";

  const content = (
    <div
      className={`grid min-w-0 gap-3 border-t border-border bg-slate-50/70 p-3 sm:gap-4 sm:p-4 ${gridColumns}`}
    >
      {sections.map((section) => (
        <section
          key={section.key}
          aria-labelledby={`hotel-details-${section.key}-heading`}
          className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-[0_8px_24px_-20px_rgba(2,28,43,0.32)] sm:p-5"
        >
          <h2 id={`hotel-details-${section.key}-heading`} className="sr-only">
            {section.title}
          </h2>
          {section.kind === "text" ? (
            <div className="flex min-w-0 items-start gap-3">
              {section.key === "room" ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle shadow-sm">
                  <BedDouble
                    className="h-5 w-5 text-blue"
                    aria-hidden="true"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle shadow-sm">
                  <FileText
                    className="h-5 w-5 text-blue"
                    aria-hidden="true"
                  />
                </div>
              )}
              <ul className="min-w-0 space-y-1.5" role="list">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className={
                      section.key === "room"
                        ? item === section.items[0]
                          ? "break-words text-sm font-semibold leading-5 text-slate-950"
                          : "break-words text-sm font-medium leading-5 text-slate-600"
                        : "break-words text-sm font-semibold leading-5 text-slate-900"
                    }
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul
              className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2"
              role="list"
            >
              {section.items.map((item) => {
                const Icon = amenityIcons[item.iconKey];
                return (
                  <li
                    key={item.key}
                    className="flex min-w-0 items-start gap-2.5 rounded-lg bg-surface-subtle/70 px-3 py-2.5 text-sm font-medium leading-5 text-slate-700"
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
          )}
        </section>
      ))}
    </div>
  );

  if (embedded) return content;

  return (
    <Card
      variant="flat"
      className="overflow-hidden p-0 shadow-[0_12px_32px_-26px_rgba(2,28,43,0.28)]"
    >
      {content}
    </Card>
  );
}
