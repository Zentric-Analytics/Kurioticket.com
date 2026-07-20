import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../theme/tokens";

const tabs = ["Home", "Trips", "Profile"] as const;

export function BottomNavigation() {
  return (
    <View style={styles.nav}>
      {tabs.map((tab) => {
        const active = tab === "Home";
        return (
          <View key={tab} style={[styles.tab, active && styles.activeTab]}>
            <View style={[styles.dot, active && styles.activeDot]} />
            <Text style={[styles.label, active && styles.activeLabel]}>{tab}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: "row", gap: 8, borderRadius: 28, backgroundColor: colors.surface, padding: 8, borderWidth: 1, borderColor: colors.border, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  tab: { flex: 1, minHeight: 50, borderRadius: 22, alignItems: "center", justifyContent: "center", gap: 4 },
  activeTab: { backgroundColor: colors.sky },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  activeDot: { backgroundColor: colors.blue },
  label: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  activeLabel: { color: colors.blue, fontWeight: "900" },
});
