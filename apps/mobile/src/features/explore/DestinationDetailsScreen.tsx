import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlowIcon } from "../flow/FlowIcon";
import { AndroidFavoriteButton } from "../home/AndroidFavoriteButton";
import { fetchHomepageDefaultOrigin } from "../home/homepageDefaultOrigin";
import { destinationMedia, resolvedDestinationHeroSource } from "./destinationMedia";
import { destinationHandoff } from "./exploreInteractionModels";
import {
  exploreFlightResultsNavigation,
  exploreFlightSearchFallbackNavigation,
  exploreHotelResultsNavigation,
} from "./exploreSearchHandoff";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { useExploreCatalogue } from "./exploreCatalogueStore";
import { useAppTheme } from "../../theme/AppTheme";
import {
  liveExploreDestinationById,
  type LiveExploreDestination,
} from "./liveExploreModels";

const BLUE = "#0754F7";
const DESTINATION_DETAILS_BOTTOM_PADDING = 36;

export function DestinationDetailsScreen() {
  const catalogue = useExploreCatalogue();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const destinationById = useMemo(() => liveExploreDestinationById(catalogue), [catalogue]);
  const destination = typeof id === "string" ? destinationById.get(id) : undefined;
  const { savedIds, toggle } = useSavedDestinations();

  if (!destination) return <InvalidDestination />;
  return <DestinationPage key={destination.id} destination={destination} destinationById={destinationById} saved={savedIds.has(destination.id)} onToggle={() => toggle(destination.id)} />;
}

function BackButton() {
  const { theme } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" onPress={() => router.back()} style={styles.backButton}>
      <FlowIcon name="back" color={theme.icon} size={22} />
    </Pressable>
  );
}

function InvalidDestination() {
  const { theme } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={styles.invalidHeader}><BackButton /></View>
      <View accessibilityRole="alert" style={styles.invalidBody}>
        <Text accessibilityRole="header" style={[styles.invalidTitle, { color: theme.textPrimary }]}>Destination not found</Text>
        <Text style={[styles.invalidText, { color: theme.textSecondary }]}>This Explore destination is unavailable or the link is invalid.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" onPress={() => router.back()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DestinationPage({ destination, destinationById, saved, onToggle }: { destination: LiveExploreDestination; destinationById: Map<string, LiveExploreDestination>; saved: boolean; onToggle: () => void }) {
  const { theme } = useAppTheme();
  const media = destinationMedia(destination.imageDestinationId) ?? destinationMedia(destination.id);
  const [imageFailed, setImageFailed] = useState(false);
  const [resolvingFlightOrigin, setResolvingFlightOrigin] = useState(false);
  const scrollRef = useRef(null as ScrollView | null);
  const handoff = destinationHandoff(destination);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [destination.id]);

  const searchFlights = async () => {
    if (resolvingFlightOrigin) return;
    setResolvingFlightOrigin(true);
    try {
      const origin = await fetchHomepageDefaultOrigin();
      const resultsRoute = origin
        ? exploreFlightResultsNavigation(origin.code, handoff.primaryAirportCode)
        : null;
      if (resultsRoute) {
        router.push(resultsRoute);
        return;
      }
      router.push(exploreFlightSearchFallbackNavigation({
        destinationId: destination.id,
        destinationName: destination.name,
        primaryAirportCode: handoff.primaryAirportCode,
        airportCodes: handoff.airportCodes,
      }));
    } finally {
      setResolvingFlightOrigin(false);
    }
  };
  const searchHotels = () => {
    const resultsRoute = exploreHotelResultsNavigation(destination.name);
    if (resultsRoute) router.push(resultsRoute);
    else router.push({ pathname: "/hotels", params: { destinationId: destination.id, destination: destination.name } });
  };
  const related = destination.relatedDestinationIds.map((relatedId) => destinationById.get(relatedId)).filter((item): item is LiveExploreDestination => Boolean(item));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}><BackButton /><Text numberOfLines={1} style={[styles.topTitle, { color: theme.textPrimary }]}>{destination.name}</Text><View style={styles.topSpacer} /></View>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        alwaysBounceVertical={false}
        bounces={false}
        contentContainerStyle={styles.content}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <View collapsable={false} style={[styles.heroFrame, { backgroundColor: theme.border }]}>
          <Image
            source={resolvedDestinationHeroSource(media, imageFailed)}
            accessibilityLabel={media?.accessibilityLabel ?? `${destination.name}, ${destination.country} travel landscape`}
            resizeMode="cover"
            onError={() => { if (!imageFailed) setImageFailed(true); }}
            style={[styles.hero, { backgroundColor: theme.border }]}
          />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{destination.name}</Text>
              <Text style={[styles.country, { color: theme.textSecondary }]}>{destination.country}</Text>
            </View>
            <AndroidFavoriteButton
              saved={saved}
              label={saved ? `Remove ${destination.name} from saved destinations` : `Save ${destination.name}`}
              onPress={onToggle}
              style={styles.heart}
            />
          </View>
          {destination.summary ? <Text style={[styles.summary, { color: theme.textPrimary }]}>{destination.summary}</Text> : null}
          {destination.description ? <Section title="About"><Text style={[styles.paragraph, { color: theme.textSecondary }]}>{destination.description}</Text></Section> : null}
          {destination.highlights?.length ? <Section title="Highlights">{destination.highlights.map((highlight) => <View key={highlight} style={styles.highlight}><View style={styles.bullet} /><Text style={[styles.highlightText, { color: theme.textSecondary }]}>{highlight}</Text></View>)}</Section> : null}
          <Section title="Getting there">
            {destination.airportCodes.map((code, index) => <View key={code} style={[styles.airportRow, { borderBottomColor: theme.border }]}><Text style={styles.airportRowCode}>{code}</Text><Text style={[styles.airportRowName, { color: theme.textPrimary }]}>{destination.airportNames[index]}</Text></View>)}
          </Section>
          {related.length ? <Section title="Related destinations">{related.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.name}`} onPress={() => router.replace({ pathname: "/explore/destination/[id]", params: { id: item.id } })} style={[styles.related, { borderBottomColor: theme.border }]}><Text style={[styles.relatedName, { color: theme.textPrimary }]}>{item.name}</Text><Text style={[styles.relatedCountry, { color: theme.textSecondary }]}>{item.country}</Text></Pressable>)}</Section> : null}
          <View style={styles.actions}>
            <Action label={resolvingFlightOrigin ? "Finding flights…" : "Search flights"} icon="flight" onPress={() => { void searchFlights(); }} disabled={resolvingFlightOrigin} />
            <Action label="Search hotels" icon="hotel" onPress={searchHotels} secondary />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <View style={styles.section}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>{children}</View>;
}

function Action({ label, icon, onPress, secondary = false, disabled = false }: { label: string; icon: "flight" | "hotel"; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  const { theme } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.primaryButton, styles.actionButton, secondary && styles.secondaryButton, secondary && { backgroundColor: theme.surface }, disabled && styles.disabledButton]}><FlowIcon name={icon} color={secondary ? BLUE : "white"} size={20} /><Text style={[styles.primaryButtonText, secondary && styles.secondaryButtonText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { minHeight: 56, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", borderBottomWidth: 1 },
  backButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24 },
  topTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800" },
  topSpacer: { width: 48 },
  scroll: { flex: 1 },
  content: { paddingBottom: DESTINATION_DETAILS_BOTTOM_PADDING },
  heroFrame: { width: "100%", height: 360, overflow: "hidden" },
  hero: { width: "100%", height: 360 },
  body: { paddingHorizontal: 18, paddingTop: 18, gap: 20 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  titleCopy: { flex: 1 }, title: { fontSize: 30, lineHeight: 38, fontWeight: "800" },
  country: { fontSize: 16, marginTop: 2 },
  heart: { flexShrink: 0 },
  summary: { fontSize: 17, lineHeight: 25, fontWeight: "600" }, paragraph: { fontSize: 15, lineHeight: 23 },
  section: { gap: 10 }, sectionTitle: { fontSize: 19, fontWeight: "800" },
  airportRow: { minHeight: 58, paddingVertical: 10, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, gap: 14 },
  airportRowCode: { width: 48, color: BLUE, fontSize: 16, fontWeight: "800" }, airportRowName: { flex: 1, fontSize: 14, lineHeight: 20 },
  highlight: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: BLUE, marginTop: 7 }, highlightText: { flex: 1, fontSize: 15, lineHeight: 22 },
  related: { minHeight: 58, justifyContent: "center", borderBottomWidth: 1 }, relatedName: { fontSize: 15, fontWeight: "800" }, relatedCountry: { fontSize: 13 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 }, actionButton: { flex: 1 }, primaryButton: { minHeight: 52, borderRadius: 12, backgroundColor: BLUE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18 }, primaryButtonText: { color: "white", fontSize: 15, fontWeight: "800" },
  secondaryButton: { borderWidth: 1, borderColor: BLUE }, secondaryButtonText: { color: BLUE }, disabledButton: { opacity: 0.65 },
  invalidHeader: { paddingHorizontal: 10 }, invalidBody: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 14 }, invalidTitle: { fontSize: 25, fontWeight: "800", textAlign: "center" }, invalidText: { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 8 },
});
