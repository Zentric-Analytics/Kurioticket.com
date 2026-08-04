import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";
import { FlowIcon } from "../flow/FlowIcon";

export const homepageFavoriteColors = {
  active: "#E92D55",
  inactive: "#E92D55",
  background: "#FFFFFF",
} as const;

export function HomepageFavoriteButton({
  saved,
  label,
  onPress,
  style,
  iconSize = 22,
}: {
  saved: boolean;
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: saved }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, pressed && styles.pressed]}
    >
      <FlowIcon name="heart" color={homepageFavoriteColors.active} fill={saved ? homepageFavoriteColors.active : "none"} size={iconSize} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: homepageFavoriteColors.background,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10254D",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.94 }] },
});
