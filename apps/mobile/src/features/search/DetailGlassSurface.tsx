import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";

type Props = {
  style: StyleProp<ViewStyle>;
  dark: boolean;
  variant?: "neutral" | "carsOptical";
};

export function DetailGlassSurface({ style, dark, variant = "neutral" }: Props) {
  const liquidGlassAvailable =
    Platform.OS === "ios"
    && isLiquidGlassAvailable()
    && isGlassEffectAPIAvailable();

  if (liquidGlassAvailable) {
    const glass = (
      <GlassView
        pointerEvents="none"
        accessible={false}
        glassEffectStyle="clear"
        tintColor="transparent"
        style={variant === "carsOptical" ? StyleSheet.absoluteFill : style}
      />
    );
    if (variant === "neutral") return glass;
    return <OpticalGlassFrame style={style} dark={dark}>{glass}</OpticalGlassFrame>;
  }

  const fallback = (
    <BlurView
      pointerEvents="none"
      accessible={false}
      intensity={variant === "carsOptical" ? 14 : 28}
      tint={dark ? "dark" : "light"}
      experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
      style={[variant === "carsOptical" ? StyleSheet.absoluteFill : style, styles.fallbackGlass, dark && styles.fallbackGlassDark, variant === "carsOptical" && styles.fallbackGlassOptical, variant === "carsOptical" && dark && styles.fallbackGlassOpticalDark]}
    />
  );
  if (variant === "neutral") return fallback;
  return <OpticalGlassFrame style={style} dark={dark}>{fallback}</OpticalGlassFrame>;
}

function OpticalGlassFrame({ style, dark, children }: Props & { children: ReactNode }) {
  return <View pointerEvents="none" accessible={false} style={[style, styles.opticalFrame]}>{children}<View style={[styles.opticalRim, dark && styles.opticalRimDark]} /><View style={styles.opticalSpecular} /></View>;
}

const styles = StyleSheet.create({
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
  fallbackGlassOptical: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 0,
  },
  fallbackGlassOpticalDark: {
    backgroundColor: "rgba(15, 23, 42, 0.12)",
  },
  opticalFrame: {
    overflow: "hidden",
  },
  opticalRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.82)",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.48,
    shadowRadius: 2,
  },
  opticalRimDark: {
    borderColor: "rgba(255, 255, 255, 0.42)",
  },
  opticalSpecular: {
    position: "absolute",
    top: 2,
    left: 8,
    right: 8,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
  },
});
