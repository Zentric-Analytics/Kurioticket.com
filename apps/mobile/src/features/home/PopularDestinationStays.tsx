import { router } from "expo-router";
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
    id: "us-new-york",
    city: "New York",
    country: "United States",
    image: {
      uri: "https://kurioticket.com/images/premium/homepage/destinations/kurioticket-homepage-destination-new-york-statue-liberty-skyline-001.jpg",
    },
  },
  {
    id: "us-miami",
    city: "Miami",
    country: "United States",
    image: {
      uri: "https://kurioticket.com/images/premium/homepage/destinations/kurioticket-homepage-destination-miami-skyline-waterfront-001.jpg",
    },
  },
  {
    id: "us-las-vegas",
    city: "Las Vegas",
    country: "United States",
    image: {
      uri: "https://kurioticket.com/images/premium/homepage/destinations/kurioticket-homepage-destination-las-vegas-strip-night-drone-001.jpg",
    },
  },
  {
    id: "us-los-angeles",
    city: "Los Angeles",
    country: "United States",
    image: {
      uri: "https://kurioticket.com/images/premium/homepage/destinations/kurioticket-homepage-destination-los-angeles-palm-skyline-001.jpg",
    },
  },
  {
    id: "us-london",
    city: "London",
    country: "United Kingdom",
    image: {
      uri: "https://kurioticket.com/images/premium/homepage/destinations/kurioticket-homepage-destination-london-tower-bridge-thames-001.jpg",
    },
  },
  {
    id: "us-paris",
    city: "Paris",
    country: "France",
    image: {
      uri: "https://kurioticket.com/images/premium/homepage/destinations/kurioticket-homepage-destination-paris-eiffel-tower-buildings-001.jpg",
    },
  },
] as const;

export function PopularDestinationStays() {
  const { width } = useWindowDimensions();
  const { savedIds, toggle } = useSavedDestinations();
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
                source={destination.image}
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
