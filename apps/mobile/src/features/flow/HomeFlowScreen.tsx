import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { readSession } from "../../storage/sessionStorage";
import { FlowIcon, type FlowIconName } from "./FlowIcon";
import { FlightSearchPanel } from "./FlightSearchPanel";
import { flowColors, flowStyles } from "./flowStyles";
import { PopularDestinationStays } from "../home/PopularDestinationStays";

const guestHeroSource = require("../../../assets/heroes/home-santorini.png");
const loggedInHeroSource = {
  uri: "https://kurioticket.com/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg",
};
const LOGGED_IN_HERO_WIDTH = 2047;
const LOGGED_IN_HERO_HEIGHT = 1380;
const LOGGED_IN_HERO_DISPLAY_HEIGHT = 420;

function LoggedInHero({ safeAreaTop }: { safeAreaTop: number }) {
  const { width } = useWindowDimensions();
  const coverScale = Math.max(
    width / LOGGED_IN_HERO_WIDTH,
    LOGGED_IN_HERO_DISPLAY_HEIGHT / LOGGED_IN_HERO_HEIGHT,
  );
  const imageWidth = LOGGED_IN_HERO_WIDTH * coverScale;
  const imageHeight = LOGGED_IN_HERO_HEIGHT * coverScale;

  // Mirrors the mobile web hero's object-cover and object-position: 62% center.
  const imageLeft = -(imageWidth - width) * 0.62;
  const imageTop = -(imageHeight - LOGGED_IN_HERO_DISPLAY_HEIGHT) * 0.5;

  return (
    <View style={styles.loggedInHero}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Traveler with luggage in a modern city"
        resizeMode="stretch"
        source={loggedInHeroSource}
        style={[
          styles.loggedInHeroImage,
          {
            height: imageHeight,
            left: imageLeft,
            top: imageTop,
            width: imageWidth,
          },
        ]}
      />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="horizontalOverlay" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#020617" stopOpacity={0.28} />
            <Stop offset="0.5" stopColor="#020617" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#020617" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="verticalOverlay" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#020617" stopOpacity={0.08} />
            <Stop offset="0.5" stopColor="#020617" stopOpacity={0} />
            <Stop offset="1" stopColor="#020617" stopOpacity={0.1} />
          </LinearGradient>
        </Defs>
        <Rect width="88%" height="100%" fill="url(#horizontalOverlay)" />
        <Rect width="100%" height="100%" fill="url(#verticalOverlay)" />
      </Svg>
      <View
        style={[styles.loggedInHeroHeader, { paddingTop: safeAreaTop + 5 }]}
      >
        <Image
          accessibilityLabel="Kurioticket"
          resizeMode="contain"
          source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
          style={styles.loggedInLogo}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push("/notifications")}
          style={flowStyles.iconButton}
        >
          <FlowIcon name="bell" />
        </Pressable>
      </View>
    </View>
  );
}

const products: {
  label: string;
  route: "/flights" | "/hotels" | "/cars" | "/deals";
  icon: FlowIconName;
}[] = [
  { label: "Flights", route: "/flights", icon: "flight" },
  { label: "Hotels", route: "/hotels", icon: "hotel" },
  { label: "Cars", route: "/cars", icon: "car" },
  { label: "Deals", route: "/deals", icon: "deal" },
];
export function HomeFlowScreen() {
  const insets = useSafeAreaInsets();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    void readSession()
      .then((session) => setIsAuthenticated(session !== null))
      .catch(() => setIsAuthenticated(false));
  }, []);

  return (
    <SafeAreaView style={flowStyles.safe} edges={[]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {isAuthenticated ? (
          <LoggedInHero safeAreaTop={insets.top} />
        ) : (
          <ImageBackground
            accessibilityLabel="Santorini coastline"
            imageStyle={styles.heroImage}
            resizeMode="cover"
            source={guestHeroSource}
            style={styles.hero}
          >
            <View style={[styles.heroOverlay, { paddingTop: insets.top + 6 }]}>
              <View style={styles.brandRow}>
                <Image
                  accessibilityLabel="Kurioticket"
                  resizeMode="contain"
                  source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
                  style={styles.logo}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                  onPress={() => router.push("/notifications")}
                  style={flowStyles.iconButton}
                >
                  <FlowIcon name="bell" />
                </Pressable>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroHeading}>
                  Explore the world with Kurioticket
                </Text>
                <Text style={styles.heroSupportingText}>
                  Compare flights, hotels and cars in one place.
                </Text>
              </View>
            </View>
          </ImageBackground>
        )}
        <View style={[styles.products, flowStyles.shadow]}>
          {products.map((product, index) => (
            <Pressable
              key={product.label}
              accessibilityRole="button"
              accessibilityLabel={`Open ${product.label}`}
              onPress={() => router.push(product.route)}
              style={({ pressed }) => [
                styles.product,
                index === 0 && styles.productActive,
                pressed && flowStyles.pressed,
              ]}
            >
              <FlowIcon
                name={product.icon}
                color={index === 0 ? flowColors.blue : flowColors.navy}
              />
              <Text
                style={[
                  styles.productText,
                  index === 0 && styles.productTextActive,
                ]}
              >
                {product.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <FlightSearchPanel compact />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Track prices and save"
          onPress={() => router.push("/price-alerts")}
          style={({ pressed }) => [
            styles.alert,
            flowStyles.shadow,
            pressed && flowStyles.pressed,
          ]}
        >
          <View style={styles.alertIcon}>
            <FlowIcon name="bell" color={flowColors.blue} />
          </View>
          <View style={styles.grow}>
            <Text style={flowStyles.value}>Track prices & save</Text>
            <Text style={flowStyles.meta}>
              Get alerts when prices drop{"\n"}for your favorite trips.
            </Text>
          </View>
          <FlowIcon name="chevron" />
        </Pressable>
        <PopularDestinationStays />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingBottom: 26, gap: 14 },
  hero: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
  },
  loggedInHero: {
    height: LOGGED_IN_HERO_DISPLAY_HEIGHT,
    marginHorizontal: -14,
    overflow: "hidden",
  },
  loggedInHeroImage: { position: "absolute" },
  loggedInHeroHeader: {
    minHeight: 57,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  loggedInLogo: {
    width: 130,
    height: 32,
    transform: [{ translateY: -10 }],
  },
  heroImage: { borderRadius: 20 },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 15, 34, 0.42)",
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  heroCopy: { maxWidth: 290, gap: 6, marginTop: "auto" },
  heroHeading: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 27,
  },
  heroSupportingText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  brandRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { width: 130, height: 36 },
  products: {
    marginTop: -34,
    minHeight: 78,
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 14,
    overflow: "hidden",
  },
  product: {
    flex: 1,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  productActive: {
    backgroundColor: "#F3F7FF",
    borderBottomColor: flowColors.blue,
    borderBottomWidth: 2,
  },
  productText: { color: flowColors.navy, fontSize: 11, fontWeight: "700" },
  productTextActive: { color: flowColors.blue },
  alert: {
    minHeight: 82,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flowColors.border,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  grow: { flex: 1 },
});
