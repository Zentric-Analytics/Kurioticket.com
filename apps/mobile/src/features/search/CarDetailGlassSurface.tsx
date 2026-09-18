import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  style: StyleProp<ViewStyle>;
  dark: boolean;
};

export function CarDetailGlassSurface({ style, dark }: Props) {
  const liquidGlassAvailable =
    Platform.OS === "ios"
    && isLiquidGlassAvailable()
    && isGlassEffectAPIAvailable();

  if (liquidGlassAvailable) {
    return (
      <GlassView
        pointerEvents="none"
        accessible={false}
        glassEffectStyle="clear"
        style={[style, styles.nativeGlass]}
      />
    );
  }

  return (
    <BlurView
      pointerEvents="none"
      accessible={false}
      intensity={28}
      tint={dark ? "dark" : "light"}
      experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
      style={[style, styles.fallbackGlass, dark && styles.fallbackGlassDark]}
    />
  );
}

const styles = StyleSheet.create({
  nativeGlass: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.36)",
  },
  fallbackGlass: {
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.36)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.62)",
  },
  fallbackGlassDark: {
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
});
