import { useRef, useState } from "react";
import {
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
import { FlightSearchPanel } from "./FlightSearchPanel";
import { HotelSearchPanel, type HotelSearchHandle } from "./HotelSearchPanel";
import { CarSearchPanel } from "./CarSearchPanel";
import {
  Field,
  PrimaryButton,
  Segments,
  UnavailableNotice,
} from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";
import { ResponsiveHero } from "./ResponsiveHero";


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
  return (
    <SafeAreaView style={flowStyles.safe} edges={[]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
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
  return (
    <>
      <View style={flowStyles.sectionHeader}>
        <Text style={flowStyles.sectionTitle}>{title}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardRow}
      >
        {items.map((item) => (
          <Pressable key={item.name} accessibilityRole={onItemPress ? "button" : undefined} accessibilityLabel={onItemPress ? `Use ${item.name} as hotel destination` : undefined} disabled={!onItemPress} onPress={() => onItemPress?.(item.name)} style={({ pressed }) => [styles.smallCard, flowStyles.shadow, pressed && flowStyles.pressed]}>
            {item.image ? (
              <Image source={item.image} style={styles.smallImage} />
            ) : null}
            <Text style={flowStyles.value}>{item.name}</Text>
            {item.detail ? <Text style={flowStyles.meta}>{item.detail}</Text> : null}
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}
export function FlightsScreen() {
  const params = useLocalSearchParams<{ destination?: string | string[] }>();
  const destination = Array.isArray(params.destination) ? params.destination[0] : params.destination;
  return (
    <Page
      title="Flights"
      hero={require("../../../assets/heroes/flights-aircraft.png")}
      heroWidth={307}
      heroHeight={596}
      focalY={0.49}
    >
      <FlightSearchPanel initialDestination={destination} />
      <Cards
        title="Routes"
        items={[
          { name: "JFK → LAX" },
        ]}
      />
    </Page>
  );
}

export function HotelsScreen() {
  const params = useLocalSearchParams<{ destination?: string | string[]; checkIn?: string | string[]; checkOut?: string | string[]; guests?: string | string[]; rooms?: string | string[] }>();
  const panel = useRef<HotelSearchHandle>(null);
  return (
    <Page
      title="Hotels"
      hero={require("../../../assets/heroes/hotels-room.png")}
      heroWidth={306}
      heroHeight={596}
      focalY={0.63}
    >
      <HotelSearchPanel ref={panel} params={params} />
      <Cards
        title="Featured destinations"
        items={[
          {
            name: "New York",
            image: require("../../../assets/destinations/new-york.jpg"),
          },
          { name: "Paris", image: require("../../../assets/destinations/paris.jpg") },
          { name: "Bali" },
        ]}
        onItemPress={(destination) => panel.current?.useDestination(destination)}
      />
    </Page>
  );
}

export function CarsScreen() {
  const params = useLocalSearchParams<{ pickupLocation?: string | string[]; dropoffLocation?: string | string[]; pickupDate?: string | string[]; pickupTime?: string | string[]; dropoffDate?: string | string[]; dropoffTime?: string | string[]; driverAge?: string | string[] }>();
  return (
    <Page title="Cars" hero={require("../../../assets/heroes/cars-suv.png")} heroWidth={308} heroHeight={596} focalY={0.66}>
      <CarSearchPanel params={params} />
      <Cards title="Vehicle types" items={[{ name: "Economy" }, { name: "SUV" }, { name: "Luxury" }]} />
      <Text style={styles.categoryNote}>Examples of common rental vehicle types. Availability is shown only after a search.</Text>
    </Page>
  );
}

type DealTab = "all" | "flights" | "hotels" | "cars";
export function DealsScreen() {
  const [tab, setTab] = useState<DealTab>("all");
  const deals = [
    {
      name: "Compare flights",
      detail: "Search live provider fares",
      route: "/flights" as const,
      image: require("../../../assets/heroes/flights-aircraft.png"),
    },
    {
      name: "Compare hotels",
      detail: "Search live rooms and availability",
      route: "/hotels" as const,
      image: require("../../../assets/heroes/hotels-room.png"),
    },
    {
      name: "Compare rental cars",
      detail: "Search live rental offers",
      route: "/cars" as const,
      image: require("../../../assets/heroes/cars-suv.png"),
    },
  ];
  return (
    <Page
      title="Deals"
      hero={require("../../../assets/heroes/deals-balloons.png")}
      heroWidth={308}
      heroHeight={596}
      focalY={0.58}
    >
      <View style={[flowStyles.card, flowStyles.shadow]}>
        <Segments
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All Deals", icon: "deal" },
            { value: "flights", label: "Flights", icon: "flight" },
            { value: "hotels", label: "Hotels", icon: "hotel" },
            { value: "cars", label: "Cars", icon: "car" },
          ]}
        />
      </View>
      <View style={flowStyles.sectionHeader}>
        <Text style={flowStyles.sectionTitle}>Compare travel options</Text>
      </View>
      {deals
        .filter(
          (_, i) =>
            tab === "all" || i === ["flights", "hotels", "cars"].indexOf(tab),
        )
        .map((deal) => (
          <Pressable
            key={deal.name}
            accessibilityRole="button"
            onPress={() => router.push(deal.route)}
            style={({ pressed }) => [
              styles.deal,
              flowStyles.shadow,
              pressed && flowStyles.pressed,
            ]}
          >
            <Image source={deal.image} style={styles.dealImage} />
            <View style={styles.grow}>
              <Text style={flowStyles.value}>{deal.name}</Text>
              <Text style={flowStyles.meta}>{deal.detail}</Text>
            </View>
            <FlowIcon name="chevron" size={18} />
          </Pressable>
        ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  categoryNote: { color: flowColors.muted, fontSize: 12, lineHeight: 17, paddingHorizontal: 8, marginTop: -8, marginBottom: 8 },
  page: { paddingHorizontal: 9, paddingBottom: 28 },
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
