import {
  AirVent, Armchair, BatteryCharging, Bike, BusFront, CircleDot, CircleParking, Clock3, Coffee,
  ConciergeBell, CookingPot, Dumbbell, Flower2, Laptop, Trees, UtensilsCrossed,
  PawPrint, VolumeX, Waves, Wifi, Wine, type LucideIcon,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { buildHotelAmenityPresentation, type HotelAmenityIconKey } from "../../../../../src/components/results/hotelAmenityPresentation";
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
            <Icon accessible={false} size={13} strokeWidth={1.8} color={ui.muted} />
            <Text numberOfLines={1} style={styles.label}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 3 },
  item: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  label: { flexShrink: 1, color: ui.muted, fontSize: 10, lineHeight: 14 },
});
