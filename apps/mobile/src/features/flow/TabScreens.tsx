import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { readSession } from "../../storage/sessionStorage";
import { travelApi, type MobileTrip } from "../../api/travelApi";
import { locationImageByCity } from "./locationCatalogue";
import { FlowIcon, type FlowIconName } from "./FlowIcon";
import { ScreenHeader, Segments } from "./FlowPrimitives";
import { flowColors, flowStyles, useFlowTheme } from "./flowStyles";

type TripTab = "upcoming" | "past" | "cancelled";
export function MyTripsFlowScreen() {
  const ft = useFlowTheme();
  const [tab, setTab] = useState<TripTab>("upcoming");
  const [trips, setTrips] = useState<MobileTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void travelApi
      .trips(tab)
      .then((data) => {
        if (active) setTrips(data.trips);
      })
      .catch(() => {
        if (!active) return;
        void readSession().then((session) => {
          if (!session) router.replace("/email-auth");
          else
            setError(
              "Unable to load trips. Check your connection and try again.",
            );
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab]);
  return (
    <SafeAreaView style={ft.styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ft.styles.scroll}>
        <ScreenHeader title="My Trips" />
        <View style={[ft.styles.card, ft.styles.shadow]}>
          <Segments
            value={tab}
            onChange={setTab}
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </View>
        <Text style={ft.styles.sectionTitle}>
          {tab === "upcoming"
            ? "Upcoming trips"
            : tab === "past"
              ? "Past trips"
              : "Cancelled trips"}
        </Text>
        {loading ? <Text style={ft.styles.meta}>Loading reservations…</Text> : null}
        {error ? (
          <Text accessibilityRole="alert" style={ft.styles.meta}>
            {error}
          </Text>
        ) : null}
        {!loading && !error && !trips.length ? (
          <View style={styles.empty}>
            <FlowIcon name="calendar" color={flowColors.blue} size={36} />
            <Text style={ft.styles.value}>No {tab} trips</Text>
            <Text style={ft.styles.meta}>
              Partner-confirmed trips will appear here.
            </Text>
          </View>
        ) : null}
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
function TripCard({ trip }: { trip: MobileTrip }) {
  const ft = useFlowTheme();
  const image = locationImageByCity(trip.destination);
  return (
    <View
      style={[
        styles.trip,
        { backgroundColor: ft.colors.card, borderColor: ft.colors.border },
        ft.styles.shadow,
      ]}
    >
      {image ? (
        <Image source={image} style={styles.tripImage} />
      ) : (
        <View
          style={[
            styles.tripImage,
            styles.neutralImage,
            { backgroundColor: ft.colors.neutralImage },
          ]}
        />
      )}
      <View style={styles.grow}>
        <Text style={ft.styles.value}>
          {trip.origin ? `${trip.origin} → ` : ""}
          {trip.destination}
        </Text>
        <Text style={ft.styles.meta}>Provider: {trip.providerName}</Text>
        <Text style={ft.styles.meta}>Confirmation: {trip.providerConfirmationCode}</Text>
        <Text style={ft.styles.meta}>{trip.travelerCount} traveler{trip.travelerCount === 1 ? "" : "s"}</Text>
        <Text style={ft.styles.meta}>
          {new Date(trip.departureDate).toLocaleDateString()}{" "}
          {trip.returnDate
            ? `– ${new Date(trip.returnDate).toLocaleDateString()}`
            : ""}
        </Text>
        <View
          style={[
            styles.status,
            { backgroundColor: ft.colors.status },
            trip.status === "upcoming" && styles.confirmed,
          ]}
        >
          <Text style={[styles.statusText, { color: ft.colors.text }]}>
            {trip.status[0].toUpperCase() + trip.status.slice(1)}
          </Text>
        </View>
      </View>
      {trip.providerAction ? (
        <Pressable accessibilityRole="link" accessibilityLabel={`${trip.providerAction.label}, opens external website`} onPress={() => void Linking.openURL(trip.providerAction!.url)} style={flowStyles.primaryButton}>
          <Text style={flowStyles.primaryButtonText}>{trip.providerAction.label} ↗</Text>
        </Pressable>
      ) : <Text style={ft.styles.meta}>Manage this trip using your provider confirmation.</Text>}
      <Text style={ft.styles.meta}>Your reservation is managed by {trip.providerName}. Changes, cancellations, refunds, check-in and travel documents are handled by the provider.</Text>
    </View>
  );
}

const rows: {
  label: string;
  route: "/personal-information" | "/price-alerts" | "/currency";
  icon: FlowIconName;
  trailing?: string;
}[] = [
  {
    label: "Personal information",
    route: "/personal-information",
    icon: "person",
  },
  { label: "Price alerts", route: "/price-alerts", icon: "bell" },
  { label: "Currency", route: "/currency", icon: "compass", trailing: "USD" },
];
export function ProfileFlowScreen() {
  const ft = useFlowTheme();
  const [name, setName] = useState("Traveler");
  useEffect(() => {
    void readSession()
      .then((session) => {
        if (session?.user.name) setName(session.user.name);
      })
      .catch(() => undefined);
  }, []);
  return (
    <SafeAreaView style={ft.styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ft.styles.scroll}>
        <ScreenHeader title="Profile" settings />
        <View style={styles.user}>
          <View
            style={[styles.avatar, { backgroundColor: ft.colors.selected }]}
          >
            <Text style={styles.avatarText}>
              {name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={ft.styles.value}>{name}</Text>
            <Text style={ft.styles.meta}>View and manage your account</Text>
          </View>
        </View>
        <Text style={ft.styles.sectionTitle}>Account</Text>
        <View style={[ft.styles.card, ft.styles.shadow]}>
          {rows.slice(0, 2).map((row) => (
            <ProfileRow key={row.label} {...row} />
          ))}
        </View>
        <Text style={ft.styles.sectionTitle}>Settings</Text>
        <View style={[ft.styles.card, ft.styles.shadow]}>
          {rows.slice(2).map((row) => (
            <ProfileRow key={row.label} {...row} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function ProfileRow({ label, route, icon, trailing }: (typeof rows)[number]) {
  const ft = useFlowTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${trailing ? `, ${trailing}` : ""}`}
      onPress={() => router.push(route)}
      style={({ pressed }) => [
        styles.profileRow,
        { borderBottomColor: ft.colors.border },
        pressed && ft.styles.pressed,
      ]}
    >
      <FlowIcon name={icon} size={20} color={ft.colors.icon} />
      <Text style={[ft.styles.value, styles.grow]}>{label}</Text>
      {trailing ? <Text style={ft.styles.meta}>{trailing}</Text> : null}
      <FlowIcon name="chevron" size={17} color={ft.colors.icon} />
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
  neutralImage: { backgroundColor: "#DCE5F3" },
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
