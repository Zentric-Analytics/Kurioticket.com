import { router } from "expo-router";
import { useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors, useFlowTheme } from "../flow/flowStyles";
import { popularDestinationStayNavigation } from "./homepageCardNavigation";

export { popularDestinationStays } from "./PopularDestinationStaysData";
import { popularDestinationStays } from "./PopularDestinationStaysData";

// src/app/page.tsx DestinationCard at the mobile breakpoint: 17.25rem wide,
// an 18rem image region, and a 4.5rem footer region.
export const POPULAR_STAY_LAYOUT = {
  cardWidth: 276,
  minCardWidth: 260,
  maxCardWidth: 292,
  viewportReveal: 99,
  imageHeight: 288,
  ctaHeight: 72,
  gap: 16,
  radius: 16,
  sideInset: 16,
  nextCardVisible: 67,
} as const;

const { ctaHeight: CTA_HEIGHT } = POPULAR_STAY_LAYOUT;
const IMAGE_OVERLAY_HEIGHT = 112;

export function PopularDestinationStays() {
  const ft = useFlowTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(
    POPULAR_STAY_LAYOUT.maxCardWidth,
    Math.max(
      POPULAR_STAY_LAYOUT.minCardWidth,
      width - POPULAR_STAY_LAYOUT.viewportReveal,
    ),
  );
  const imageHeight =
    cardWidth *
    (POPULAR_STAY_LAYOUT.imageHeight / POPULAR_STAY_LAYOUT.cardWidth);
  const { savedIds, toggle } = useSavedDestinations();
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  return (
    <View
      collapsable={false}
      testID="popular-destination-stays"
      style={styles.section}
    >
      <Text
        accessibilityRole="header"
        style={[styles.heading, { color: ft.colors.textPrimary }]}
      >
        Popular destination stays
      </Text>
      <ScrollView
        testID="popular-destination-stays-rail"
        horizontal
        nestedScrollEnabled
        directionalLockEnabled={false}
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {popularDestinationStays.map((destination) => {
          const saved = savedIds.has(destination.id);
          const imageFailed = failedImageIds.has(destination.id);
          return (
            <View
              key={destination.id}
              testID={`popular-stay-card-${destination.id}`}
              style={[
                styles.card,
                { width: cardWidth, height: imageHeight + CTA_HEIGHT },
              ]}
            >
              <View
                style={[styles.imageFrame, { height: imageHeight }]}
                testID={`popular-stay-image-${destination.id}`}
              >
                {imageFailed ? (
                  <View
                    accessibilityLabel={`${destination.city} image unavailable`}
                    testID={`popular-stay-image-fallback-${destination.id}`}
                    style={styles.imageFallback}
                  />
                ) : null}
                <ImageBackground
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={`${destination.city}, ${destination.country}`}
                  resizeMode="cover"
                  source={imageFailed ? undefined : destination.image}
                  onError={() => {
                    if (__DEV__) {
                      console.warn(
                        `[Popular destination stays] Image failed for ${destination.city}: ${destination.image.uri}`,
                      );
                    }
                    setFailedImageIds((current) => {
                      const next = new Set(current);
                      next.add(destination.id);
                      return next;
                    });
                  }}
                  style={styles.image}
                  imageStyle={styles.imageCorners}
                />
                <Svg
                  pointerEvents="none"
                  style={styles.imageOverlay}
                  width="100%"
                  height={IMAGE_OVERLAY_HEIGHT}
                >
                  <Defs>
                    <LinearGradient
                      id="destinationOverlay"
                      x1="0"
                      y1="1"
                      x2="0"
                      y2="0"
                    >
                      <Stop offset="0" stopColor="#020617" stopOpacity={0.55} />
                      <Stop
                        offset="0.57"
                        stopColor="#020617"
                        stopOpacity={0.16}
                      />
                      <Stop offset="1" stopColor="#020617" stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    width="100%"
                    height="100%"
                    fill="url(#destinationOverlay)"
                  />
                </Svg>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${saved ? "Remove" : "Add"} ${destination.city} ${saved ? "from" : "to"} favorites`}
                  accessibilityState={{ selected: saved }}
                  onPress={(event) => {
                    event.stopPropagation();
                    toggle(destination.id);
                  }}
                  hitSlop={4}
                  style={({ pressed }) => [
                    styles.heart,
                    saved ? styles.heartSaved : styles.heartUnsaved,
                    pressed && styles.heartPressed,
                  ]}
                >
                  <FlowIcon
                    name="heart"
                    size={17}
                    color={flowColors.white}
                    fill={flowColors.white}
                  />
                </Pressable>
                <View pointerEvents="none" style={styles.copy}>
                  <Text style={styles.city}>{destination.city}</Text>
                  <Text style={styles.country}>{destination.country}</Text>
                </View>
              </View>
              <View
                style={styles.ctaSection}
                testID={`popular-stay-cta-${destination.id}`}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Explore stays in ${destination.city}, ${destination.country}`}
                  onPress={() =>
                    router.push(popularDestinationStayNavigation(destination))
                  }
                  style={({ pressed }) => [
                    styles.ctaPill,
                    pressed && styles.ctaPressed,
                  ]}
                >
                  <Text style={styles.ctaText}>Explore stays</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 24, marginTop: 4 },
  heading: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
  },
  carousel: {
    gap: POPULAR_STAY_LAYOUT.gap,
    paddingBottom: 8,
    paddingLeft: 2,
    paddingRight: 34,
  },
  card: {
    borderRadius: POPULAR_STAY_LAYOUT.radius,
    borderColor: "rgba(203, 213, 225, 0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: flowColors.white,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    overflow: "hidden",
  },
  imageFrame: {
    width: "100%",
    position: "relative",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#CBD5E1",
  },
  imageCorners: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: IMAGE_OVERLAY_HEIGHT,
  },
  heart: {
    position: "absolute",
    zIndex: 2,
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heartUnsaved: { backgroundColor: "#F43F5E" },
  heartSaved: { backgroundColor: "#E11D48" },
  heartPressed: { transform: [{ scale: 0.94 }] },
  copy: {
    position: "absolute",
    zIndex: 1,
    bottom: 16,
    left: 16,
    right: 16,
    gap: 1,
  },
  city: {
    color: flowColors.white,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    letterSpacing: -0.25,
    textShadowColor: "rgba(15, 23, 42, 0.55)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  country: {
    color: flowColors.white,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
    opacity: 0.95,
    textShadowColor: "rgba(15, 23, 42, 0.55)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  ctaSection: {
    width: "100%",
    height: CTA_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: flowColors.white,
    paddingHorizontal: 16,
  },
  ctaPill: {
    minWidth: 156,
    height: 40,
    borderRadius: 999,
    borderColor: "#CBD5E1",
    borderWidth: 1,
    backgroundColor: flowColors.white,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  ctaPressed: { backgroundColor: "#F8FAFC", transform: [{ scale: 0.98 }] },
  ctaText: {
    color: "#1E293B",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
  },
});
