import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../theme/tokens";

export function PromoBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.copy}>
        <Text style={styles.kicker}>Limited offer</Text>
        <Text style={styles.title}>Explore Europe from $399</Text>
        <Text style={styles.subtitle}>Handpicked fares for your next unforgettable escape.</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Save</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { minHeight: 150, borderRadius: 28, backgroundColor: colors.navy, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden" },
  copy: { flex: 1, gap: 8, paddingRight: 14 },
  kicker: { color: colors.teal, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  title: { color: colors.surface, fontSize: 24, lineHeight: 29, fontWeight: "900" },
  subtitle: { color: colors.sky, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  badge: { width: 74, height: 74, borderRadius: 37, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.navy, fontWeight: "900" },
});
