import { useMemo, useRef } from "react";
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import {
  FlightSearchPanel,
  type FlightSearchHandle,
} from "./FlightSearchPanel";
import { HotelSearchPanel, type HotelSearchHandle } from "./HotelSearchPanel";
import { CarSearchPanel } from "./CarSearchPanel";
import {
  UnavailableNotice,
} from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles, useFlowTheme } from "./flowStyles";
import { ResponsiveHero } from "./ResponsiveHero";
import { useFeatureAvailability } from "../availability/FeatureAvailability";
import { PackageSearchForm } from "./PackageSearchForm";
import { packageModes, type PackageMode } from "./packageSearchModel";
import {
  primaryHotelDestinationCards,
  travelEntryPresentation,
} from "../../../../../src/shared/presentation/travelEntryPresentation";
import { buildHotelExplorationSearch } from "../../../../../src/lib/hotels/hotelExplorationSearch";

function UnavailableProduct({ title, text }: { title: string; text: string }) {
  return <SafeAreaView style={flowStyles.safe}><View style={flowStyles.scroll}><Text accessibilityRole="header" style={flowStyles.title}>{title}</Text><UnavailableNotice text={text} /></View></SafeAreaView>;
}

function Page({
  productTitle,
  heroTitle,
  heroSubtitle,
  children,
  hero,
  heroWidth,
  heroHeight,
  focalY,
}: {
  productTitle: string;
  heroTitle: string;
  heroSubtitle?: string;
  children: React.ReactNode;
  hero: number;
  heroWidth: number;
  heroHeight: number;
  focalY: number;
}) {
  const insets = useSafeAreaInsets();
  const ft = useFlowTheme();
  return (
    <SafeAreaView style={ft.styles.safe} edges={[]}>
      <StatusBar
        style={ft.theme.dark ? "light" : "dark"}
        translucent
        backgroundColor="transparent"
      />
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
      >
        <View style={styles.heroShell}>
          <ResponsiveHero
            source={hero}
            sourceWidth={heroWidth}
            sourceHeight={heroHeight}
            height={290}
            focalY={focalY}
            accessibilityLabel={`${productTitle} hero image`}
          />
          <View style={[styles.heroHeader, { paddingTop: insets.top + 4 }]}>
            <View style={styles.heroActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={flowStyles.iconButton}
              >
                <FlowIcon name="back" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => router.push("/notifications")}
                style={flowStyles.iconButton}
              >
                <FlowIcon name="bell" />
              </Pressable>
            </View>
            <Text accessibilityRole="header" style={styles.heroTitle}>
              {heroTitle}
            </Text>
            {heroSubtitle ? <Text style={styles.heroSubtitle}>{heroSubtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.body}>
          <Text accessibilityRole="header" style={[ft.styles.sectionTitle, styles.productTitle]}>{productTitle}</Text>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function Cards({
  title,
  items,
  onItemPress,
}: {
  title: string;
  items: { name: string; detail?: string; image?: ImageSourcePropType; imageAlt?: string; accessibilityLabel?: string }[];
  onItemPress?: (name: string) => void;
}) {
  const ft = useFlowTheme();
  return (
    <>
      <View style={ft.styles.sectionHeader}>
        <Text style={ft.styles.sectionTitle}>{title}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardRow}
      >
        {items.map((item) => (
          <Pressable
            key={item.name}
            accessibilityRole={onItemPress ? "button" : undefined}
            accessibilityLabel={onItemPress ? item.accessibilityLabel ?? `Use ${item.name} as hotel destination` : undefined}
            disabled={!onItemPress}
            onPress={() => onItemPress?.(item.name)}
            style={({ pressed }) => [
              styles.smallCard,
              {
                backgroundColor: ft.colors.card,
                borderColor: ft.colors.border,
              },
              ft.styles.shadow,
              pressed && ft.styles.pressed,
            ]}
          >
            {item.image ? (
              <Image source={item.image} accessibilityLabel={item.imageAlt} style={styles.smallImage} />
            ) : null}
            <Text style={ft.styles.value}>{item.name}</Text>
            {item.detail ? (
              <Text style={ft.styles.meta}>{item.detail}</Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}
export function FlightsScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const panel = useRef<FlightSearchHandle>(null);
  const { availability, loading } = useFeatureAvailability();
  if (loading) return <UnavailableProduct title="Flights" text="Checking flight search availability…" />;
  if (!loading && !availability.flightSearch) return <UnavailableProduct title="Flights" text="Flight search is temporarily unavailable. Your saved items and alerts are unchanged." />;
  return (
    <Page
      productTitle={travelEntryPresentation.flights.product}
      heroTitle={travelEntryPresentation.flights.heroTitle}
      heroSubtitle={travelEntryPresentation.flights.heroSubtitle}
      hero={require("../../../assets/heroes/flights-aircraft.png")}
      heroWidth={307}
      heroHeight={596}
      focalY={0.49}
    >
      <FlightSearchPanel ref={panel} params={params} />
    </Page>
  );
}

export function HotelsScreen() {
  const ft = useFlowTheme();
  const params = useLocalSearchParams<{
    destination?: string | string[];
    checkIn?: string | string[];
    checkOut?: string | string[];
    guests?: string | string[];
    rooms?: string | string[];
  }>();
  const panel = useRef<HotelSearchHandle>(null);
  const openFeaturedDestination = (destinationQuery: string) => {
    const destination = primaryHotelDestinationCards.find(
      (card) => card.destinationQuery === destinationQuery,
    );
    if (!destination) return;
    const params = buildHotelExplorationSearch({
      destination: destination.destinationQuery,
      destinationId: destination.canonicalDestinationId,
      source: "hotels-featured",
    });
    if (params) router.push({ pathname: "/hotel-results", params });
  };
  const { availability, loading } = useFeatureAvailability();
  if (loading) return <UnavailableProduct title="Hotels" text="Checking hotel search availability…" />;
  if (!loading && !availability.hotelSearch) return <UnavailableProduct title="Hotels" text="Hotel search is temporarily unavailable. Flights and cars remain available." />;
  return (
    <ThemedHotelsRoot>
      <StatusBar
        style={ft.theme.dark ? "light" : "dark"}
        translucent
        backgroundColor="transparent"
      />
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        contentContainerStyle={styles.hotelPage}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
      >
        <View style={styles.hotelHero}>
          <ResponsiveHero
            source={require("../../../assets/heroes/hotels-room.png")}
            sourceWidth={306}
            sourceHeight={596}
            height={290}
            focalY={0.63}
            accessibilityLabel="Hotels hero image"
          />
          <View pointerEvents="none" style={styles.hotelHeroOverlay} />
          <Text accessibilityRole="header" style={styles.hotelHeroTitle}>{travelEntryPresentation.hotels.heroTitle}</Text>
        </View>
        <View style={styles.hotelBody}>
          <Text accessibilityRole="header" style={[ft.styles.sectionTitle, styles.productTitle]}>{travelEntryPresentation.hotels.product}</Text>
          <HotelSearchPanel ref={panel} params={params} />
          <Cards
            title="Explore hotel stays by destination"
            items={primaryHotelDestinationCards.map((destination) => ({
              name: destination.destinationQuery,
              detail: destination.title,
              image: { uri: destination.image },
              imageAlt: destination.imageAlt,
              accessibilityLabel: destination.linkLabel,
            }))}
            onItemPress={openFeaturedDestination}
          />
        </View>
      </ScrollView>
    </ThemedHotelsRoot>
  );
}

function ThemedHotelsRoot({ children }: { children: React.ReactNode }) {
  const ft = useFlowTheme();
  return <View style={ft.styles.safe}>{children}</View>;
}

export function CarsScreen() {
  const params = useLocalSearchParams<{
    pickupLocation?: string | string[];
    dropoffLocation?: string | string[];
    pickupDate?: string | string[];
    pickupTime?: string | string[];
    dropoffDate?: string | string[];
    dropoffTime?: string | string[];
    driverAge?: string | string[];
  }>();
  const { availability, loading } = useFeatureAvailability();
  if (loading) return <UnavailableProduct title="Cars" text="Checking car search availability…" />;
  if (!loading && !availability.carSearch) return <UnavailableProduct title="Cars" text="Car search is temporarily unavailable. Flights and hotels remain available." />;
  return (
    <Page
      productTitle={travelEntryPresentation.cars.product}
      heroTitle={travelEntryPresentation.cars.heroTitle}
      hero={require("../../../assets/heroes/cars-suv.png")}
      heroWidth={308}
      heroHeight={596}
      focalY={0.66}
    >
      <CarSearchPanel params={params} requireManualDetails />
    </Page>
  );
}

function dealTabAvailable(tab: PackageMode, availability: ReturnType<typeof useFeatureAvailability>["availability"]) {
  const flight = tab === "hotel-flight" || tab === "hotel-flight-car" || tab === "flight-car";
  const hotel = tab === "hotel-flight" || tab === "hotel-flight-car" || tab === "hotel-car";
  const car = tab === "hotel-flight-car" || tab === "hotel-car" || tab === "flight-car";
  return (!flight || availability.flightSearch) && (!hotel || availability.hotelSearch) && (!car || availability.carSearch);
}

export function DealsScreen() {
  const { availability, loading } = useFeatureAvailability();
  if (loading) return <UnavailableProduct title="Packages" text="Checking package availability…" />;
  if (!availability.deals) return <UnavailableProduct title="Packages" text="Packages are temporarily unavailable. You can still search available flights, hotels, and cars separately." />;
  return (
    <Page
      productTitle="Packages"
      heroTitle="Packages"
      hero={require("../../../assets/heroes/deals-balloons.png")}
      heroWidth={308}
      heroHeight={596}
      focalY={0.58}
    >
      <PackagesSearchPanel />
    </Page>
  );
}

type PackagesSearchPanelProps = {
  presentation?: "standalone" | "home";
};

export function PackagesSearchPanel({
  presentation = "standalone",
}: PackagesSearchPanelProps) {
  const ft = useFlowTheme();
  const { availability, loading } = useFeatureAvailability();
  const availableDealTabs = useMemo(() => packageModes.filter(option => dealTabAvailable(option.value, availability)), [availability]);
  const isHome = presentation === "home";
  if (loading) return <UnavailableNotice text="Checking package availability…" />;
  if (!availability.deals || availableDealTabs.length === 0) return <UnavailableNotice text="Packages are temporarily unavailable. You can still search available flights, hotels, and cars separately." />;
  const packageBuilder = <PackageSearchForm presentation={presentation} />;
  return isHome ? (
    <View style={[ft.styles.card, ft.styles.shadow]}>{packageBuilder}</View>
  ) : packageBuilder;
}

const styles = StyleSheet.create({
  dealTabs: { gap: 8, paddingHorizontal: 2, paddingVertical: 4 },
  homeDealTabs: { paddingHorizontal: 12, paddingTop: 12 },
  dealTab: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: flowColors.border,
  },
  dealTabSelected: {
    backgroundColor: flowColors.blue,
    borderColor: flowColors.blue,
  },
  dealTabText: { color: flowColors.navy, fontSize: 14, fontWeight: "700" },
  dealTabTextSelected: { color: "white" },
  packageCard: {
    marginTop: 12,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "white",
  },
  packageSection: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 4,
    color: flowColors.navy,
    fontSize: 17,
    fontWeight: "800",
  },
  packageDivider: { borderTopWidth: 1, borderTopColor: flowColors.border },
  categoryNote: {
    color: flowColors.muted,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 8,
    marginTop: -8,
    marginBottom: 8,
  },
  page: { paddingHorizontal: 9, paddingBottom: 28 },
  hotelPage: { paddingHorizontal: 14, paddingBottom: 28 },
  hotelHero: { height: 290, marginHorizontal: -14, overflow: "hidden" },
  hotelHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#071A4866",
  },
  hotelBody: { marginTop: -22, gap: 10 },
  heroShell: { height: 290, marginHorizontal: -9, overflow: "hidden" },
  heroHeader: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 5 },
  heroActions: { flexDirection: "row", justifyContent: "space-between" },
  heroTitle: {
    color: "white",
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    marginHorizontal: 9,
    marginTop: 8,
    maxWidth: 330,
  },
  heroSubtitle: { color: "white", fontSize: 14, lineHeight: 20, marginHorizontal: 9, marginTop: 6, maxWidth: 330 },
  hotelHeroTitle: { position: "absolute", left: 14, right: 14, bottom: 38, color: "white", fontSize: 25, lineHeight: 31, fontWeight: "800" },
  productTitle: { paddingHorizontal: 8, paddingTop: 4 },
  body: { marginTop: -22, gap: 12 },
  row: { flexDirection: "row" },
  half: { flex: 1 },
  pad: { padding: 8 },
  inputField: {
    minHeight: 76,
    padding: 12,
    borderBottomColor: flowColors.border,
    borderBottomWidth: 1,
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: { flex: 1, minHeight: 42, color: flowColors.navy, fontSize: 14 },
  cardRow: { gap: 8, paddingBottom: 5 },
  smallCard: {
    width: 116,
    minHeight: 82,
    backgroundColor: "white",
    borderRadius: 10,
    borderColor: flowColors.border,
    borderWidth: 1,
    padding: 9,
  },
  smallImage: {
    height: 86,
    margin: -9,
    marginBottom: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  checkboxRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: flowColors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: flowColors.blue, borderColor: flowColors.blue },
  deal: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 11,
    backgroundColor: "white",
    padding: 8,
    borderColor: flowColors.border,
    borderWidth: 1,
  },
  dealImage: { width: 76, height: 68, borderRadius: 9 },
  grow: { flex: 1 },
  price: { color: flowColors.navy, fontSize: 12, fontWeight: "800" },
  discount: { color: flowColors.red, fontSize: 11, fontWeight: "800" },
  green: { color: flowColors.green },
  why: { marginTop: 10 },
  benefit: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 11,
    borderColor: flowColors.border,
    borderWidth: 1,
  },
});
