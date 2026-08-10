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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Destination, ExploreRegion } from "./destinationCatalogue";
import { exploreRegionSlug } from "./destinationCatalogue";
import { FlowIcon } from "../flow/FlowIcon";
import { AndroidFavoriteButton } from "../home/AndroidFavoriteButton";
import {
  exactExploreResult,
  exploreBottomPadding,
  REGION_DISCOVERY,
  searchExplore,
} from "./exploreModels";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { destinationDetailsRoute } from "./exploreInteractionModels";
import { destinationMedia, FALLBACK_SOURCE } from "./destinationMedia";

const NAVY = "#071A48", BLUE = "#0754F7", MUTED = "#56658E", BORDER = "#E7ECF5";
export const REGION_PREVIEW_CARD_WIDTH_RATIO = 0.928;
export const REGION_PREVIEW_INSET_RATIO = 0.024;
export const REGION_PREVIEW_GAP_RATIO = 0.024;
export const REGION_PREVIEW_ASPECT_RATIO = 2.13;
export const REGION_PREVIEW_IMAGE_ASPECT_RATIO = 3.21;
const shadow = { shadowColor: "#18305B", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 };

export function DestinationThumbnail({ destination }: { destination: Destination }) {
  const media = destinationMedia(destination.id);
  const [failed, setFailed] = useState(false);
  return <Image source={failed ? FALLBACK_SOURCE : (media?.source ?? FALLBACK_SOURCE)} alt={`${destination.name}, ${destination.country}`} accessibilityLabel={media?.accessibilityLabel ?? `${destination.name}, ${destination.country} travel landscape`} resizeMode="cover" onError={() => setFailed(true)} style={s.rowImage} />;
}

export function DestinationResultRow({ destination, saved, onSelect, onToggle }: { destination: Destination; saved: boolean; onSelect: () => void; onToggle: () => void }) {
  return <View style={s.resultRow}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open details for ${destination.name}, ${destination.country}, ${destination.primaryAirportCode}`} onPress={onSelect} style={s.resultMain}>
      <DestinationThumbnail key={destination.id} destination={destination} />
      <View style={s.resultCopy}><Text style={s.resultTitle}>{destination.name}</Text><Text style={s.resultMeta}>{destination.country} · {destination.primaryAirportCode}{destination.airportCodes.length > 1 ? ` + ${destination.airportCodes.length - 1} airports` : ""}</Text></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? "Remove" : "Save"} ${destination.name}`} onPress={onToggle} style={s.rowHeart}><FlowIcon name="heart" color={saved ? "#E92D55" : MUTED} /></Pressable>
  </View>;
}

function ExploreHeader({ query, setQuery, input, submit }: { query: string; setQuery: (value: string) => void; input: React.RefObject<TextInput | null>; submit: () => void }) {
  return <><View style={s.header}><Text accessibilityRole="header" style={s.title}>Explore</Text></View><View style={s.search}>
    <FlowIcon name="search" size={22} />
    <TextInput ref={input} accessibilityLabel="Explore search" accessibilityHint="Search destinations or airports" value={query} onChangeText={setQuery} onSubmitEditing={submit} returnKeyType="search" placeholder="Search destinations or airports" placeholderTextColor="#7B849F" style={s.searchInput} />
    <Pressable accessibilityRole="button" accessibilityLabel="Clear Explore search" accessibilityElementsHidden={!query} importantForAccessibility={query ? "auto" : "no-hide-descendants"} disabled={!query} onPress={() => { setQuery(""); input.current?.focus(); }} style={[s.clear, !query && s.clearHidden]}><Text style={s.clearText}>Clear</Text></Pressable>
  </View></>;
}

export function ExploreScreen() {
  const [query, setQuery] = useState("");
  const { savedIds, toggle } = useSavedDestinations();
  const insets = useSafeAreaInsets();
  const input = useRef<TextInput>(null);
  const results = useMemo(() => searchExplore(query), [query]);
  const select = (destination: Destination) => { Keyboard.dismiss(); input.current?.blur(); router.push(destinationDetailsRoute(destination.id)); };
  const submit = () => { const exact = exactExploreResult(results); if (exact) select(exact); };
  useEffect(() => { if (query.trim()) void AccessibilityInfo.announceForAccessibility(`${results.length} ${results.length === 1 ? "result" : "results"}`); }, [query, results.length]);
  const bottomPadding = exploreBottomPadding(65, insets.bottom);
  return <SafeAreaView style={s.safe} edges={["top"]}>
    <View style={s.stableHeader}><ExploreHeader query={query} setQuery={setQuery} input={input} submit={submit} /></View>
    {query.trim() ? <FlatList data={results} keyExtractor={(item) => item.destination.id} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]} ListHeaderComponent={<SectionHeading title={`${results.length} result${results.length === 1 ? "" : "s"}`} />} ListEmptyComponent={<Text style={s.empty}>No destinations match “{query.trim()}”. Try a city, destination code, airport, or country.</Text>} renderItem={({ item }) => <DestinationResultRow destination={item.destination} saved={savedIds.has(item.destination.id)} onSelect={() => select(item.destination)} onToggle={() => toggle(item.destination.id)} />} />
      : <ExploreDiscoveryContent bottomPadding={bottomPadding} select={select} />}
  </SafeAreaView>;
}

function SectionHeading({ title }: { title: string }) {
  return <View style={s.sectionHeader}><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text></View>;
}

function RegionPreviewCard({ destination, saved, onSelect, onToggle, width, height, imageHeight }: { destination: Destination; saved: boolean; onSelect: () => void; onToggle: () => void; width: number; height: number; imageHeight: number }) {
  const media = destinationMedia(destination.id);
  const [failed, setFailed] = useState(false);
  return <View style={[s.previewCard, { width, height }]}><Pressable accessibilityRole="button" accessibilityLabel={`Open details for ${destination.name}, ${destination.country}`} onPress={onSelect} style={s.previewMain}>
    <Image source={failed ? FALLBACK_SOURCE : (media?.source ?? FALLBACK_SOURCE)} alt={`${destination.name}, ${destination.country}`} onError={() => setFailed(true)} accessibilityLabel={media?.accessibilityLabel ?? `${destination.name}, ${destination.country} travel landscape`} resizeMode="cover" style={[s.previewImage, { height: imageHeight }]} />
    <View style={[s.previewCopy, { height: height - imageHeight }]}><Text numberOfLines={1} style={s.previewName}>{destination.name}</Text><Text numberOfLines={1} style={s.previewCountry}>{destination.country}</Text></View>
  </Pressable><AndroidFavoriteButton saved={saved} label={`${saved ? "Remove" : "Save"} ${destination.name}`} onPress={onToggle} style={s.heart} />
  </View>;
}

function ExploreDiscoveryContent({ bottomPadding, select }: { bottomPadding: number; select: (destination: Destination) => void }) {
  const { savedIds, toggle } = useSavedDestinations();
  const { width: windowWidth } = useWindowDimensions();
  const previewCardWidth = windowWidth * REGION_PREVIEW_CARD_WIDTH_RATIO;
  const previewCardHeight = previewCardWidth / REGION_PREVIEW_ASPECT_RATIO;
  const previewImageHeight = previewCardWidth / REGION_PREVIEW_IMAGE_ASPECT_RATIO;
  const previewInset = windowWidth * REGION_PREVIEW_INSET_RATIO;
  const previewGap = windowWidth * REGION_PREVIEW_GAP_RATIO;
  const openRegion = (region: ExploreRegion) => router.push({ pathname: "/explore/region/[region]", params: { region: exploreRegionSlug(region) } });
  return <FlatList data={REGION_DISCOVERY} keyExtractor={({ region }) => region} contentContainerStyle={[s.discoveryContent, { paddingBottom: bottomPadding }]} renderItem={({ item }) => <View style={s.regionSection}>
    <View style={[s.regionHeader, { paddingHorizontal: previewInset }]}><View><Text accessibilityRole="header" style={s.regionTitle}>{item.region}</Text><Text style={s.regionCount}>{item.destinations.length} destinations</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`See all destinations in ${item.region}`} onPress={() => openRegion(item.region)} style={s.seeAll}><Text style={s.seeAllText}>See all</Text><FlowIcon name="chevron" color={BLUE} size={16} /></Pressable></View>
    <FlatList horizontal data={item.preview} keyExtractor={(destination) => destination.id} showsHorizontalScrollIndicator={false} contentContainerStyle={[s.previewRow, { paddingHorizontal: previewInset, gap: previewGap }]} snapToInterval={previewCardWidth + previewGap} decelerationRate="fast" renderItem={({ item: destination }) => <RegionPreviewCard destination={destination} saved={savedIds.has(destination.id)} onSelect={() => select(destination)} onToggle={() => toggle(destination.id)} width={previewCardWidth} height={previewCardHeight} imageHeight={previewImageHeight} />} />
  </View>} />;
}

export const exploreScreenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFBFF" }, stableHeader: { paddingHorizontal: 18, paddingBottom: 8 }, content: { paddingHorizontal: 18 }, discoveryContent: { paddingTop: 8 },
  header: { minHeight: 58, justifyContent: "center" }, title: { color: NAVY, fontSize: 30, lineHeight: 38, fontWeight: "800" },
  search: { minHeight: 52, borderRadius: 26, borderWidth: 1, borderColor: BORDER, backgroundColor: "white", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 8, ...shadow }, searchInput: { flex: 1, minHeight: 50, color: NAVY, fontSize: 13 }, clear: { minHeight: 44, justifyContent: "center" }, clearHidden: { opacity: 0 }, clearText: { color: BLUE, fontWeight: "700" },
  sectionHeader: { minHeight: 44, justifyContent: "center" }, sectionTitle: { color: NAVY, fontSize: 17, lineHeight: 23, fontWeight: "800" },
  resultRow: { minHeight: 68, borderWidth: 1, borderColor: BORDER, borderRadius: 12, backgroundColor: "white", flexDirection: "row", alignItems: "center", marginBottom: 8, ...shadow }, resultMain: { flex: 1, minHeight: 76, paddingLeft: 8, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 12 }, rowImage: { width: 58, height: 58, borderRadius: 10, backgroundColor: "#E7ECF5" }, resultCopy: { flex: 1 }, resultTitle: { color: NAVY, fontSize: 15, fontWeight: "800" }, resultMeta: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: 2 }, rowHeart: { width: 52, minHeight: 52, alignItems: "center", justifyContent: "center" }, empty: { color: MUTED, lineHeight: 20, backgroundColor: "white", borderRadius: 12, padding: 14 },
  regionSection: { marginBottom: 18 }, regionHeader: { minHeight: 58, paddingBottom: 6, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }, regionTitle: { color: NAVY, fontSize: 22, lineHeight: 28, fontWeight: "800" }, regionCount: { color: MUTED, fontSize: 13, lineHeight: 18, marginTop: 1 }, seeAll: { minHeight: 44, flexDirection: "row", alignItems: "center", paddingLeft: 12 }, seeAllText: { color: BLUE, fontSize: 13, fontWeight: "700" }, previewRow: {}, previewCard: { borderRadius: 6, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, overflow: "hidden", ...shadow }, previewMain: { flex: 1 }, previewImage: { width: "100%", backgroundColor: "#E7ECF5" }, previewCopy: { paddingHorizontal: 14, paddingVertical: 4, justifyContent: "center" }, previewName: { color: NAVY, fontSize: 16, lineHeight: 20, fontWeight: "800" }, previewCountry: { color: MUTED, fontSize: 12, lineHeight: 16, marginTop: 2 }, heart: {
    position: "absolute",
    right: 10,
    top: 10,
  },
});
const s = exploreScreenStyles;
