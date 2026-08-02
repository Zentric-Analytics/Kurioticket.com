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
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";

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

export function PopularDestinationStays() {
  const { width } = useWindowDimensions();
  const { savedIds, toggle } = useSavedDestinations();
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const cardWidth = Math.min(280, Math.max(230, width * 0.7));

  return (
    <View
      collapsable={false}
      testID="popular-destination-stays"
      style={styles.section}
    >
      <Text accessibilityRole="header" style={styles.heading}>
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
              onPress={() =>
                router.push({
                  pathname: "/hotels",
                  params: { destination: destination.city },
                })
              }
              style={({ pressed }) => [
                styles.card,
                { width: cardWidth },
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
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${saved ? "Remove" : "Add"} ${destination.city} ${saved ? "from" : "to"} favorites`}
                    accessibilityState={{ selected: saved }}
                    hitSlop={8}
                    onPress={(event) => {
                      event.stopPropagation();
                      toggle(destination.id);
                    }}
                    style={({ pressed }) => [
                      styles.heart,
                      saved && styles.heartSaved,
                      pressed && styles.heartPressed,
                    ]}
                  >
                    <FlowIcon name="heart" color="white" size={22} />
                  </Pressable>
                  <View pointerEvents="none" style={styles.copy}>
                    <Text style={styles.city}>{destination.city}</Text>
                    <Text style={styles.country}>{destination.country}</Text>
                  </View>
                </ImageBackground>
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
    color: flowColors.navy,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
  },
  carousel: { gap: 14, paddingBottom: 8, paddingRight: 34 },
  card: {
    height: 350,
    borderRadius: 20,
    backgroundColor: "#DCE5F3",
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
    borderRadius: 20,
    overflow: "hidden",
  },
  image: { flex: 1, justifyContent: "flex-end", padding: 16 },
  imageCorners: { borderRadius: 20 },
  heart: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.46)",
    backgroundColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  heartSaved: {
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(6,76,247,0.92)",
  },
  heartPressed: { opacity: 0.76, transform: [{ scale: 0.94 }] },
  copy: {
    zIndex: 1,
    alignSelf: "flex-start",
    backgroundColor: "rgba(2, 15, 42, 0.55)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  city: {
    color: "white",
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: -0.35,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  country: {
    color: "white",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    letterSpacing: 0.15,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
