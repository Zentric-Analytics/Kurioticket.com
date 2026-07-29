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
import type {
  HotelAmenityIconKey,
  HotelAmenityPresentationItem,
} from "@/components/results/hotelAmenityPresentation";

const hotelAmenityIcons: Record<HotelAmenityIconKey, LucideIcon> = {
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

type HotelAmenityListProps = {
  items: HotelAmenityPresentationItem[];
  t: (key: string) => string;
  className?: string;
};

export function HotelAmenityList({
  items,
  t,
  className = "mt-2 grid grid-cols-1 gap-y-1.5",
}: HotelAmenityListProps) {
  if (items.length === 0) return null;

  return (
    <ul role="list" className={className}>
      {items.map((item) => {
        const Icon = hotelAmenityIcons[item.iconKey];
        const translatedLabel = item.translationKey
          ? t(item.translationKey)
          : "";
        const label = translatedLabel.trim() || item.label;

        return (
          <li
            key={item.key}
            className="flex min-w-0 items-start gap-1.5 text-[12px] font-medium leading-4 text-slate-600"
          >
            <Icon
              className="h-4 w-4 shrink-0 text-slate-500"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span className="min-w-0 break-words">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
