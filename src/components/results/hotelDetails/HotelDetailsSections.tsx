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

type MobileOpenLineSide = "left" | "right";
type MobileOpenLineTurn = "top" | "bottom";
type MobileOpenLine = {
  side: MobileOpenLineSide;
  turn: MobileOpenLineTurn;
};

function MobileOpenSectionLine({ side, turn }: MobileOpenLine) {
  const cornerClasses = {
    "left-top": "start-0 top-0 border-s border-t rounded-ss-2xl",
    "right-bottom": "end-0 bottom-0 border-e border-b rounded-ee-2xl",
    "left-bottom": "start-0 bottom-0 border-s border-b rounded-es-2xl",
    "right-top": "end-0 top-0 border-e border-t rounded-se-2xl",
  } as const;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative my-0.5 h-2 select-none sm:hidden"
    >
      <span
        className={`absolute h-2 w-[calc(100%-2rem)] border-slate-300/80 ${cornerClasses[`${side}-${turn}`]}`}
      />
    </div>
  );
}

function getMobileOpenLinesBeforeSection(
  sectionKeys: DetailsSection["key"][],
  index: number,
): MobileOpenLine[] {
  const current = sectionKeys[index];
  const previous = sectionKeys[index - 1];

  if (index === 0) {
    return [
      current === "amenities"
        ? { side: "right", turn: "top" }
        : { side: "left", turn: "top" },
    ];
  }
  if (previous === "room" && current === "cancellation") {
    return [{ side: "right", turn: "bottom" }];
  }
  if (previous === "room" && current === "amenities") {
    return [
      { side: "right", turn: "bottom" },
      { side: "right", turn: "top" },
    ];
  }
  if (previous === "cancellation" && current === "amenities") {
    return [
      { side: "left", turn: "bottom" },
      { side: "right", turn: "top" },
    ];
  }
  return [];
}

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

  const gridColumns = sections.length > 1 ? "xl:grid-cols-2" : "xl:grid-cols-1";
  const hasTwoTextSections = hasRoom && hasCancellation;

  const content = (
    <div
      className={`grid min-w-0 border-t-0 bg-surface sm:border-t sm:border-border ${gridColumns}`}
    >
      {sections.map((section, index) => {
        const mobileLines = getMobileOpenLinesBeforeSection(
          sections.map(({ key }) => key),
          index,
        );
        const spansFullDesktopRow =
          sections.length > 1 &&
          (section.key === "amenities" ||
            (hasAmenities && !hasTwoTextSections && section.kind === "text"));
        const hasDesktopStartDivider =
          section.key === "cancellation" && hasTwoTextSections;
        return (
          <section
            key={section.key}
            aria-labelledby={`hotel-details-${section.key}-heading`}
            className={`min-w-0 ${spansFullDesktopRow ? "xl:col-span-2" : ""} ${
              index > 0 ? "border-t-0 sm:border-t sm:border-border" : ""
            } ${
              hasDesktopStartDivider
                ? "xl:border-t-0 xl:border-s"
                : index > 0
                  ? "xl:border-t xl:border-s-0"
                  : ""
            }`}
          >
            {mobileLines.map((line) => (
              <MobileOpenSectionLine
                key={`${line.side}-${line.turn}`}
                side={line.side}
                turn={line.turn}
              />
            ))}
            <div className="p-5 sm:p-6">
              <h2
                id={`hotel-details-${section.key}-heading`}
                className="sr-only"
              >
                {section.title}
              </h2>
              {section.kind === "text" ? (
                <div className="flex min-w-0 items-start gap-3">
                  {section.key === "room" ? (
                    <BedDouble
                      className="mt-0.5 h-5 w-5 shrink-0 text-blue"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileText
                      className="mt-0.5 h-5 w-5 shrink-0 text-blue"
                      aria-hidden="true"
                    />
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
                  className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2"
                  role="list"
                >
                  {section.items.map((item) => {
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
                        <span className="min-w-0 break-words">
                          {item.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        );
      })}
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
