import {
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from "react-native";

export function ResponsiveHero({
  source,
  sourceWidth,
  sourceHeight,
  height,
  focalY,
  accessibilityLabel,
  rounded = false,
  overscan = 7,
}: {
  source: ImageSourcePropType;
  sourceWidth: number;
  sourceHeight: number;
  height: number;
  focalY: number;
  accessibilityLabel: string;
  rounded?: boolean;
  overscan?: number;
}) {
  const { width } = useWindowDimensions();
  const renderedWidth = width + overscan * 2;
  const renderedHeight = renderedWidth * (sourceHeight / sourceWidth);
  const overflow = Math.max(0, renderedHeight - height);
  const translateY = -overflow * Math.max(0, Math.min(1, focalY));

  return (
    <View style={[styles.frame, { height }, rounded && styles.rounded]}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={accessibilityLabel}
        source={source}
        resizeMode="stretch"
        style={{
          position: "absolute",
          top: 0,
          left: -overscan,
          width: renderedWidth,
          height: renderedHeight,
          transform: [{ translateY }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", overflow: "hidden", backgroundColor: "#EAF3FF" },
  rounded: { borderRadius: 14 },
});
