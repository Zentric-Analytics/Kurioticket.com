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
import { travelApi, type MobileFlightStatus, type MobileTrip } from "../../api/travelApi";
import { locationImageByCity } from "./locationCatalogue";
import { FlowIcon, type FlowIconName } from "./FlowIcon";
import { ScreenHeader, Segments } from "./FlowPrimitives";
import { flowColors, flowStyles, useFlowTheme } from "./flowStyles";
import { signInHref } from "../auth/signInIntent";

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
          if (!session) router.replace(signInHref("/(tabs)/trips"));
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
      <ScrollView alwaysBounceVertical={false} bounces={false} contentContainerStyle={ft.styles.scroll} overScrollMode="never">
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
  const [flightStatus, setFlightStatus] = useState<MobileFlightStatus | null>(null);

  useEffect(() => {
    if (trip.tripType !== "flight" || trip.status !== "upcoming") {
      setFlightStatus(null);
      return;
    }
    let active = true;
    const refresh = () => {
      void travelApi.flightStatus(trip.id)
        .then((status) => { if (active) setFlightStatus(status); })
        .catch(() => undefined);
    };
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, [trip.id, trip.status, trip.tripType]);

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
        <View style={styles.providerRow}>
          <Text style={ft.styles.meta}>Provider: {trip.providerName}</Text>
          {trip.providerConfirmed ? (
            <View style={styles.providerConfirmed}>
              <Text style={styles.providerConfirmedText}>Provider confirmed</Text>
            </View>
          ) : null}
        </View>
        {trip.providerConfirmed && trip.providerConfirmedAt ? (
          <Text style={ft.styles.meta}>Verified {new Date(trip.providerConfirmedAt).toLocaleString()}</Text>
        ) : null}
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

        {trip.tripType === "flight" && trip.status === "upcoming" && flightStatus ? (
          <View style={[styles.flightStatus, { borderColor: ft.colors.border }]}>
            <Text style={styles.flightStatusHeading}>Flight status</Text>
            {!flightStatus.dataAvailable ? (
              <Text style={ft.styles.meta}>Live flight status is not available from the provider yet.</Text>
            ) : (
              <>
                <View style={styles.flightStatusHeader}>
                  <Text style={ft.styles.value}>{flightStatus.flight.carrierCode} {flightStatus.flight.flightNumber}</Text>
                  <Text style={styles.flightStatusValue}>{flightStatus.status[0].toUpperCase() + flightStatus.status.slice(1)}</Text>
                </View>
                <Text style={ft.styles.meta}>{flightStatus.flight.originAirport} → {flightStatus.flight.destinationAirport}</Text>
                {flightStatus.timing.estimatedDepartureAt ? <Text style={ft.styles.meta}>Estimated departure: {new Date(flightStatus.timing.estimatedDepartureAt).toLocaleString()}</Text> : null}
                {flightStatus.timing.actualDepartureAt ? <Text style={ft.styles.meta}>Actual departure: {new Date(flightStatus.timing.actualDepartureAt).toLocaleString()}</Text> : null}
                {flightStatus.timing.estimatedArrivalAt ? <Text style={ft.styles.meta}>Estimated arrival: {new Date(flightStatus.timing.estimatedArrivalAt).toLocaleString()}</Text> : null}
                {flightStatus.timing.actualArrivalAt ? <Text style={ft.styles.meta}>Actual arrival: {new Date(flightStatus.timing.actualArrivalAt).toLocaleString()}</Text> : null}
                <Text style={ft.styles.meta}>Updated {new Date(flightStatus.lastUpdatedAt).toLocaleString()}</Text>
                {flightStatus.freshness === "stale" ? <Text style={styles.staleStatus}>Last provider update may be stale.</Text> : null}
              </>
            )}
          </View>
        ) : null}
      </View>
      {trip.providerAction ? (
        <Pressable accessibilityRole="link" accessibilityLabel={`${trip.providerAction.label}, opens external website`} onPress={() => void Linking.openURL(trip.providerAction!.url)} style={flowStyles.primary}>
          <Text style={flowStyles.primaryText}>{trip.providerAction.label} ↗</Text>
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
      <ScrollView alwaysBounceVertical={false} bounces={false} contentContainerStyle={ft.styles.scroll} overScrollMode="never">
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
  providerRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  providerConfirmed: { borderRadius: 8, backgroundColor: flowColors.paleGreen, paddingHorizontal: 7, paddingVertical: 2 },
  providerConfirmedText: { color: flowColors.navy, fontSize: 9, fontWeight: "700" },
  flightStatus: { marginTop: 8, borderWidth: 1, borderRadius: 10, padding: 9, gap: 3 },
  flightStatusHeading: { color: flowColors.navy, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  flightStatusHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  flightStatusValue: { color: flowColors.navy, fontSize: 10, fontWeight: "800" },
  staleStatus: { color: "#8A5A00", fontSize: 10, fontWeight: "700" },
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
