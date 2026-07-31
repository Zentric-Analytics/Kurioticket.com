import { useState } from "react";
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
import { destinationImages } from "./flowData";
import { FlightSearchPanel } from "./FlightSearchPanel";
import {
  Field,
  PrimaryButton,
  Segments,
  UnavailableNotice,
} from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";
import { ResponsiveHero } from "./ResponsiveHero";

const futureIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const displayDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });

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
}: {
  title: string;
  items: { name: string; price: string; image?: number }[];
}) {
  return (
    <>
      <View style={flowStyles.sectionHeader}>
        <Text style={flowStyles.sectionTitle}>{title}</Text>
        <Pressable accessibilityRole="button" onPress={() => undefined}>
          <Text style={flowStyles.viewAll}>View all</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardRow}
      >
        {items.map((item) => (
          <View key={item.name} style={[styles.smallCard, flowStyles.shadow]}>
            {item.image ? (
              <Image source={item.image} style={styles.smallImage} />
            ) : null}
            <Text style={flowStyles.value}>{item.name}</Text>
            <Text style={flowStyles.meta}>{item.price}</Text>
          </View>
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
        title="Popular routes"
        items={[
          { name: "JFK → LAX", price: "from $320" },
          { name: "JFK → MIA", price: "from $210" },
        ]}
      />
    </Page>
  );
}

export function HotelsScreen() {
  const [destination, setDestination] = useState("");
  const checkIn = futureIso(14);
  const checkOut = futureIso(17);
  return (
    <Page
      title="Hotels"
      hero={require("../../../assets/heroes/hotels-room.png")}
      heroWidth={306}
      heroHeight={596}
      focalY={0.63}
    >
      <View style={[flowStyles.card, flowStyles.shadow]}>
        <View style={styles.inputField}>
          <Text style={flowStyles.label}>Destination</Text>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel="Destination"
              value={destination}
              onChangeText={setDestination}
              placeholder="Enter city or hotel"
              placeholderTextColor={flowColors.muted}
              style={styles.input}
            />
            <FlowIcon name="location" size={20} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Check-in" value={displayDate(checkIn)} />
          </View>
          <View style={styles.half}>
            <Field label="Check-out" value={displayDate(checkOut)} />
          </View>
        </View>
        <Field
          label="Guests"
          value="1 Room, 2 Guests"
          trailing={<FlowIcon name="chevron" size={18} />}
        />
        <View style={styles.pad}>
          <PrimaryButton
            label="Search hotels"
            onPress={() => destination.trim() ? router.push({ pathname: "/hotel-results", params: { destination: destination.trim(), checkIn, checkOut, rooms: "1", guests: "2" } }) : undefined}
          />
        </View>
      </View>
      <Cards
        title="Popular destinations"
        items={[
          {
            name: "New York",
            price: "from $120",
            image: destinationImages["New York"],
          },
          { name: "Paris", price: "from $140", image: destinationImages.Paris },
          { name: "Bali", price: "from $90", image: destinationImages.Bali },
        ]}
      />
    </Page>
  );
}

export function CarsScreen() {
  const [location, setLocation] = useState("");
  const [different, setDifferent] = useState(false);
  const pickupDate = futureIso(14);
  const dropoffDate = futureIso(17);
  return (
    <Page
      title="Cars"
      hero={require("../../../assets/heroes/cars-suv.png")}
      heroWidth={308}
      heroHeight={596}
      focalY={0.66}
    >
      <View style={[flowStyles.card, flowStyles.shadow]}>
        <View style={styles.inputField}>
          <Text style={flowStyles.label}>Pick-up location</Text>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel="Pick-up location"
              value={location}
              onChangeText={setLocation}
              placeholder="Enter city or airport"
              placeholderTextColor={flowColors.muted}
              style={styles.input}
            />
            <FlowIcon name="location" size={20} />
          </View>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: different }}
          onPress={() => setDifferent(!different)}
          style={styles.checkboxRow}
        >
          <View style={[styles.checkbox, different && styles.checked]}>
            {different ? (
              <FlowIcon name="check" color="white" size={15} />
            ) : null}
          </View>
          <Text style={flowStyles.meta}>Return to a different location</Text>
        </Pressable>
        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Pick-up date" value={displayDate(pickupDate)} />
          </View>
          <View style={styles.half}>
            <Field label="Time" value="10:00 AM" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Return date" value={displayDate(dropoffDate)} />
          </View>
          <View style={styles.half}>
            <Field label="Time" value="10:00 AM" />
          </View>
        </View>
        <Field
          label="Driver age"
          value="30 – 65 years"
          trailing={<FlowIcon name="chevron" size={18} />}
        />
        <View style={styles.pad}>
          <PrimaryButton
            label="Search cars"
            onPress={() => location.trim() ? router.push({ pathname: "/car-results", params: { pickupLocation: location.trim(), dropoffLocation: location.trim(), pickupDate, dropoffDate, pickupTime: "10:00", dropoffTime: "10:00", driverAge: "30" } }) : undefined}
          />
        </View>
      </View>
      <Cards
        title="Top car categories"
        items={[
          { name: "Economy", price: "from $25/day" },
          { name: "SUV", price: "from $45/day" },
          { name: "Luxury", price: "from $85/day" },
        ]}
      />
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
      image: destinationImages.London,
    },
    {
      name: "Compare hotels",
      detail: "Search live rooms and availability",
      route: "/hotels" as const,
      image: destinationImages.Bali,
    },
    {
      name: "Compare rental cars",
      detail: "Search live rental offers",
      route: "/cars" as const,
      image: destinationImages["New York"],
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
        <Text style={flowStyles.sectionTitle}>Today’s top deals</Text>
        <Text style={flowStyles.viewAll}>View all</Text>
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
      <Text style={[flowStyles.sectionTitle, styles.why]}>
        Why book with us?
      </Text>
      <View style={styles.benefit}>
        <FlowIcon name="check" color={flowColors.blue} />
        <View>
          <Text style={flowStyles.value}>Best Price Guarantee</Text>
          <Text style={flowStyles.meta}>We match any lower price</Text>
        </View>
      </View>
      <View style={styles.benefit}>
        <FlowIcon name="card" color={flowColors.blue} />
        <View>
          <Text style={flowStyles.value}>Free Cancellation</Text>
          <Text style={flowStyles.meta}>
            Plans change, book with confidence
          </Text>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
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
