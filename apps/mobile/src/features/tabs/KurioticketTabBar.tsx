import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/tokens";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";

const labels: Record<string, string> = { index: "Home", explore: "Explore", trips: "Trips", profile: "Profile" };
const icons: Record<string, FlowIconName> = { index: "home", trips: "trip", explore: "compass", profile: "person" };

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
            <FlowIcon name={icons[route.name] ?? "home"} size={23} color={focused ? "#0754F7" : "#475569"} />
            <Text numberOfLines={1} style={[styles.label, focused && styles.labelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingTop: 8, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
  item: { flex: 1, minHeight: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 5 },
  itemSelected: {},
  itemPressed: { opacity: 0.72 },
  label: { color: colors.muted, fontSize: 11, lineHeight: 14, fontWeight: "700" },
  labelSelected: { color: "#0754F7" },
});
