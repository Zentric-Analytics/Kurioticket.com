import { Text, HomePresentationProvider } from "../home/HomePresentation";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  useWindowDimensions,
  View,
} from "react-native";
import { useCallback, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router, useFocusEffect } from "expo-router";
import { travelApi } from "../../api/travelApi";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { CarFront, Hotel, Luggage, Plane } from "lucide-react-native";
import { FlowIcon } from "./FlowIcon";
import { FlightSearchPanel } from "./FlightSearchPanel";
import { HotelSearchPanel } from "./HotelSearchPanel";
import { CarSearchPanel } from "./CarSearchPanel";
import { PackagesSearchPanel } from "./ProductScreens";
import { flowColors, flowStyles, useFlowTheme } from "./flowStyles";
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
const HOME_CONTENT_HORIZONTAL_PADDING = 14;
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
          <View pointerEvents="none" style={styles.notificationIconWrap}>
            <FlowIcon name="bell" color={ft.colors.icon} />
            {unreadCount > 0 ? <View accessibilityLabel={`${unreadCount} unread notifications`} style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text></View> : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

type HomeProduct = "flights" | "hotels" | "cars" | "packages";

function HomeHotelSearchSurface({ children }: { children: React.ReactNode }) {
  const ft = useFlowTheme();
  return (
    <View
      style={[
        styles.homeHotelSearchSurface,
        {
          backgroundColor: ft.colors.page,
          shadowColor: ft.colors.shadow,
          shadowOpacity: ft.theme.dark ? 0.07 : 0.08,
        },
      ]}
    >
      {children}
    </View>
  );
}

function HomeCarsSearchSurface({ children }: { children: React.ReactNode }) {
  const ft = useFlowTheme();
  return (
    <View
      style={[
        styles.homeCarsSearchSurface,
        {
          backgroundColor: ft.colors.page,
          shadowColor: ft.colors.shadow,
          shadowOpacity: ft.theme.dark ? 0.07 : 0.08,
        },
      ]}
    >
      {children}
    </View>
  );
}

function HomeFlightSearchSurface({ children }: { children: React.ReactNode }) {
  const ft = useFlowTheme();
  return (
    <View
      style={[
        styles.homeFlightSearchSurface,
        {
          backgroundColor: ft.colors.page,
          shadowColor: ft.colors.shadow,
          shadowOpacity: ft.theme.dark ? 0.07 : 0.08,
        },
      ]}
    >
      {children}
    </View>
  );
}

const productIcons = { flight: Plane, hotel: Hotel, car: CarFront, packages: Luggage };

const products: {
  id: HomeProduct;
  label: string;
  route: "/flights" | "/hotels" | "/cars" | "/packages";
  icon: keyof typeof productIcons;
}[] = [
  { id: "flights", label: "Flights", route: "/flights", icon: "flight" },
  { id: "hotels", label: "Hotels", route: "/hotels", icon: "hotel" },
  { id: "cars", label: "Cars", route: "/cars", icon: "car" },
  { id: "packages", label: "Packages", route: "/packages", icon: "packages" },
];
function HomePageContent() {
  const ft = useFlowTheme();
  const insets = useSafeAreaInsets();
  const { availability } = useFeatureAvailability();
  const [activeProduct, setActiveProduct] = useState<HomeProduct>("flights");

  const searchPanel = {
    flights: availability.flightSearch
      ? <HomeFlightSearchSurface>
          <FlightSearchPanel compact structuredSearchAppearance enableHomepageDefaultOrigin homepageAirportPicker />
        </HomeFlightSearchSurface>
      : <UnavailableNotice text="Flight search is temporarily unavailable. Hotels and cars remain available." />,
    hotels: availability.hotelSearch
      ? <HomeHotelSearchSurface>
          <HotelSearchPanel embedded params={{}} />
        </HomeHotelSearchSurface>
      : <UnavailableNotice text="Hotel search is temporarily unavailable. Flights and cars remain available." />,
    cars: availability.carSearch
      ? <HomeCarsSearchSurface>
          <CarSearchPanel embedded params={{}} startWithEmptyRentalDates />
        </HomeCarsSearchSurface>
      : <UnavailableNotice text="Car search is temporarily unavailable. Flights and hotels remain available." />,
    packages: availability.deals
      ? <HomeFlightSearchSurface>
          <PackagesSearchPanel presentation="home" />
        </HomeFlightSearchSurface>
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
            const ProductIcon = productIcons[product.icon];
            return (
              <Pressable
                key={product.label}
                accessibilityRole="tab"
                accessibilityLabel={product.label}
                accessibilityState={{ selected }}
                onPress={() => setActiveProduct(product.id)}
                style={({ pressed }) => [
                  styles.product,
                  selected && [styles.productActive, { backgroundColor: ft.colors.selected, borderBottomColor: ft.colors.selectedBorder }],
                  pressed && ft.styles.pressed,
                ]}
              >
                <ProductIcon
                  size={28}
                  strokeWidth={1.3}
                  color={selected ? ft.colors.selectedLabelText : (ft.theme.dark ? ft.colors.icon : "#1A1A1A")}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <NativeText
                  style={[
                    styles.productText, { color: ft.theme.dark ? ft.colors.text : "#1A1A1A" },
                    selected && { color: ft.colors.selectedLabelText },
                  ]}
                >
                  {product.label}
                </NativeText>
              </Pressable>
            );
          })}
        </View>
        {searchPanel[activeProduct]}
        <PopularDestinationStays compactTopSpacing={activeProduct === "flights"} />
        <HomepageAdventureDiscovery />
        <RegionalDestinationRoutes />
      </ScrollView>
    </View>
  );
}

export function SharedHomePage() {
  return <HomePresentationProvider><HomePageContent /></HomePresentationProvider>;
}

export const HomeFlowScreen = SharedHomePage;

const styles = StyleSheet.create({
  homeScroll: { flex: 1 },
  content: { paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING, paddingBottom: 26, gap: 14 },
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
  notificationIconWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  notificationBadge: { position: "absolute", right: -4, top: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#D92D20" },
  notificationBadgeText: { color: "white", fontSize: 10, fontWeight: "800" },
  homeFlightSearchSurface: {
    marginHorizontal: -HOME_CONTENT_HORIZONTAL_PADDING,
    paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING,
    paddingBottom: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 1,
  },
  homeHotelSearchSurface: {
    marginHorizontal: -HOME_CONTENT_HORIZONTAL_PADDING,
    paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING + 8,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 1,
  },
  homeCarsSearchSurface: {
    marginHorizontal: -HOME_CONTENT_HORIZONTAL_PADDING,
    paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING + 8,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 1,
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
  productText: { color: flowColors.navy, fontSize: 14, lineHeight: 20, fontWeight: "500" },
});
