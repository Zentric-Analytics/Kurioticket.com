import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { FlowIcon } from "../flow/FlowIcon";

export const androidFavoriteColors = {
  unsavedStroke: "#334155",
  shareStroke: "#334155",
  savedStroke: "#E92D55",
  savedFill: "#E92D55",
  unsavedFill: "none",
  strokeWidth: 2,
  background: "rgba(2,15,42,.62)",
} as const;

export const webParityFavoriteColors = {
  unsavedBackground: "rgba(255,255,255,0.90)",
  unsavedBorder: "rgba(255,255,255,0.80)",
  unsavedStroke: "#64748B",
  savedBackground: "#FFF1F2",
  savedBorder: "#FECDD3",
  savedStroke: "#E11D48",
  savedFill: "#E11D48",
  unsavedFill: "none",
  strokeWidth: 2,
} as const;

export const androidFavoriteHitSlop = { top: 2, bottom: 2, left: 2, right: 2 } as const;

export function AndroidFavoriteButton({
  saved,
  label,
  onPress,
  style,
  variant = "default",
}: {
  saved: boolean;
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "webParity";
}) {
  const webParity = variant === "webParity";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: saved }}
      onPress={onPress}
      hitSlop={androidFavoriteHitSlop}
      style={[styles.touchTarget, style]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.surface,
          webParity && styles.webParitySurface,
          webParity && (saved ? styles.webParitySaved : styles.webParityUnsaved),
        ]}
      >
        <FlowIcon
          name="heart"
          size={webParity ? 15 : 18}
          strokeWidth={webParity ? webParityFavoriteColors.strokeWidth : androidFavoriteColors.strokeWidth}
          color={saved ? (webParity ? webParityFavoriteColors.savedStroke : androidFavoriteColors.savedStroke) : (webParity ? webParityFavoriteColors.unsavedStroke : androidFavoriteColors.unsavedStroke)}
          fill={saved ? (webParity ? webParityFavoriteColors.savedFill : androidFavoriteColors.savedFill) : (webParity ? webParityFavoriteColors.unsavedFill : androidFavoriteColors.unsavedFill)}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  surface: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: androidFavoriteColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  webParitySurface: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  webParityUnsaved: {
    backgroundColor: webParityFavoriteColors.unsavedBackground,
    borderColor: webParityFavoriteColors.unsavedBorder,
  },
  webParitySaved: {
    backgroundColor: webParityFavoriteColors.savedBackground,
    borderColor: webParityFavoriteColors.savedBorder,
  },
});
