import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useCallback, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router, useFocusEffect } from "expo-router";
import { travelApi } from "../../api/travelApi";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { FlowIcon, type FlowIconName } from "./FlowIcon";
import { PackagesIcon } from "./PackagesIcon";
import { FlightSearchPanel } from "./FlightSearchPanel";
import { HotelSearchPanel } from "./HotelSearchPanel";
import { CarSearchPanel } from "./CarSearchPanel";
import { PackagesSearchPanel } from "./ProductScreens";
import { flowColors, flowStyles, useFlowTheme } from "./flowStyles";
import { HomepageDealPromos } from "../home/HomepageDealPromos";
import { RegionalDestinationRoutes } from "../home/RegionalDestinationRoutes";
import { HomepageAdventureDiscovery } from "../home/HomepageAdventureDiscovery";
import { PopularDestinationStays } from "../home/PopularDestinationStays";
import { useFeatureAvailability } from "../availability/FeatureAvailability";
import { UnavailableNotice } from "./FlowPrimitives";

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
  const [unreadCount, setUnreadCount] = useState(0);
  useFocusEffect(useCallback(() => { let active = true; void travelApi.notificationUnreadCount().then(({ count }) => { if (active) setUnreadCount(count); }).catch(() => { if (active) setUnreadCount(0); }); return () => { active = false; }; }, []));
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
          {unreadCount > 0 ? <View accessibilityLabel={`${unreadCount} unread notifications`} style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text></View> : null}
        </Pressable>
      </View>
    </View>
  );
}

type HomeProduct = "flights" | "hotels" | "cars" | "packages";

function HomeSearchSurface({ children }: { children: React.ReactNode }) {
  const ft = useFlowTheme();
  return <View style={[ft.styles.card, ft.styles.shadow]}>{children}</View>;
}

const products: {
  id: HomeProduct;
  label: string;
  route: "/flights" | "/hotels" | "/cars" | "/packages";
  icon: FlowIconName | "packages";
}[] = [
  { id: "flights", label: "Flights", route: "/flights", icon: "flight" },
  { id: "hotels", label: "Hotels", route: "/hotels", icon: "hotel" },
  { id: "cars", label: "Cars", route: "/cars", icon: "car" },
  { id: "packages", label: "Packages", route: "/packages", icon: "packages" },
];
export function SharedHomePage() {
  const ft = useFlowTheme();
  const insets = useSafeAreaInsets();
  const { availability } = useFeatureAvailability();
  const [activeProduct, setActiveProduct] = useState<HomeProduct>("flights");

  const searchPanel = {
    flights: availability.flightSearch
      ? <FlightSearchPanel compact enableHomepageDefaultOrigin homepageAirportPicker />
      : <UnavailableNotice text="Flight search is temporarily unavailable. Hotels and cars remain available." />,
    hotels: availability.hotelSearch
      ? <HomeSearchSurface>
          <HotelSearchPanel embedded params={{}} />
        </HomeSearchSurface>
      : <UnavailableNotice text="Hotel search is temporarily unavailable. Flights and cars remain available." />,
    cars: availability.carSearch
      ? <HomeSearchSurface>
          <CarSearchPanel embedded params={{}} />
        </HomeSearchSurface>
      : <UnavailableNotice text="Car search is temporarily unavailable. Flights and hotels remain available." />,
    packages: availability.deals
      ? <PackagesSearchPanel presentation="home" />
      : <UnavailableNotice text="Packages are temporarily unavailable. You can still search available flights, hotels, and cars separately." />,
  } satisfies Record<HomeProduct, React.ReactNode>;

  return (
    <View style={ft.styles.safe}>
      <StatusBar style={ft.theme.dark ? "light" : "dark"} translucent backgroundColor={ft.colors.page} />
      <ScrollView
        style={styles.homeScroll}
        alwaysBounceVertical={false}
        bounces={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
      >
        <View>
          <HomeTopNavigation safeAreaTop={insets.top} />
          <HomeHero />
        </View>
        <View style={[styles.products, { backgroundColor: ft.colors.card }, ft.styles.shadow]}>
          {products.map((product) => {
            const selected = activeProduct === product.id;
            return (
              <Pressable
                key={product.label}
                accessibilityRole="tab"
                accessibilityLabel={product.label}
                accessibilityState={{ selected }}
                onPress={() => setActiveProduct(product.id)}
                style={({ pressed }) => [
                  styles.product,
                  selected && [styles.productActive, { backgroundColor: ft.colors.selected }],
                  pressed && ft.styles.pressed,
                ]}
              >
                {product.icon === "packages" ? (
                  <PackagesIcon color={selected ? flowColors.blue : ft.colors.icon} />
                ) : (
                  <FlowIcon
                    name={product.icon}
                    color={selected ? flowColors.blue : ft.colors.icon}
                  />
                )}
                <Text
                  style={[
                    styles.productText, { color: ft.colors.text },
                    selected && styles.productTextActive,
                  ]}
                >
                  {product.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {searchPanel[activeProduct]}
        <PopularDestinationStays />
        <HomepageAdventureDiscovery />
        <HomepageDealPromos />
        <RegionalDestinationRoutes />
      </ScrollView>
    </View>
  );
}

export const HomeFlowScreen = SharedHomePage;

const styles = StyleSheet.create({
  homeScroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingBottom: 26, gap: 14 },
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
  notificationBadge: { position: "absolute", right: -5, top: -5, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#D92D20" },
  notificationBadgeText: { color: "white", fontSize: 10, fontWeight: "800" },
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
