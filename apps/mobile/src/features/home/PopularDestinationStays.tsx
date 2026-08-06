import { router } from "expo-router";
import { useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { AndroidFavoriteButton } from "./AndroidFavoriteButton";
import { flowColors, useFlowTheme } from "../flow/flowStyles";
import { popularDestinationStayNavigation } from "./homepageCardNavigation";

export const popularDestinationStays = [
  {
    id: "ng-dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    image: {
      uri: "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
  },
  {
    id: "ng-london",
    city: "London",
    country: "United Kingdom",
    image: {
      uri: "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
  },
  {
    id: "ng-johannesburg",
    city: "Johannesburg",
    country: "South Africa",
    image: {
      uri: "https://images.unsplash.com/photo-1604633193983-5ad0f0f9d4f8?auto=format&fit=crop&w=1600&q=90",
    },
  },
  {
    id: "ng-accra",
    city: "Accra",
    country: "Ghana",
    image: {
      uri: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1600&q=90",
    },
  },
  {
    id: "ng-nairobi",
    city: "Nairobi",
    country: "Kenya",
    image: {
      uri: "https://images.unsplash.com/photo-1611348586804-61bf6c080437?auto=format&fit=crop&w=1600&q=90",
    },
  },
  {
    id: "ng-istanbul",
    city: "Istanbul",
    country: "Türkiye",
    image: {
      uri: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1600&q=90",
    },
  },
  {
    id: "ng-paris",
    city: "Paris",
    country: "France",
    image: {
      uri: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=90",
    },
  },
] as const;

// Mobile web uses 17.25rem cards: 276px wide with a 288px image and 72px CTA.
// Keeping these dimensions fixed also gives Android and iOS the same proportions.
const CARD_WIDTH = 276;
const IMAGE_HEIGHT = 288;
const CTA_HEIGHT = 72;

export function PopularDestinationStays() {
  const ft = useFlowTheme();
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
      <Text accessibilityRole="header" style={[styles.heading, { color: ft.colors.textPrimary }]}>
        Popular destination stays
      </Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {popularDestinationStays.map((destination) => {
          const saved = savedIds.has(destination.id);
          const imageFailed = failedImageIds.has(destination.id);
          return (
            <Pressable
              key={destination.id}
              accessibilityRole="button"
              accessibilityLabel={`Explore hotel stays in ${destination.city}, ${destination.country}`}
              onPress={() => router.push(popularDestinationStayNavigation(destination))}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.cardSurface}>
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
                >
                  <AndroidFavoriteButton
                    saved={saved}
                    label={`${saved ? "Remove" : "Add"} ${destination.city} ${saved ? "from" : "to"} favorites`}
                    onPress={(event) => {
                      event.stopPropagation();
                      toggle(destination.id);
                    }}
                    style={styles.heart}
                  />
                  <View pointerEvents="none" style={styles.copy}>
                    <Text style={styles.city}>{destination.city}</Text>
                    <Text style={styles.country}>{destination.country}</Text>
                  </View>
                </ImageBackground>
                <View style={styles.ctaSection}>
                  <View style={styles.ctaPill}>
                    <Text style={styles.ctaText}>Explore stays</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14, marginTop: 4 },
  heading: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
  },
  carousel: { gap: 16, paddingBottom: 8, paddingLeft: 2, paddingRight: 34 },
  card: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT + CTA_HEIGHT,
    borderRadius: 16,
    borderColor: "rgba(203, 213, 225, 0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: flowColors.white,
    shadowColor: "#10254D",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  cardSurface: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: IMAGE_HEIGHT,
    justifyContent: "flex-end",
    padding: 16,
  },
  imageCorners: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  heart: { position: "absolute", top: 14, right: 14 },
  copy: {
    zIndex: 1,
    alignSelf: "flex-start",
    backgroundColor: "rgba(2, 15, 42, 0.55)",
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  city: {
    color: flowColors.white,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    letterSpacing: -0.35,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  country: {
    color: flowColors.white,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    letterSpacing: 0.15,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ctaSection: {
    width: "100%",
    minHeight: CTA_HEIGHT,
    alignItems: "flex-start",
    justifyContent: "flex-end",
    backgroundColor: flowColors.white,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
  },
  ctaPill: {
    borderRadius: 999,
    borderColor: "#CBD5E1",
    borderWidth: 1,
    backgroundColor: flowColors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ctaText: {
    color: "#1E293B",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
  },
});
