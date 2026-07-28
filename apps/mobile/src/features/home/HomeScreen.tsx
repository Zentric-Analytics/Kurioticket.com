import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Logo } from "../../components/Logo";
import { colors, spacing } from "../../theme/tokens";
import { ProductTabs, type SearchProduct } from "./ProductTabs";
import { HotelSearchForm } from "./HotelSearchForm";
import { CarSearchForm } from "./CarSearchForm";
import { DealsSearchForm } from "./DealsSearchForm";

type TripType = "round-trip" | "one-way";

type Airport = { code: string; city: string; name: string };
const DEFAULT_FROM: Airport = {
  code: "JFK",
  city: "New York",
  name: "John F. Kennedy International",
};
const DEFAULT_TO: Airport = {
  code: "LAX",
  city: "Los Angeles",
  name: "Los Angeles International",
};

function ActionIcon({ label }: { label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Text style={styles.iconText}>{label.slice(0, 1)}</Text>
    </Pressable>
  );
}

function AppHeader() {
  return (
    <View style={styles.header}>
      <Logo compact />
      <View style={styles.headerCopy}>
        <Text style={styles.greeting}>Good to see you</Text>
      </View>
      <View style={styles.headerActions}>
        <ActionIcon label="Notifications" />
        <ActionIcon label="Profile" />
      </View>
    </View>
  );
}

function TripTypeSelector({
  value,
  onChange,
}: {
  value: TripType;
  onChange: (value: TripType) => void;
}) {
  return (
    <View style={styles.segment} accessibilityLabel="Trip type">
      {(["round-trip", "one-way"] as const).map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityState={{ selected: value === item }}
          onPress={() => onChange(item)}
          style={({ pressed }) => [
            styles.segmentItem,
            value === item && styles.segmentItemActive,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              value === item && styles.segmentTextActive,
            ]}
          >
            {item === "round-trip" ? "Round trip" : "One way"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AirportField({
  label,
  airport,
  onPress,
}: {
  label: string;
  airport: Airport;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${airport.city}, ${airport.code}`}
      onPress={onPress}
      style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.airportCode}>{airport.code}</Text>
      <Text numberOfLines={1} style={styles.fieldValue}>
        {airport.city}
      </Text>
      <Text numberOfLines={1} style={styles.fieldMeta}>
        {airport.name}
      </Text>
    </Pressable>
  );
}
function DateField({ label, value }: { label: string; value: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={() =>
        Alert.alert(
          label,
          "Date selection will open here when the flight results flow is connected.",
        )
      }
      style={({ pressed }) => [
        styles.field,
        styles.compactField,
        pressed && styles.fieldPressed,
      ]}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </Pressable>
  );
}
function OptionField({ label, value }: { label: string; value: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={() =>
        Alert.alert(
          label,
          "Selection controls will open here in the flight search flow.",
        )
      }
      style={({ pressed }) => [styles.option, pressed && styles.fieldPressed]}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.optionValue}>{value}</Text>
    </Pressable>
  );
}

function FlightSearchCard() {
  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const travelerSummary = useMemo(() => "1 traveler · Economy", []);
  const openAirport = (label: string) =>
    Alert.alert(
      label,
      "Airport search will open here. Current defaults are ready for the flight-results connection.",
    );
  const search = () =>
    Alert.alert(
      "Search flights",
      "Flight results are not connected in this mobile build yet. This button defines the next route contract for /flights/results with trip type, route, dates, travelers, and cabin class.",
    );
  return (
    <View style={styles.card}>
      <TripTypeSelector value={tripType} onChange={setTripType} />
      <View style={styles.airports}>
        <AirportField
          label="From"
          airport={from}
          onPress={() => openAirport("From")}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Swap origin and destination"
          onPress={() => {
            setFrom(to);
            setTo(from);
          }}
          style={({ pressed }) => [styles.swap, pressed && styles.pressed]}
        >
          <Text style={styles.swapText}>⇄</Text>
        </Pressable>
        <AirportField
          label="To"
          airport={to}
          onPress={() => openAirport("To")}
        />
      </View>
      <View style={styles.row}>
        <DateField label="Depart" value="Choose date" />
        {tripType === "round-trip" ? (
          <DateField label="Return" value="Choose date" />
        ) : null}
      </View>
      <View style={styles.row}>
        <OptionField label="Travelers" value={travelerSummary} />
        <OptionField label="Cabin" value="Economy" />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search flights"
        onPress={search}
        style={({ pressed }) => [
          styles.searchButton,
          pressed && styles.searchButtonPressed,
        ]}
      >
        <Text style={styles.searchButtonText}>Search flights</Text>
      </Pressable>
    </View>
  );
}

function BelowSearch() {
  return (
    <View style={styles.below}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular routes</Text>
        <Text style={styles.sectionBody}>
          Start with common Kurioticket routes, then choose dates to compare
          flight options.
        </Text>
        <View style={styles.routeChips}>
          <Text style={styles.chip}>New York to Los Angeles</Text>
          <Text style={styles.chip}>Chicago to Miami</Text>
          <Text style={styles.chip}>Dallas to Denver</Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved trips</Text>
        <Text style={styles.sectionBody}>
          Sign in to keep trips, recent searches, and price watches together
          across devices.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/email-auth")}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Continue with email</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SearchProductContent({
  selectedProduct,
}: {
  selectedProduct: SearchProduct;
}) {
  if (selectedProduct === "hotels") return <HotelSearchForm />;
  if (selectedProduct === "cars") return <CarSearchForm />;
  if (selectedProduct === "deals") return <DealsSearchForm />;

  return (
    <>
      <FlightSearchCard />
      <BelowSearch />
    </>
  );
}

export function HomeScreen() {
  const [selectedProduct, setSelectedProduct] =
    useState<SearchProduct>("flights");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppHeader />
        <ProductTabs
          selectedProduct={selectedProduct}
          onSelectProduct={setSelectedProduct}
        />
        <SearchProductContent selectedProduct={selectedProduct} />
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyTab({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: string;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.empty}>
        <Logo compact />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyBody}>{body}</Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)")}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
export function ExploreScreen() {
  return (
    <EmptyTab
      title="Explore flights"
      body="Discover route ideas and destination inspiration built around flight search."
      action="Search flights"
    />
  );
}
export function TripsScreen() {
  return (
    <EmptyTab
      title="Trips"
      body="Your saved trips and price watches will appear here after you sign in."
      action="Search flights"
    />
  );
}
export function ProfileScreen() {
  return (
    <EmptyTab
      title="Profile"
      body="Manage account access and Kurioticket travel preferences."
      action="Go to search"
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screen, paddingBottom: 28, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1 },
  greeting: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 8 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { color: colors.navy, fontWeight: "900" },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius,
    padding: spacing.card,
    gap: 14,
  },
  segment: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 18,
    backgroundColor: colors.background,
  },
  segmentItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentItemActive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  segmentText: { color: colors.muted, fontWeight: "800" },
  segmentTextActive: { color: colors.navy },
  airports: { gap: 10 },
  field: {
    minHeight: 92,
    borderRadius: 18,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.background,
    padding: 14,
    justifyContent: "center",
  },
  fieldPressed: { borderColor: colors.blue, backgroundColor: colors.sky },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  airportCode: {
    color: colors.navy,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  fieldValue: {
    color: colors.navy,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
  },
  fieldMeta: { color: colors.slate, fontSize: 13, lineHeight: 18 },
  swap: {
    alignSelf: "center",
    width: 44,
    height: 44,
    marginVertical: -2,
    borderRadius: 22,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  swapText: { color: "white", fontSize: 22, fontWeight: "900" },
  row: { flexDirection: "row", gap: 10 },
  compactField: { flex: 1, minHeight: 74 },
  option: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.background,
    padding: 14,
    justifyContent: "center",
  },
  optionValue: {
    color: colors.navy,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
  },
  searchButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonPressed: { backgroundColor: colors.navy },
  searchButtonText: { color: "white", fontSize: 17, fontWeight: "900" },
  below: { gap: 14 },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 10,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
  },
  sectionBody: { color: colors.slate, fontSize: 15, lineHeight: 22 },
  routeChips: { gap: 8 },
  chip: {
    color: colors.navy,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: colors.blue, fontWeight: "900" },
  pressed: { opacity: 0.7 },
  empty: {
    flex: 1,
    padding: spacing.screen,
    justifyContent: "center",
    gap: 16,
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  emptyBody: { color: colors.slate, fontSize: 16, lineHeight: 24 },
});
