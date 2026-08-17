import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlowIcon } from "../flow/FlowIcon";
import { AndroidFavoriteButton } from "../home/AndroidFavoriteButton";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { useAppTheme } from "../../theme/AppTheme";
import { destinationDetailsRoute } from "./exploreInteractionModels";
import { destinationMedia, FALLBACK_SOURCE } from "./destinationMedia";
import { useExploreCatalogue } from "./exploreCatalogueStore";
import {
  allLiveExploreDestinations,
  exactLiveExploreResult,
  liveRegionDiscovery,
  searchLiveExplore,
  type LiveExploreDestination,
} from "./liveExploreModels";

const BLUE = "#0754F7";
const SEARCH_RESULTS_BOTTOM_SPACING = 18;
export const REGION_PREVIEW_CARD_WIDTH_RATIO = 0.928;
export const REGION_PREVIEW_NEXT_CARD_PEEK_EXPANSION_RATIO = 0.058;
export const REGION_PREVIEW_INSET_RATIO = 0.024;
export const REGION_PREVIEW_GAP_RATIO = 0.024;
export const REGION_PREVIEW_ASPECT_RATIO = 2.13;
export const REGION_PREVIEW_IMAGE_ASPECT_RATIO = 3.21;
export const REGION_PREVIEW_IMAGE_HEIGHT_SCALE = 1.12;
const shadow = { shadowColor: "#18305B", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 };

export function DestinationThumbnail({ destination }: { destination: LiveExploreDestination }) {
  const { theme } = useAppTheme();
  const media = destinationMedia(destination.imageDestinationId) ?? destinationMedia(destination.id);
  const [failed, setFailed] = useState(false);
  return <Image source={failed ? FALLBACK_SOURCE : (media?.source ?? FALLBACK_SOURCE)} alt={`${destination.name}, ${destination.country}`} accessibilityLabel={media?.accessibilityLabel ?? `${destination.name}, ${destination.country} travel landscape`} resizeMode="cover" onError={() => setFailed(true)} style={[s.rowImage, { backgroundColor: theme.border }]} />;
}

export function DestinationResultRow({ destination, saved, onSelect, onToggle }: { destination: LiveExploreDestination; saved: boolean; onSelect: () => void; onToggle: () => void }) {
  const { theme } = useAppTheme();
  return <View style={[s.resultRow, { backgroundColor: theme.surface, borderColor: theme.border }, theme.dark && s.darkShadow]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open details for ${destination.name}, ${destination.country}, ${destination.primaryAirportCode}`} onPress={onSelect} style={s.resultMain}>
      <DestinationThumbnail key={destination.id} destination={destination} />
      <View style={s.resultCopy}><Text style={[s.resultTitle, { color: theme.textPrimary }]}>{destination.name}</Text><Text style={[s.resultMeta, { color: theme.textSecondary }]}>{destination.country} · {destination.primaryAirportCode}{destination.airportCodes.length > 1 ? ` + ${destination.airportCodes.length - 1} airports` : ""}</Text></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? "Remove" : "Save"} ${destination.name}`} onPress={onToggle} style={s.rowHeart}><FlowIcon name="heart" color={saved ? "#E92D55" : theme.icon} /></Pressable>
  </View>;
}

function ExploreHeader({ query, setQuery, input, submit }: { query: string; setQuery: (value: string) => void; input: React.RefObject<TextInput | null>; submit: () => void }) {
  const { theme } = useAppTheme();
  return <><View style={s.header}><Text accessibilityRole="header" style={[s.title, { color: theme.textPrimary }]}>Explore</Text></View><View style={[s.search, { backgroundColor: theme.surface, borderColor: theme.border }, theme.dark && s.darkShadow]}>
    <FlowIcon name="search" size={22} color={theme.icon} />
    <TextInput ref={input} accessibilityLabel="Explore search" accessibilityHint="Search destinations or airports" value={query} onChangeText={setQuery} onSubmitEditing={submit} returnKeyType="search" placeholder="Search destinations or airports" placeholderTextColor={theme.textMuted} style={[s.searchInput, { color: theme.textPrimary }]} />
    <Pressable accessibilityRole="button" accessibilityLabel="Clear Explore search" accessibilityElementsHidden={!query} importantForAccessibility={query ? "auto" : "no-hide-descendants"} disabled={!query} onPress={() => { setQuery(""); input.current?.focus(); }} style={[s.clear, !query && s.clearHidden]}><Text style={s.clearText}>Clear</Text></Pressable>
  </View></>;
}

export function ExploreScreen() {
  const { theme } = useAppTheme();
  const catalogue = useExploreCatalogue();
  const [query, setQuery] = useState("");
  const { savedIds, toggle } = useSavedDestinations();
  const input = useRef<TextInput>(null);
  const destinations = useMemo(() => allLiveExploreDestinations(catalogue), [catalogue]);
  const REGION_DISCOVERY = useMemo(
    () => liveRegionDiscovery(catalogue).map(({ region, destinations: regionDestinations, preview }) => ({
      region: region.name,
      regionId: region.id,
      regionSlug: region.slug,
      destinations: regionDestinations,
      preview,
    })),
    [catalogue],
  );
  const results = useMemo(() => searchLiveExplore(query, destinations), [query, destinations]);
  const select = (destination: LiveExploreDestination) => { Keyboard.dismiss(); input.current?.blur(); router.push(destinationDetailsRoute(destination.id)); };
  const submit = () => { const exact = exactLiveExploreResult(results); if (exact) select(exact); };
  useEffect(() => { if (query.trim()) void AccessibilityInfo.announceForAccessibility(`${results.length} ${results.length === 1 ? "result" : "results"}`); }, [query, results.length]);
  return <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]} edges={["top"]}>
    <View style={s.stableHeader}><ExploreHeader query={query} setQuery={setQuery} input={input} submit={submit} /></View>
    {query.trim() ? <FlatList alwaysBounceVertical={false} bounces={false} overScrollMode="never" data={results} keyExtractor={(item) => item.destination.id} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingBottom: SEARCH_RESULTS_BOTTOM_SPACING }]} ListHeaderComponent={<SectionHeading title={`${results.length} result${results.length === 1 ? "" : "s"}`} />} ListEmptyComponent={<Text style={[s.empty, { backgroundColor: theme.surface, color: theme.textSecondary }]}>No destinations match “{query.trim()}”. Try a city, destination code, airport, or country.</Text>} renderItem={({ item }) => <DestinationResultRow destination={item.destination} saved={savedIds.has(item.destination.id)} onSelect={() => select(item.destination)} onToggle={() => toggle(item.destination.id)} />} />
      : <ExploreDiscoveryContent REGION_DISCOVERY={REGION_DISCOVERY} select={select} />}
  </SafeAreaView>;
}

function SectionHeading({ title }: { title: string }) {
  const { theme } = useAppTheme();
  return <View style={s.sectionHeader}><Text accessibilityRole="header" style={[s.sectionTitle, { color: theme.textPrimary }]}>{title}</Text></View>;
}

function RegionPreviewCard({ destination, saved, onSelect, onToggle, width, height, imageHeight }: { destination: LiveExploreDestination; saved: boolean; onSelect: () => void; onToggle: () => void; width: number; height: number; imageHeight: number }) {
  const { theme } = useAppTheme();
  const media = destinationMedia(destination.imageDestinationId) ?? destinationMedia(destination.id);
  const [failed, setFailed] = useState(false);
  return <View style={[s.previewCard, { width, height, backgroundColor: theme.surface }, theme.dark && s.darkShadow]}><Pressable accessibilityRole="button" accessibilityLabel={`Open details for ${destination.name}, ${destination.country}`} onPress={onSelect} style={s.previewMain}>
    <Image source={failed ? FALLBACK_SOURCE : (media?.source ?? FALLBACK_SOURCE)} alt={`${destination.name}, ${destination.country}`} onError={() => setFailed(true)} accessibilityLabel={media?.accessibilityLabel ?? `${destination.name}, ${destination.country} travel landscape`} resizeMode="cover" style={[s.previewImage, { height: imageHeight, backgroundColor: theme.border }]} />
    <View style={[s.previewCopy, { height: height - imageHeight }]}><Text numberOfLines={1} style={[s.previewName, { color: theme.textPrimary }]}>{destination.name}</Text><Text numberOfLines={1} style={[s.previewCountry, { color: theme.textSecondary }]}>{destination.country}</Text></View>
  </Pressable><AndroidFavoriteButton saved={saved} label={`${saved ? "Remove" : "Save"} ${destination.name}`} onPress={onToggle} style={s.heart} />
  </View>;
}

type RegionDiscoveryItem = {
  region: string;
  regionId: string;
  regionSlug: string;
  destinations: LiveExploreDestination[];
  preview: LiveExploreDestination[];
};

function ExploreDiscoveryContent({ REGION_DISCOVERY, select }: { REGION_DISCOVERY: RegionDiscoveryItem[]; select: (destination: LiveExploreDestination) => void }) {
  const { theme } = useAppTheme();
  const { savedIds, toggle } = useSavedDestinations();
  const { width: windowWidth } = useWindowDimensions();
  const previewCardWidth = windowWidth * (REGION_PREVIEW_CARD_WIDTH_RATIO - REGION_PREVIEW_NEXT_CARD_PEEK_EXPANSION_RATIO);
  const previousCardHeight = previewCardWidth / REGION_PREVIEW_ASPECT_RATIO;
  const previousImageHeight = previewCardWidth / REGION_PREVIEW_IMAGE_ASPECT_RATIO;
  const previewImageHeight = previousImageHeight * REGION_PREVIEW_IMAGE_HEIGHT_SCALE;
  const previewCardHeight = previousCardHeight + (previewImageHeight - previousImageHeight);
  const previewInset = windowWidth * REGION_PREVIEW_INSET_RATIO;
  const previewGap = windowWidth * REGION_PREVIEW_GAP_RATIO;
  const openRegion = (regionSlug: string) => router.push({ pathname: "/explore/region/[region]", params: { region: regionSlug } });
  return <FlatList alwaysBounceVertical={false} bounces={false} overScrollMode="never" data={REGION_DISCOVERY} keyExtractor={({ regionId }) => regionId} contentContainerStyle={s.discoveryContent} renderItem={({ item, index }) => <View style={[s.regionSection, index === REGION_DISCOVERY.length - 1 && s.finalRegionSection]}>
    <View style={[s.regionHeader, { paddingHorizontal: previewInset }]}><View><Text accessibilityRole="header" style={[s.regionTitle, { color: theme.textPrimary }]}>{item.region}</Text><Text style={[s.regionCount, { color: theme.textSecondary }]}>{item.destinations.length} destinations</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`See all destinations in ${item.region}`} onPress={() => openRegion(item.regionSlug)} style={s.seeAll}><Text style={s.seeAllText}>See all</Text><FlowIcon name="chevron" color={BLUE} size={16} /></Pressable></View>
    <FlatList horizontal data={item.preview} keyExtractor={(destination) => destination.id} showsHorizontalScrollIndicator={false} contentContainerStyle={[s.previewRow, { paddingHorizontal: previewInset, gap: previewGap }]} snapToInterval={previewCardWidth + previewGap} decelerationRate="fast" renderItem={({ item: destination }) => <RegionPreviewCard destination={destination} saved={savedIds.has(destination.id)} onSelect={() => select(destination)} onToggle={() => toggle(destination.id)} width={previewCardWidth} height={previewCardHeight} imageHeight={previewImageHeight} />} />
  </View>} />;
}

export const exploreScreenStyles = StyleSheet.create({
  safe: { flex: 1 }, stableHeader: { paddingHorizontal: 18, paddingBottom: 8 }, content: { paddingHorizontal: 18 }, discoveryContent: { paddingTop: 8 },
  header: { minHeight: 58, justifyContent: "center" }, title: { fontSize: 30, lineHeight: 38, fontWeight: "800" },
  search: { minHeight: 52, borderRadius: 26, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 8, ...shadow }, searchInput: { flex: 1, minHeight: 50, fontSize: 13 }, clear: { minHeight: 44, justifyContent: "center" }, clearHidden: { opacity: 0 }, clearText: { color: BLUE, fontWeight: "700" },
  sectionHeader: { minHeight: 44, justifyContent: "center" }, sectionTitle: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
  resultRow: { minHeight: 68, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", marginBottom: 8, ...shadow }, resultMain: { flex: 1, minHeight: 76, paddingLeft: 8, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 12 }, rowImage: { width: 58, height: 58, borderRadius: 10 }, resultCopy: { flex: 1 }, resultTitle: { fontSize: 15, fontWeight: "800" }, resultMeta: { fontSize: 12, lineHeight: 18, marginTop: 2 }, rowHeart: { width: 52, minHeight: 52, alignItems: "center", justifyContent: "center" }, empty: { lineHeight: 20, borderRadius: 12, padding: 14 },
  regionSection: { marginBottom: 18 }, finalRegionSection: { marginBottom: 0 }, regionHeader: { minHeight: 58, paddingBottom: 6, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }, regionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "800" }, regionCount: { fontSize: 13, lineHeight: 18, marginTop: 1 }, seeAll: { minHeight: 44, flexDirection: "row", alignItems: "center", paddingLeft: 12 }, seeAllText: { color: BLUE, fontSize: 13, fontWeight: "700" }, previewRow: {}, previewCard: { borderRadius: 6, overflow: "hidden", ...shadow }, previewMain: { flex: 1 }, previewImage: { width: "100%" }, previewCopy: { paddingHorizontal: 14, paddingVertical: 4, justifyContent: "center" }, previewName: { fontSize: 16, lineHeight: 20, fontWeight: "800" }, previewCountry: { fontSize: 12, lineHeight: 16, marginTop: 2 }, darkShadow: { shadowOpacity: 0, elevation: 1 }, heart: {
    position: "absolute",
    right: 10,
    top: 10,
  },
});
const s = exploreScreenStyles;