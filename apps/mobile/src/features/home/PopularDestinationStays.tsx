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
import { flowColors, flowStyles } from "../flow/flowStyles";

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
                flowStyles.shadow,
                { width: cardWidth },
                pressed && flowStyles.pressed,
              ]}
            >
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
                <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient
                      id={`card-overlay-${destination.id}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <Stop offset="0" stopColor="#020617" stopOpacity={0} />
                      <Stop offset="0.52" stopColor="#020617" stopOpacity={0.06} />
                      <Stop offset="1" stopColor="#020617" stopOpacity={0.78} />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    width="100%"
                    height="100%"
                    rx={18}
                    fill={`url(#card-overlay-${destination.id})`}
                  />
                </Svg>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${saved ? "Remove" : "Add"} ${destination.city} ${saved ? "from" : "to"} favorites`}
                  accessibilityState={{ selected: saved }}
                  hitSlop={8}
                  onPress={(event) => {
                    event.stopPropagation();
                    toggle(destination.id);
                  }}
                  style={[styles.heart, saved && styles.heartSaved]}
                >
                  <FlowIcon name="heart" color="white" size={23} />
                </Pressable>
                <View style={styles.copy}>
                  <Text style={styles.city}>{destination.city}</Text>
                  <Text style={styles.country}>{destination.country}</Text>
                </View>
              </ImageBackground>
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
    borderRadius: 18,
    backgroundColor: "#DCE5F3",
    overflow: "hidden",
  },
  image: { flex: 1, justifyContent: "flex-end", padding: 18 },
  imageCorners: { borderRadius: 18 },
  heart: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(2, 15, 42, 0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  heartSaved: { backgroundColor: "rgba(7, 84, 247, 0.88)" },
  copy: { zIndex: 1 },
  city: {
    color: "white",
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
  },
  country: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
});
