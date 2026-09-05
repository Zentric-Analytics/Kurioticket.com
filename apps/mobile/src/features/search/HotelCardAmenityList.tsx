import {
  AirVent, Armchair, BatteryCharging, Bike, BusFront, CircleDot, CircleParking, Clock3, Coffee,
  ConciergeBell, CookingPot, Dumbbell, Flower2, Laptop, Trees, UtensilsCrossed,
  PawPrint, VolumeX, Waves, Wifi, Wine, type LucideIcon,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import {
  buildHotelAmenityPresentation,
  type HotelAmenityIconKey,
  type HotelAmenityPresentationItem,
} from "../../../../../src/components/results/hotelAmenityPresentation";
import { appFonts } from "../../theme/typography";
import { ui } from "./SearchUi";

const amenityIcons: Record<HotelAmenityIconKey, LucideIcon> = {
  wifi: Wifi, breakfast: Coffee, pool: Waves, spa: Flower2,
  petFriendly: PawPrint, evCharging: BatteryCharging,
  airportShuttle: BusFront, parking: CircleParking, fitness: Dumbbell,
  workspace: Laptop, quietRooms: VolumeX, frontDesk: ConciergeBell,
  lateCheckIn: Clock3, kitchenette: CookingPot, bikeStorage: Bike,
  courtyard: Trees, lounge: Armchair, restaurant: UtensilsCrossed, bar: Wine,
  airConditioning: AirVent, generic: CircleDot,
};

export function HotelCardAmenityList({ amenities }: { amenities: readonly unknown[] }) {
  const items = buildHotelAmenityPresentation(amenities, 4);
  return (
    <View style={styles.list}>
      {items.map((item) => {
        const Icon = amenityIcons[item.iconKey];
        return (
          <View key={item.key} style={styles.item}>
            <Icon accessible={false} size={14} strokeWidth={1.8} color={ui.muted} />
            <Text numberOfLines={1} style={styles.label}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function HotelOfferAmenityList({
  amenities,
  color,
  compact = false,
}: {
  amenities: readonly unknown[];
  color: string;
  compact?: boolean;
}) {
  const items = buildHotelAmenityPresentation(amenities, 3);
  if (!items.length) return null;

  return (
    <View style={[styles.offerList, compact && styles.offerListCompact]}>
      {items.map((item) => {
        const Icon = amenityIcons[item.iconKey];
        return (
          <View key={item.key} style={styles.offerItem}>
            <Icon accessible={false} size={16} strokeWidth={1.8} color={color} />
            <Text numberOfLines={1} style={[styles.offerLabel, { color }]}>
              {hotelOfferAmenityLabel(item)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function hotelOfferAmenityLabel(item: HotelAmenityPresentationItem) {
  return item.translationKey === "hotelResults.filter.freeWifi"
    ? "Free Wi-Fi"
    : item.label;
}

const styles = StyleSheet.create({
  list: { gap: 3 },
  item: { flexDirection: "row", alignItems: "center", gap: 5, minWidth: 0 },
  label: { flexShrink: 1, minWidth: 0, color: ui.muted, fontSize: 11, lineHeight: 15, fontWeight: "500", fontFamily: appFonts.medium },
  offerList: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 16 },
  offerListCompact: { gap: 10 },
  offerItem: { flexDirection: "row", alignItems: "center", flexShrink: 0, gap: 6 },
  offerLabel: { fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
});
