import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { destinations } from "../explore/destinationCatalogue";
import { destinationMedia, FALLBACK_SOURCE } from "../explore/destinationMedia";
import { popularDestinationStays } from "../home/PopularDestinationStaysData";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { useAppTheme } from "../../theme/AppTheme";
import { useSavedFlights } from "../../storage/useSavedFlights";
import type { FlightResult } from "../../api/travelApi";

export type SavedCategory = "destinations" | "stays" | "flights";
export type SavedItem = { id: string; category: SavedCategory; name: string; country: string; image: ImageSourcePropType; open: () => void };

type SavedSection = { key: SavedCategory; title: string; items: SavedItem[] };

export const savedCategoryOrder: readonly { key: SavedCategory; title: string }[] = [
  { key: "destinations", title: "Destinations" },
  { key: "stays", title: "Stays" },
  { key: "flights", title: "Flights" },
] as const;

export function savedItem(id: string): SavedItem | undefined {
  const stay = popularDestinationStays.find((item) => item.id === id);
  if (stay) return { id, category: "stays", name: stay.city, country: stay.country, image: stay.image, open: () => router.push({ pathname: "/hotels", params: { destination: stay.city } }) };
  const destination = destinations.find((item) => item.id === id);
  if (destination) return { id, category: "destinations", name: destination.name, country: destination.country, image: destinationMedia(id)?.source ?? FALLBACK_SOURCE, open: () => router.push({ pathname: "/flights", params: { destination: destination.name, destinationId: destination.id, airportCodes: destination.airportCodes.join(","), to: destination.primaryAirportCode } }) };
}

export function savedFlightItem(flight: FlightResult): SavedItem {
  return {
    id: flight.id,
    category: "flights",
    name: `${flight.airlineName} flight`,
    country: `${flight.originAirport} to ${flight.destinationAirport}`,
    image: FALLBACK_SOURCE,
    open: () => router.push({ pathname: "/flight-details", params: { result: JSON.stringify(flight) } }),
  };
}

export function savedSections(items: readonly SavedItem[]): SavedSection[] {
  return savedCategoryOrder.flatMap(({ key, title }) => {
    const sectionItems = items.filter((item) => item.category === key);
    return sectionItems.length ? [{ key, title, items: sectionItems }] : [];
  });
}

function SavedItemImage({ item }: { item: SavedItem }) {
  const [failed, setFailed] = useState(false);
  return <Image source={failed ? FALLBACK_SOURCE : item.image} onError={() => { if (!failed) setFailed(true); }} accessibilityLabel={`${item.name}, ${item.country} travel image`} resizeMode="cover" style={styles.image} />;
}

export function SavedRecentScreen() {
  const { theme } = useAppTheme();
  const { savedIds, toggle, isAuthenticated, authResolved } = useSavedDestinations();
  const { savedFlights, toggle: toggleFlight } = useSavedFlights();
  const items = [
    ...[...savedIds].map(savedItem).filter((item): item is SavedItem => !!item),
    ...[...savedFlights.values()].map(savedFlightItem),
  ];
  const sections = savedSections(items);
  const confirmRemove = (item: SavedItem) => {
    if (item.category === "flights") {
      Alert.alert("Remove from saved?", "Are you sure you want to remove this item from your saved favorites?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => toggleFlight(savedFlights.get(item.id)!) },
      ]);
      return;
    }
    Alert.alert("Remove from saved?", "Are you sure you want to remove this item from your saved favorites?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => toggle(item.id) },
    ]);
  };
  return <SafeAreaView edges={["top", "bottom"]} style={[styles.safe, { backgroundColor: theme.background }]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><FlowIcon name="back" color={theme.icon} size={27} /></Pressable><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Saved & recent</Text></View>
    {!authResolved ? null : !isAuthenticated ? <View style={styles.center}><FlowIcon name="heart" color={flowColors.blue} size={42} /><Text style={[styles.emptyTitle, { color: theme.text }]}>Sign in to view saved favorites</Text><Text style={[styles.emptyText, { color: theme.muted }]}>Your saved destinations are private to your signed-in profile on this device.</Text><Pressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => router.push("/(tabs)/profile/sign-in")} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable></View> : <ScrollView alwaysBounceVertical={false} bounces={false} contentContainerStyle={styles.content} overScrollMode="never">
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>Saved favorites</Text>
      <Text style={[styles.recentExplanation, { color: theme.muted }]}>Saved items are things you chose to keep.</Text>
      {sections.length ? sections.map((section) => <View key={section.key} style={styles.section}><Text accessibilityRole="header" style={[styles.categoryTitle, { color: theme.text }]}>{section.title}</Text>{section.items.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.name}, ${item.country}`} onPress={item.open} style={({ pressed }) => [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}><SavedItemImage item={item} /><View style={styles.copy}><Text numberOfLines={2} style={[styles.name, { color: theme.text }]}>{item.name}</Text><Text numberOfLines={1} style={[styles.country, { color: theme.muted }]}>{item.country}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name} from favorites`} accessibilityState={{ selected: true }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={(event) => { event.stopPropagation(); confirmRemove(item); }} style={({ pressed }) => [styles.removeTouchTarget, pressed && styles.removePressed]}><View style={[styles.remove, { backgroundColor: theme.surface, borderColor: theme.border }]}><FlowIcon name="close" color={theme.icon} size={16} /></View></Pressable></Pressable>)}</View>) : <View style={styles.center}><FlowIcon name="heart" color={flowColors.blue} size={42} /><Text style={[styles.emptyTitle, { color: theme.text }]}>No saved favorites yet</Text><Text style={[styles.emptyText, { color: theme.muted }]}>Tap the heart on a destination to save it here.</Text><Pressable accessibilityRole="button" accessibilityLabel="Explore destinations" onPress={() => router.replace("/(tabs)/explore")} style={styles.primary}><Text style={styles.primaryText}>Explore destinations</Text></Pressable></View>}
      <View style={styles.recentSection}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>Recent</Text><Text style={[styles.emptyText, { color: theme.muted }]}>Searches you recently performed appear here.</Text></View>
    </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, header: { height: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }, back: { width: 46, height: 46, alignItems: "center", justifyContent: "center" }, title: { fontSize: 25, lineHeight: 32, fontWeight: "800" }, content: { paddingHorizontal: 18, paddingBottom: 30 }, sectionTitle: { fontSize: 19, fontWeight: "800", marginVertical: 14 }, section: { marginBottom: 6 }, categoryTitle: { fontSize: 16, lineHeight: 22, fontWeight: "800", marginBottom: 10 }, card: { height: 104, borderWidth: 1, borderRadius: 16, overflow: "hidden", flexDirection: "row", alignItems: "center", marginBottom: 12 }, image: { width: 112, height: 104, flexShrink: 0, backgroundColor: "#DCE5F3" }, copy: { flex: 1, minWidth: 0, paddingLeft: 12, paddingRight: 6, paddingVertical: 10 }, name: { fontSize: 15, lineHeight: 20, fontWeight: "800" }, country: { fontSize: 12, lineHeight: 18, marginTop: 3 }, removeTouchTarget: { width: 44, height: 44, flexShrink: 0, alignItems: "center", justifyContent: "center", marginRight: 8 }, remove: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" }, removePressed: { opacity: 0.76, transform: [{ scale: 0.94 }] }, center: { flex: 1, minHeight: 360, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 }, emptyTitle: { fontSize: 20, lineHeight: 27, fontWeight: "800", textAlign: "center", marginTop: 15 }, emptyText: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 6 }, primary: { minHeight: 48, marginTop: 20, borderRadius: 10, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", backgroundColor: flowColors.blue }, primaryText: { color: "white", fontSize: 15, fontWeight: "800" }, recentExplanation: { fontSize: 13, marginBottom: 10 }, recentSection: { marginTop: 20, alignItems: "flex-start" }, pressed: { opacity: .72 } });
