import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { readSession } from "../../storage/sessionStorage";
import { destinationImages, seededTrips } from "./flowData";
import { FlowIcon, type FlowIconName } from "./FlowIcon";
import { ScreenHeader, Segments } from "./FlowPrimitives";
import { flowColors, flowStyles } from "./flowStyles";

type TripTab = "upcoming" | "past";
export function TripsFlowScreen() {
  const [tab, setTab] = useState<TripTab>("upcoming");
  const trips =
    tab === "upcoming" ? seededTrips.slice(0, 1) : seededTrips.slice(1);
  return (
    <SafeAreaView style={flowStyles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={flowStyles.scroll}>
        <ScreenHeader title="Trips" />
        <View style={[flowStyles.card, flowStyles.shadow]}>
          <Segments
            value={tab}
            onChange={setTab}
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past" },
            ]}
          />
        </View>
        <Text style={flowStyles.sectionTitle}>
          {tab === "upcoming" ? "Next trip" : "Past trips"}
        </Text>
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
        {tab === "upcoming" ? (
          <>
            <Text style={flowStyles.sectionTitle}>All trips</Text>
            {seededTrips.slice(1).map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </>
        ) : null}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a trip"
        onPress={() => router.push("/explore-trip")}
        style={styles.fab}
      >
        <FlowIcon name="plus" color="white" />
      </Pressable>
    </SafeAreaView>
  );
}
function TripCard({ trip }: { trip: (typeof seededTrips)[number] }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open trip ${trip.route}`}
      onPress={() =>
        router.push({ pathname: "/trips/[id]", params: { id: trip.id } })
      }
      style={({ pressed }) => [
        styles.trip,
        flowStyles.shadow,
        pressed && flowStyles.pressed,
      ]}
    >
      <Image source={trip.image} style={styles.tripImage} />
      <View style={styles.grow}>
        <Text style={flowStyles.value}>{trip.route}</Text>
        <Text style={flowStyles.meta}>{trip.dates}</Text>
        <View
          style={[
            styles.status,
            trip.status === "Confirmed" && styles.confirmed,
          ]}
        >
          <Text style={styles.statusText}>{trip.status}</Text>
        </View>
      </View>
      <FlowIcon name="chevron" size={18} />
    </Pressable>
  );
}

type ExploreTab = "destinations" | "inspiration" | "deals";
export function ExploreFlowScreen() {
  const [tab, setTab] = useState<ExploreTab>("destinations");
  const destinations = [
    { name: "Paris", price: "from $420", image: destinationImages.Paris },
    { name: "Tokyo", price: "from $680", image: destinationImages["New York"] },
    { name: "Bali", price: "from $499", image: destinationImages.Bali },
  ];
  return (
    <SafeAreaView style={flowStyles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={flowStyles.scroll}>
        <ScreenHeader title="Explore" />
        <View style={[flowStyles.card, flowStyles.shadow]}>
          <Segments
            value={tab}
            onChange={setTab}
            options={[
              { value: "destinations", label: "Destinations" },
              { value: "inspiration", label: "Inspiration" },
              { value: "deals", label: "Deals" },
            ]}
          />
        </View>
        {tab === "destinations" ? (
          <>
            <View style={flowStyles.sectionHeader}>
              <Text style={flowStyles.sectionTitle}>Popular destinations</Text>
              <Text style={flowStyles.viewAll}>View all</Text>
            </View>
            <View style={styles.destinations}>
              {destinations.map((destination) => (
                <Pressable
                  key={destination.name}
                  accessibilityRole="button"
                  accessibilityLabel={`Search trips to ${destination.name}`}
                  onPress={() =>
                    router.push({
                      pathname: "/flights",
                      params: { destination: destination.name },
                    })
                  }
                  style={({ pressed }) => [
                    styles.destination,
                    pressed && flowStyles.pressed,
                  ]}
                >
                  <Image
                    source={destination.image}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.scrim} />
                  <Text style={styles.destinationName}>{destination.name}</Text>
                  <Text style={styles.destinationPrice}>
                    {destination.price}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={flowStyles.sectionTitle}>Trending searches</Text>
            <View style={styles.chips}>
              {[
                "New York",
                "Rome",
                "London",
                "Dubai",
                "Barcelona",
                "Bangkok",
              ].map((name) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/flights",
                      params: { destination: name },
                    })
                  }
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{name}</Text>
                </Pressable>
              ))}
            </View>
            <View style={flowStyles.sectionHeader}>
              <Text style={flowStyles.sectionTitle}>Deals for you</Text>
              <Text style={flowStyles.viewAll}>View all</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/deals")}
              style={styles.feature}
            >
              <Image
                source={require("../../../assets/heroes/explore-tropical-beach.png")}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.scrim} />
              <Text style={styles.featureTitle}>Miami</Text>
              <Text style={styles.featureMeta}>from $210{"\n"}Round trip</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.empty}>
            <FlowIcon
              name={tab === "deals" ? "deal" : "compass"}
              color={flowColors.blue}
              size={36}
            />
            <Text style={flowStyles.value}>
              {tab === "deals"
                ? "Explore today’s travel deals"
                : "Travel inspiration is coming soon"}
            </Text>
            <Pressable
              onPress={() =>
                router.push(tab === "deals" ? "/deals" : "/flights")
              }
            >
              <Text style={flowStyles.viewAll}>
                {tab === "deals" ? "View deals" : "Search flights"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const rows: {
  label: string;
  route:
    | "/personal-information"
    | "/payment-methods"
    | "/saved-travelers"
    | "/price-alerts"
    | "/notifications"
    | "/currency";
  icon: FlowIconName;
  trailing?: string;
}[] = [
  {
    label: "Personal information",
    route: "/personal-information",
    icon: "person",
  },
  { label: "Payment methods", route: "/payment-methods", icon: "card" },
  { label: "Saved travelers", route: "/saved-travelers", icon: "person" },
  { label: "Price alerts", route: "/price-alerts", icon: "bell" },
  { label: "Notifications", route: "/notifications", icon: "bell" },
  { label: "Currency", route: "/currency", icon: "compass", trailing: "USD" },
];
export function ProfileFlowScreen() {
  const [name, setName] = useState("Traveler");
  useEffect(() => {
    void readSession()
      .then((session) => {
        if (session?.user.name) setName(session.user.name);
      })
      .catch(() => undefined);
  }, []);
  return (
    <SafeAreaView style={flowStyles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={flowStyles.scroll}>
        <ScreenHeader title="Profile" settings />
        <View style={styles.user}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={flowStyles.value}>{name}</Text>
            <Text style={flowStyles.meta}>View and manage your account</Text>
          </View>
        </View>
        <Text style={flowStyles.sectionTitle}>Account</Text>
        <View style={[flowStyles.card, flowStyles.shadow]}>
          {rows.slice(0, 4).map((row) => (
            <ProfileRow key={row.label} {...row} />
          ))}
        </View>
        <Text style={flowStyles.sectionTitle}>Settings</Text>
        <View style={[flowStyles.card, flowStyles.shadow]}>
          {rows.slice(4).map((row) => (
            <ProfileRow key={row.label} {...row} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function ProfileRow({ label, route, icon, trailing }: (typeof rows)[number]) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${trailing ? `, ${trailing}` : ""}`}
      onPress={() => router.push(route)}
      style={({ pressed }) => [
        styles.profileRow,
        pressed && flowStyles.pressed,
      ]}
    >
      <FlowIcon name={icon} size={20} />
      <Text style={[flowStyles.value, styles.grow]}>{label}</Text>
      {trailing ? <Text style={flowStyles.meta}>{trailing}</Text> : null}
      <FlowIcon name="chevron" size={17} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  trip: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 8,
    backgroundColor: "white",
    borderColor: flowColors.border,
    borderWidth: 1,
  },
  tripImage: { width: 74, height: 68, borderRadius: 9 },
  status: {
    alignSelf: "flex-start",
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#EEF1F7",
  },
  confirmed: { backgroundColor: flowColors.paleGreen },
  statusText: { color: flowColors.navy, fontSize: 9, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: flowColors.blue,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  destinations: { flexDirection: "row", gap: 7 },
  destination: {
    flex: 1,
    height: 150,
    borderRadius: 11,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 9,
  },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "#071A4833" },
  destinationName: { color: "white", fontSize: 14, fontWeight: "800" },
  destinationPrice: { color: "white", fontSize: 11, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minWidth: "30%",
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: "#EEF2F8",
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { color: flowColors.navy, fontSize: 11, fontWeight: "600" },
  feature: {
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 12,
  },
  featureTitle: { color: "white", fontSize: 20, fontWeight: "800" },
  featureMeta: { color: "white", fontSize: 12, fontWeight: "600" },
  empty: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  user: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E6ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: flowColors.blue, fontSize: 24 },
  profileRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 13,
    borderBottomColor: flowColors.border,
    borderBottomWidth: 1,
  },
});
