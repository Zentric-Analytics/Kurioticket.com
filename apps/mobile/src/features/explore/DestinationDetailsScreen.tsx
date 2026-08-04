import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlowIcon } from "../flow/FlowIcon";
import { FavoriteButton } from "../../components/FavoriteButton";
import { destinationById, type Destination } from "./destinationCatalogue";
import { resolveDestinationDetails } from "./destinationDetailsModel";
import { destinationMedia, FALLBACK_SOURCE, resolvedDestinationHeroSource } from "./destinationMedia";
import { destinationHandoff } from "./exploreInteractionModels";
import { useSavedDestinations } from "../../storage/useSavedDestinations";

const NAVY = "#071A48";
const BLUE = "#0754F7";
const MUTED = "#56658E";
const BORDER = "#E7ECF5";

export function DestinationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const destination = resolveDestinationDetails(id);
  const { savedIds, toggle } = useSavedDestinations();

  if (!destination) return <InvalidDestination />;
  return <DestinationPage destination={destination} saved={savedIds.has(destination.id)} onToggle={() => toggle(destination.id)} />;
}

function BackButton() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" onPress={() => router.back()} style={styles.backButton}>
      <FlowIcon name="back" color={NAVY} size={22} />
    </Pressable>
  );
}

function InvalidDestination() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.invalidHeader}><BackButton /></View>
      <View accessibilityRole="alert" style={styles.invalidBody}>
        <Text accessibilityRole="header" style={styles.invalidTitle}>Destination not found</Text>
        <Text style={styles.invalidText}>This Explore destination is unavailable or the link is invalid.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" onPress={() => router.back()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DestinationPage({ destination, saved, onToggle }: { destination: Destination; saved: boolean; onToggle: () => void }) {
  const media = destinationMedia(destination.id);
  const [imageFailed, setImageFailed] = useState(false);
  const handoff = destinationHandoff(destination);
  const searchFlights = () => router.push({
    pathname: "/flights",
    params: { destinationId: destination.id, destination: destination.name, to: handoff.primaryAirportCode, airportCodes: handoff.airportCodes.join(",") },
  });
  const searchHotels = () => router.push({
    pathname: "/hotels",
    params: { destinationId: destination.id, destination: destination.name },
  });
  const related = destination.relatedDestinationIds?.map((relatedId) => destinationById.get(relatedId)).filter((item): item is Destination => Boolean(item));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}><BackButton /><Text numberOfLines={1} style={styles.topTitle}>{destination.name}</Text><View style={styles.topSpacer} /></View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image
          source={resolvedDestinationHeroSource(media, imageFailed)}
          accessibilityLabel={media?.accessibilityLabel ?? `${destination.name}, ${destination.country} travel landscape`}
          resizeMode="cover"
          onError={() => { if (!imageFailed) setImageFailed(true); }}
          style={styles.hero}
        />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text accessibilityRole="header" style={styles.title}>{destination.name}</Text>
              <Text style={styles.country}>{destination.country}</Text>
            </View>
            <FavoriteButton
              saved={saved}
              accessibilityLabel={saved ? `Remove ${destination.name} from saved destinations` : `Save ${destination.name}`}
              onPress={onToggle}
              style={styles.heart}
            />
          </View>
          <View style={styles.primaryAirport}>
            <Text style={styles.eyebrow}>PRIMARY AIRPORT</Text>
            <Text style={styles.airportCode}>{destination.primaryAirportCode}</Text>
            <Text style={styles.airportName}>{destination.airportNames[destination.airportCodes.indexOf(destination.primaryAirportCode)]}</Text>
          </View>
          {destination.summary ? <Text style={styles.summary}>{destination.summary}</Text> : null}
          {destination.description ? <Section title="About"><Text style={styles.paragraph}>{destination.description}</Text></Section> : null}
          <Section title={destination.airportCodes.length === 1 ? "Airport" : "Airports"}>
            {destination.airportCodes.map((code, index) => <View key={code} style={styles.airportRow}><Text style={styles.airportRowCode}>{code}</Text><Text style={styles.airportRowName}>{destination.airportNames[index]}</Text></View>)}
          </Section>
          {destination.highlights?.length ? <Section title="Highlights">{destination.highlights.map((highlight) => <View key={highlight} style={styles.highlight}><View style={styles.bullet} /><Text style={styles.highlightText}>{highlight}</Text></View>)}</Section> : null}
          {related?.length ? <Section title="Related destinations">{related.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.name}`} onPress={() => router.replace({ pathname: "/explore/destination/[id]", params: { id: item.id } })} style={styles.related}><Text style={styles.relatedName}>{item.name}</Text><Text style={styles.relatedCountry}>{item.country}</Text></Pressable>)}</Section> : null}
          <View style={styles.actions}>
            <Action label="Search flights" icon="flight" onPress={searchFlights} />
            <Action label="Search hotels" icon="hotel" onPress={searchHotels} secondary />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Action({ label, icon, onPress, secondary = false }: { label: string; icon: "flight" | "hotel"; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.primaryButton, secondary && styles.secondaryButton]}><FlowIcon name={icon} color={secondary ? BLUE : "white"} size={20} /><Text style={[styles.primaryButtonText, secondary && styles.secondaryButtonText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFBFF" },
  topBar: { minHeight: 56, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: "white" },
  backButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24 },
  topTitle: { flex: 1, color: NAVY, textAlign: "center", fontSize: 16, fontWeight: "800" },
  topSpacer: { width: 48 },
  content: { paddingBottom: 36 },
  hero: { width: "100%", aspectRatio: 4 / 3, maxHeight: 360, minHeight: 240, backgroundColor: "#E7ECF5" },
  body: { padding: 18, gap: 20 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  titleCopy: { flex: 1 }, title: { color: NAVY, fontSize: 30, lineHeight: 38, fontWeight: "800" },
  country: { color: MUTED, fontSize: 16, marginTop: 2 },
  heart: { marginLeft: 12 },
  primaryAirport: { padding: 16, borderRadius: 14, backgroundColor: "#EDF3FF" },
  eyebrow: { color: BLUE, fontSize: 11, letterSpacing: 1, fontWeight: "800" }, airportCode: { color: NAVY, fontSize: 26, fontWeight: "800", marginTop: 3 }, airportName: { color: MUTED, fontSize: 13, lineHeight: 19 },
  summary: { color: NAVY, fontSize: 17, lineHeight: 25, fontWeight: "600" }, paragraph: { color: MUTED, fontSize: 15, lineHeight: 23 },
  section: { gap: 10 }, sectionTitle: { color: NAVY, fontSize: 19, fontWeight: "800" },
  airportRow: { minHeight: 58, paddingVertical: 10, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: BORDER, gap: 14 },
  airportRowCode: { width: 48, color: BLUE, fontSize: 16, fontWeight: "800" }, airportRowName: { flex: 1, color: NAVY, fontSize: 14, lineHeight: 20 },
  highlight: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: BLUE, marginTop: 7 }, highlightText: { flex: 1, color: MUTED, fontSize: 15, lineHeight: 22 },
  related: { minHeight: 58, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: BORDER }, relatedName: { color: NAVY, fontSize: 15, fontWeight: "800" }, relatedCountry: { color: MUTED, fontSize: 13 },
  actions: { gap: 10, marginTop: 4 }, primaryButton: { minHeight: 52, borderRadius: 12, backgroundColor: BLUE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18 }, primaryButtonText: { color: "white", fontSize: 15, fontWeight: "800" },
  secondaryButton: { backgroundColor: "white", borderWidth: 1, borderColor: BLUE }, secondaryButtonText: { color: BLUE },
  invalidHeader: { paddingHorizontal: 10 }, invalidBody: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 14 }, invalidTitle: { color: NAVY, fontSize: 25, fontWeight: "800", textAlign: "center" }, invalidText: { color: MUTED, fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 8 },
});
