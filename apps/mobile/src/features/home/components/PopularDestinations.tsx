import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../theme/tokens";
import { popularDestinations } from "../data";

export function PopularDestinations() {
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Popular Destinations</Text>
        <Text style={styles.link}>View all</Text>
      </View>
      <View style={styles.grid}>
        {popularDestinations.map((destination) => (
          <View key={destination.city} style={styles.card}>
            <View style={[styles.imagePlaceholder, { backgroundColor: destination.accent }]}>
              <Text style={styles.imageText}>{destination.city.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.city}>{destination.city}</Text>
            <Text style={styles.price}>from {destination.price}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { color: colors.navy, fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },
  link: { color: colors.blue, fontSize: 14, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "48%", flexGrow: 1, borderRadius: 24, backgroundColor: colors.surface, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border },
  imagePlaceholder: { height: 104, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  imageText: { color: colors.navy, fontSize: 20, fontWeight: "900" },
  city: { color: colors.navy, fontSize: 17, fontWeight: "900" },
  price: { color: colors.muted, fontSize: 14, fontWeight: "700" },
});
