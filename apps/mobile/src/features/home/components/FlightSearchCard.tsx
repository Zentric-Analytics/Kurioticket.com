import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../../theme/tokens";
import { searchFields } from "../data";

export function FlightSearchCard() {
  return (
    <View style={styles.card}>
      <View style={styles.routeRow}>
        {searchFields.slice(0, 2).map((field) => (
          <SearchField key={field.label} {...field} featured />
        ))}
      </View>
      <View style={styles.divider} />
      <View style={styles.detailsGrid}>
        {searchFields.slice(2).map((field) => (
          <SearchField key={field.label} {...field} />
        ))}
      </View>
      <Pressable style={styles.button} accessibilityRole="button">
        <Text style={styles.buttonText}>Search Flights</Text>
      </Pressable>
    </View>
  );
}

function SearchField({ label, value, helper, featured = false }: { label: string; value: string; helper: string; featured?: boolean }) {
  return (
    <View style={[styles.field, featured && styles.featuredField]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, featured && styles.featuredValue]}>{value}</Text>
      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: spacing.radius + 6, padding: spacing.card, gap: 16, shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 7 },
  routeRow: { flexDirection: "row", gap: 12 },
  detailsGrid: { gap: 12 },
  field: { flex: 1, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 5 },
  featuredField: { minHeight: 112, justifyContent: "center" },
  label: { color: colors.muted, fontSize: 12, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" },
  value: { color: colors.navy, fontSize: 17, fontWeight: "900" },
  featuredValue: { fontSize: 20 },
  helper: { color: colors.slate, fontSize: 13, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  button: { minHeight: 56, borderRadius: 18, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center", shadowColor: colors.blue, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "900" },
});
