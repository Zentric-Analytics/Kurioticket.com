import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { FlowIcon, type FlowIconName } from "./FlowIcon";
import { FlightSearchPanel } from "./FlightSearchPanel";
import { flowColors, flowStyles, useFlowTheme } from "./flowStyles";
import { PopularDestinationStays } from "../home/PopularDestinationStays";
import { HomepageDealPromos } from "../home/HomepageDealPromos";
import { RegionalDestinationRoutes } from "../home/RegionalDestinationRoutes";

const homeHeroSource = {
  uri: "https://kurioticket.com/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg",
};
const HOME_HERO_WIDTH = 2047;
const HOME_HERO_HEIGHT = 1380;
const HOME_HERO_DISPLAY_HEIGHT = 300;
const HOME_HERO_HORIZONTAL_OVERLAY_START_OPACITY = 0.16;
const HOME_HERO_HORIZONTAL_OVERLAY_MID_OPACITY = 0.035;
const HOME_HERO_VERTICAL_OVERLAY_START_OPACITY = 0.035;
const HOME_HERO_VERTICAL_OVERLAY_END_OPACITY = 0.055;

function HomeHero() {
  const { width } = useWindowDimensions();
  const coverScale = Math.max(
    width / HOME_HERO_WIDTH,
    HOME_HERO_DISPLAY_HEIGHT / HOME_HERO_HEIGHT,
  );
  const imageWidth = HOME_HERO_WIDTH * coverScale;
  const imageHeight = HOME_HERO_HEIGHT * coverScale;

  // Mirrors the mobile web hero's object-cover and object-position: 62% center.
  const imageLeft = -(imageWidth - width) * 0.62;
  const imageTop = -(imageHeight - HOME_HERO_DISPLAY_HEIGHT) * 0.5;

  return (
    <View style={styles.homeHero}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Traveler with luggage in a modern city"
        resizeMode="stretch"
        source={homeHeroSource}
        style={[
          styles.homeHeroImage,
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
            <Stop offset="0" stopColor="#020617" stopOpacity={HOME_HERO_HORIZONTAL_OVERLAY_START_OPACITY} />
            <Stop offset="0.5" stopColor="#020617" stopOpacity={HOME_HERO_HORIZONTAL_OVERLAY_MID_OPACITY} />
            <Stop offset="1" stopColor="#020617" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="verticalOverlay" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#020617" stopOpacity={HOME_HERO_VERTICAL_OVERLAY_START_OPACITY} />
            <Stop offset="0.5" stopColor="#020617" stopOpacity={0} />
            <Stop offset="1" stopColor="#020617" stopOpacity={HOME_HERO_VERTICAL_OVERLAY_END_OPACITY} />
          </LinearGradient>
        </Defs>
        <Rect width="88%" height="100%" fill="url(#horizontalOverlay)" />
        <Rect width="100%" height="100%" fill="url(#verticalOverlay)" />
      </Svg>
    </View>
  );
}

export function HomeTopNavigation({ safeAreaTop }: { safeAreaTop: number }) {
  const ft = useFlowTheme();
  return (
    <View pointerEvents="box-none" style={[styles.homeTopNavigation, { backgroundColor: ft.colors.surface, borderBottomColor: ft.colors.border }]}>
      <View style={{ height: safeAreaTop }} />
      <View
        pointerEvents="box-none"
        style={styles.homeTopNavigationContent}
      >
        <Image
          accessibilityLabel="Kurioticket"
          resizeMode="contain"
          source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
          style={styles.homeLogo}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push("/notifications")}
          style={ft.styles.iconButton}
        >
          <FlowIcon name="bell" color={ft.colors.icon} />
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
export function SharedHomePage() {
  const ft = useFlowTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={ft.styles.safe}>
      <StatusBar style={ft.theme.dark ? "light" : "dark"} translucent backgroundColor={ft.colors.page} />
      <ScrollView
        style={styles.homeScroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <HomeTopNavigation safeAreaTop={insets.top} />
          <HomeHero />
        </View>
        <View style={[styles.products, { backgroundColor: ft.colors.card }, ft.styles.shadow]}>
          {products.map((product, index) => (
            <Pressable
              key={product.label}
              accessibilityRole="button"
              accessibilityLabel={`Open ${product.label}`}
              onPress={() => router.push(product.route)}
              style={({ pressed }) => [
                styles.product,
                index === 0 && [styles.productActive, { backgroundColor: ft.colors.selected }],
                pressed && ft.styles.pressed,
              ]}
            >
              <FlowIcon
                name={product.icon}
                color={index === 0 ? flowColors.blue : ft.colors.icon}
              />
              <Text
                style={[
                  styles.productText, { color: ft.colors.text },
                  index === 0 && styles.productTextActive,
                ]}
              >
                {product.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <FlightSearchPanel compact enableHomepageDefaultOrigin homepageAirportPicker />
        <PopularDestinationStays />
        <HomepageDealPromos />
        <RegionalDestinationRoutes />
      </ScrollView>
    </View>
  );
}

export const HomeFlowScreen = SharedHomePage;

const styles = StyleSheet.create({
  homeScroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingBottom: 120, gap: 14 },
  homeHero: {
    height: HOME_HERO_DISPLAY_HEIGHT,
    marginHorizontal: -14,
    overflow: "hidden",
  },
  homeHeroImage: { position: "absolute" },
  homeTopNavigation: {
    backgroundColor: "white",
    marginHorizontal: -14,
    borderBottomColor: flowColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  homeTopNavigationContent: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeLogo: {
    width: 130,
    height: 32,
  },
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
});
