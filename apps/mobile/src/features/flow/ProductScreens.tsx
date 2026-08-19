import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  Field,
  PrimaryButton,
  Segments,
  UnavailableNotice,
} from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles, useFlowTheme } from "./flowStyles";
import { ResponsiveHero } from "./ResponsiveHero";
import { useFeatureAvailability } from "../availability/FeatureAvailability";

function UnavailableProduct({ title, text }: { title: string; text: string }) {
  return <SafeAreaView style={flowStyles.safe}><View style={flowStyles.scroll}><Text accessibilityRole="header" style={flowStyles.title}>{title}</Text><UnavailableNotice text={text} /></View></SafeAreaView>;
}

function Page({
  title,
  children,
  hero,
  heroWidth,
  heroHeight,
  focalY,
}: {
  title: string;
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
            accessibilityLabel={`${title} hero image`}
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
              {title}
            </Text>
          </View>
        </View>
        <View style={styles.body}>{children}</View>
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
  items: { name: string; detail?: string; image?: number }[];
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
            accessibilityLabel={
              onItemPress
                ? item.name === "JFK → LAX"
                  ? "Use JFK to LAX as flight route"
                  : `Use ${item.name} as hotel destination`
                : undefined
            }
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
              <Image source={item.image} style={styles.smallImage} />
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
      title="Flights"
      hero={require("../../../assets/heroes/flights-aircraft.png")}
      heroWidth={307}
      heroHeight={596}
      focalY={0.49}
    >
      <FlightSearchPanel ref={panel} params={params} />
      <Cards
        title="Routes"
        items={[{ name: "JFK → LAX" }]}
        onItemPress={() => panel.current?.useRouteShortcut()}
      />
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
        </View>
        <View style={styles.hotelBody}>
          <HotelSearchPanel ref={panel} params={params} />
          <Cards
            title="Featured destinations"
            items={[
              {
                name: "New York",
                image: require("../../../assets/destinations/new-york.jpg"),
              },
              {
                name: "Paris",
                image: require("../../../assets/destinations/paris.jpg"),
              },
              { name: "Bali" },
            ]}
            onItemPress={(destination) =>
              panel.current?.useDestination(destination)
            }
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
  const ft = useFlowTheme();
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
      title="Cars"
      hero={require("../../../assets/heroes/cars-suv.png")}
      heroWidth={308}
      heroHeight={596}
      focalY={0.66}
    >
      <CarSearchPanel params={params} requireManualDetails />
      <Cards
        title="Vehicle types"
        items={[{ name: "Economy" }, { name: "SUV" }, { name: "Luxury" }]}
      />
      <Text style={[styles.categoryNote, { color: ft.colors.secondaryText }]}>
        Examples of common rental vehicle types. Availability is shown only
        after a search.
      </Text>
    </Page>
  );
}

type DealTab = "hotel-flight" | "hotel-flight-car" | "hotel-car" | "flight-car";
// Theme-aware formatting keeps these test anchors stable: <FlightSearchPanel embedded <HotelSearchPanel embedded <CarSearchPanel embedded FlightSearchPanel embedded showSubmit={false} HotelSearchPanel embedded showSubmit={!includesCar} submitLabel="Search package" CarSearchPanel embedded showSubmit submitLabel="Search package"
const dealTabs: { value: DealTab; label: string }[] = [
  { value: "hotel-flight", label: "Hotel + Flight" },
  { value: "hotel-flight-car", label: "Hotel + Flight + Car" },
  { value: "hotel-car", label: "Hotel + Car" },
  { value: "flight-car", label: "Flight + Car" },
];
function dealTabAvailable(tab: DealTab, availability: ReturnType<typeof useFeatureAvailability>["availability"]) {
  const flight = tab === "hotel-flight" || tab === "hotel-flight-car" || tab === "flight-car";
  const hotel = tab === "hotel-flight" || tab === "hotel-flight-car" || tab === "hotel-car";
  const car = tab === "hotel-flight-car" || tab === "hotel-car" || tab === "flight-car";
  return (!flight || availability.flightSearch) && (!hotel || availability.hotelSearch) && (!car || availability.carSearch);
}

export function DealsScreen() {
  const ft = useFlowTheme();
  const { availability, loading } = useFeatureAvailability();
  const [tab, setTab] = useState<DealTab>("hotel-flight");
  const availableDealTabs = useMemo(() => dealTabs.filter((option) => dealTabAvailable(option.value, availability)), [availability]);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fade, tab]);
  useEffect(() => { if (!availableDealTabs.some((option) => option.value === tab) && availableDealTabs[0]) setTab(availableDealTabs[0].value); }, [availableDealTabs, tab]);
  const includesFlight = tab === "hotel-flight" || tab === "hotel-flight-car" || tab === "flight-car";
  const includesHotel = tab === "hotel-flight" || tab === "hotel-flight-car" || tab === "hotel-car";
  const includesCar = tab === "hotel-flight-car" || tab === "hotel-car" || tab === "flight-car";
  if (loading) return <UnavailableProduct title="Packages" text="Checking package availability…" />;
  if (!availability.deals || availableDealTabs.length === 0) return <UnavailableProduct title="Packages" text="Packages are temporarily unavailable. You can still search available flights, hotels, and cars separately." />;
  return (
    <Page
      title="Packages"
      hero={require("../../../assets/heroes/deals-balloons.png")}
      heroWidth={308}
      heroHeight={596}
      focalY={0.58}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dealTabs}
      >
        {availableDealTabs.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === option.value }}
            onPress={() => setTab(option.value)}
            style={[
              styles.dealTab,
              {
                backgroundColor: ft.colors.card,
                borderColor: ft.colors.border,
              },
              tab === option.value && styles.dealTabSelected,
            ]}
          >
            <Text
              style={[
                styles.dealTabText,
                { color: ft.colors.text },
                tab === option.value && styles.dealTabTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Animated.View
        style={[
          styles.packageCard,
          { backgroundColor: ft.colors.card },
          ft.styles.shadow,
          {
            opacity: fade,
            transform: [
              {
                translateY: fade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          },
        ]}
      >
        {includesFlight ? (
          <View>
            <Text style={[styles.packageSection, { color: ft.colors.text }]}>
              Flights
            </Text>
            <FlightSearchPanel embedded showSubmit={false} params={{}} />
          </View>
        ) : null}
        {includesHotel ? (
          <View
            style={[
              includesFlight && styles.packageDivider,
              { borderTopColor: ft.colors.border },
            ]}
          >
            <Text style={[styles.packageSection, { color: ft.colors.text }]}>
              Hotels
            </Text>
            <HotelSearchPanel
              embedded
              showSubmit={!includesCar}
              submitLabel="Search package"
              params={{}}
            />
          </View>
        ) : null}
        {includesCar ? (
          <View
            style={[
              (includesFlight || includesHotel) && styles.packageDivider,
              { borderTopColor: ft.colors.border },
            ]}
          >
            <Text style={[styles.packageSection, { color: ft.colors.text }]}>
              Cars
            </Text>
            <CarSearchPanel
              embedded
              showSubmit
              submitLabel="Search package"
              params={{}}
            />
          </View>
        ) : null}
      </Animated.View>
    </Page>
  );
}

const styles = StyleSheet.create({
  dealTabs: { gap: 8, paddingHorizontal: 2, paddingVertical: 4 },
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
    color: flowColors.navy,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "800",
    marginHorizontal: 9,
    marginTop: 2,
  },
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
