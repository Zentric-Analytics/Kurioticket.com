import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";
import { FlowIcon } from "../features/flow/FlowIcon";

export const favoriteButtonColors = {
  active: "#E92D55",
  inactive: "white",
  background: "rgba(2,15,42,.62)",
} as const;

export const favoriteButtonMetrics = {
  size: 44,
  borderRadius: 22,
  iconSize: 24,
} as const;

export function FavoriteButton({
  saved,
  accessibilityLabel,
  onPress,
  disabled,
  style,
}: {
  saved: boolean;
  accessibilityLabel: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: saved, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, style]}
    >
      <FlowIcon
        name="heart"
        color={saved ? favoriteButtonColors.active : favoriteButtonColors.inactive}
        size={favoriteButtonMetrics.iconSize}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: favoriteButtonMetrics.size,
    height: favoriteButtonMetrics.size,
    borderRadius: favoriteButtonMetrics.borderRadius,
    backgroundColor: favoriteButtonColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
