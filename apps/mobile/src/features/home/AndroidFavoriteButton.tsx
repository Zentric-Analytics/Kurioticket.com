import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";
import { FlowIcon } from "../flow/FlowIcon";

export const androidFavoriteColors = {
  active: "#E92D55",
  inactive: "white",
  background: "rgba(2,15,42,.62)",
} as const;

export const androidFavoriteHitSlop = { top: 2, bottom: 2, left: 2, right: 2 } as const;

export function AndroidFavoriteButton({
  saved,
  label,
  onPress,
  style,
}: {
  saved: boolean;
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: saved }}
      onPress={onPress}
      hitSlop={androidFavoriteHitSlop}
      style={[styles.button, style]}
    >
      <FlowIcon name="heart" size={18} color={saved ? androidFavoriteColors.active : androidFavoriteColors.inactive} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: androidFavoriteColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
