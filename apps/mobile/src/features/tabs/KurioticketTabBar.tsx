import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/tokens";

const labels: Record<string, string> = { index: "Search", explore: "Explore", trips: "Trips", profile: "Profile" };

function TabMark({ name, focused }: { name: string; focused: boolean }) {
  return <View style={[styles.mark, focused && styles.markSelected, name === "trips" && styles.markWide, name === "profile" && styles.markRound]} />;
}

export function KurioticketTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key]?.options;
        const label = labels[route.name] ?? String(options?.title ?? route.name);
        return (
          <Pressable
            key={route.key}
            accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            style={({ pressed }) => [styles.item, focused && styles.itemSelected, pressed && styles.itemPressed]}
          >
            <TabMark name={route.name} focused={focused} />
            <Text numberOfLines={1} style={[styles.label, focused && styles.labelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingTop: 8, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
  item: { flex: 1, minHeight: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 6 },
  itemSelected: { backgroundColor: colors.sky },
  itemPressed: { opacity: 0.72 },
  mark: { width: 18, height: 18, borderRadius: 6, borderWidth: 2, borderColor: colors.muted },
  markSelected: { borderColor: colors.blue, backgroundColor: colors.blue },
  markWide: { width: 24, borderRadius: 5 },
  markRound: { borderRadius: 9 },
  label: { color: colors.muted, fontSize: 11, lineHeight: 14, fontWeight: "800" },
  labelSelected: { color: colors.navy },
});
