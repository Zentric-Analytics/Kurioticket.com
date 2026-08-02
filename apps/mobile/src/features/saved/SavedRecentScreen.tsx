import { router } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { destinations } from "../explore/destinationCatalogue";
import { destinationMedia, FALLBACK_SOURCE } from "../explore/destinationMedia";
import { nextAdventureCards } from "../home/DiscoverNextAdventure";
import { popularDestinationStays } from "../home/PopularDestinationStays";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { useAppTheme } from "../../theme/AppTheme";

type SavedItem = { id: string; name: string; country: string; image: ImageSourcePropType; open: () => void };

function savedItem(id: string): SavedItem | undefined {
  const stay = popularDestinationStays.find((item) => item.id === id);
  if (stay) return { id, name: stay.city, country: stay.country, image: stay.image, open: () => router.push({ pathname: "/hotels", params: { destination: stay.city } }) };
  const adventure = nextAdventureCards.find((item) => item.id === id);
  if (adventure) return { id, name: adventure.title, country: `${adventure.originCode} → ${adventure.destinationCode}`, image: adventure.image, open: () => router.push({ pathname: "/flights", params: { from: adventure.originCode, to: adventure.destinationCode } }) };
  const destination = destinations.find((item) => item.id === id);
  if (destination) return { id, name: destination.name, country: destination.country, image: destinationMedia(id)?.source ?? FALLBACK_SOURCE, open: () => router.push({ pathname: "/flights", params: { destination: destination.name, destinationId: destination.id, airportCodes: destination.airportCodes.join(","), to: destination.primaryAirportCode } }) };
}

export function SavedRecentScreen() {
  const { theme } = useAppTheme();
  const { savedIds, toggle, isAuthenticated, authResolved } = useSavedDestinations();
  const items = [...savedIds].map(savedItem).filter((item): item is SavedItem => !!item);
  return <SafeAreaView edges={["top", "bottom"]} style={[styles.safe, { backgroundColor: theme.background }]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><FlowIcon name="back" color={theme.icon} size={27} /></Pressable><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Saved & recent</Text></View>
    {!authResolved ? null : !isAuthenticated ? <View style={styles.center}><FlowIcon name="heart" color={flowColors.blue} size={42} /><Text style={[styles.emptyTitle, { color: theme.text }]}>Sign in to view saved favorites</Text><Text style={[styles.emptyText, { color: theme.muted }]}>Your saved destinations are private to your signed-in profile on this device.</Text><Pressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => router.push("/(tabs)/profile/sign-in")} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable></View> : <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>Saved favorites</Text>
      {items.length ? items.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.name}, ${item.country}`} onPress={item.open} style={({ pressed }) => [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}><Image source={item.image} style={styles.image} /><View style={styles.copy}><Text numberOfLines={2} style={[styles.name, { color: theme.text }]}>{item.name}</Text><Text numberOfLines={1} style={[styles.country, { color: theme.muted }]}>{item.country}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name} from favorites`} accessibilityState={{ selected: true }} hitSlop={8} onPress={(event) => { event.stopPropagation(); toggle(item.id); }} style={styles.heart}><FlowIcon name="heart" color="#E11D48" size={22} /></Pressable></Pressable>) : <View style={styles.center}><FlowIcon name="heart" color={flowColors.blue} size={42} /><Text style={[styles.emptyTitle, { color: theme.text }]}>No saved favorites yet</Text><Text style={[styles.emptyText, { color: theme.muted }]}>Tap the heart on a destination to save it here.</Text><Pressable accessibilityRole="button" accessibilityLabel="Explore destinations" onPress={() => router.replace("/(tabs)/explore")} style={styles.primary}><Text style={styles.primaryText}>Explore destinations</Text></Pressable></View>}
    </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, header: { height: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }, back: { width: 46, height: 46, alignItems: "center", justifyContent: "center" }, title: { fontSize: 25, lineHeight: 32, fontWeight: "800" }, content: { paddingHorizontal: 18, paddingBottom: 30 }, sectionTitle: { fontSize: 19, fontWeight: "800", marginVertical: 14 }, card: { minHeight: 96, borderWidth: 1, borderRadius: 16, overflow: "hidden", flexDirection: "row", alignItems: "center", marginBottom: 12 }, image: { width: 104, alignSelf: "stretch", backgroundColor: "#DCE5F3" }, copy: { flex: 1, minWidth: 0, padding: 14 }, name: { fontSize: 15, lineHeight: 20, fontWeight: "800" }, country: { fontSize: 12, lineHeight: 18, marginTop: 3 }, heart: { width: 52, height: 52, alignItems: "center", justifyContent: "center" }, center: { flex: 1, minHeight: 360, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 }, emptyTitle: { fontSize: 20, lineHeight: 27, fontWeight: "800", textAlign: "center", marginTop: 15 }, emptyText: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 6 }, primary: { minHeight: 48, marginTop: 20, borderRadius: 10, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", backgroundColor: flowColors.blue }, primaryText: { color: "white", fontSize: 15, fontWeight: "800" }, pressed: { opacity: .72 } });
