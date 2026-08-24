import { router, useFocusEffect } from "expo-router";
import { Fragment, useCallback, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FlightResult, MobileRecentSearch, MobileSavedItem } from "../../api/travelApi";
import { travelApi } from "../../api/travelApi";
import { useCanonicalSaved } from "../../storage/useCanonicalSaved";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { useAppTheme } from "../../theme/AppTheme";
import { destinationById } from "../explore/destinationCatalogue";
import { destinationMedia, FALLBACK_SOURCE, type DestinationMedia } from "../explore/destinationMedia";
import { formatFlightAccess } from "../explore/exploreModels";
import { regionBrowseCardLayout } from "../explore/regionBrowseCardLayout";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { hasValidSearchPlan, legacyFlightSearchParams, legacyHotelSearchParams, sanitizeSearchParams } from "../flow/savedSearchContext";

type SavedCardModel = {
  item: MobileSavedItem;
  title: string;
  secondary: string;
  supporting?: string;
  summary?: string;
  media?: DestinationMedia;
  open?: () => void;
};

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;

export function canonicalSavedCards(items: readonly MobileSavedItem[]): SavedCardModel[] {
  return items.map((item) => {
    const payload = record(item.payload);
    const query = record(item.query);
    if (item.type === "flight") {
      const result = record(payload?.result) as FlightResult | undefined;
      const storedParams = sanitizeSearchParams("flight", payload?.searchParams);
      const legacyParams = legacyFlightSearchParams(item, result);
      const params = hasValidSearchPlan("flight", storedParams) ? storedParams : legacyParams;
      const resultsReady = hasValidSearchPlan("flight", params);
      const title = text(item.airlineName) ?? text(item.label) ?? "Saved flight";
      const origin = text(item.originAirport);
      const destination = text(item.destinationAirport);
      return { item, title, secondary: origin && destination ? `${origin} → ${destination}` : "Flight", supporting: text(item.flightNumber), open: Object.keys(params).length ? () => router.push({ pathname: resultsReady ? "/flight-results" : "/flights", params }) : undefined };
    }
    if (item.type === "hotel") {
      const storedParams = sanitizeSearchParams("hotel", payload?.searchParams);
      const legacyParams = legacyHotelSearchParams(item);
      const params = hasValidSearchPlan("hotel", storedParams) ? storedParams : legacyParams;
      const resultsReady = hasValidSearchPlan("hotel", params);
      const title = text(item.hotelName) ?? text(item.label) ?? "Saved hotel";
      return { item, title, secondary: text(item.destination) ?? "Hotel", open: Object.keys(params).length ? () => router.push({ pathname: resultsReady ? "/hotel-results" : "/hotels", params }) : undefined };
    }
    const destinationId = text(query?.destinationId);
    const canonicalDestination = destinationId
      ? destinationById.get(destinationId)
      : undefined;
    const title = canonicalDestination?.name ?? text(item.label) ?? "Saved search";
    const searchType = text(item.searchType)?.toLowerCase();
    const destination = text(item.destination);
    const origin = text(item.origin);
    const secondary = canonicalDestination?.country ?? (origin && destination ? `${origin} → ${destination}` : destination ?? (searchType === "hotel" ? "Hotel search" : searchType === "flight" ? "Flight search" : "Search"));
    const supporting = canonicalDestination
      ? formatFlightAccess(canonicalDestination.primaryAirportCode, canonicalDestination.airportCodes)
      : undefined;
    const media = canonicalDestination
      ? destinationMedia(canonicalDestination.imageDestinationId) ?? destinationMedia(canonicalDestination.id)
      : undefined;
    const params = searchType === "hotel" ? sanitizeSearchParams("hotel", query) : sanitizeSearchParams("flight", query);
    const hasFlightRoute = searchType === "flight" && (text(query?.to) || text(query?.destination));
    const hasHotelRoute = searchType === "hotel" && text(query?.destination);
    const resultsReady = (searchType === "flight" || searchType === "hotel") && hasValidSearchPlan(searchType, params);
    const open = hasFlightRoute ? () => router.push({ pathname: resultsReady ? "/flight-results" : "/flights", params }) : hasHotelRoute ? () => router.push({ pathname: resultsReady ? "/hotel-results" : "/hotels", params }) : undefined;
    return { item, title, secondary, supporting, summary: canonicalDestination?.summary, media, open };
  });
}

function SavedCard({ model, remove }: { model: SavedCardModel; remove: (item: MobileSavedItem) => void }) {
  const { theme } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const layout = regionBrowseCardLayout(windowWidth);
  const [imageFailed, setImageFailed] = useState(false);
  const geometry = { width: layout.width, height: layout.height };
  const source = imageFailed ? FALLBACK_SOURCE : (model.media?.source ?? FALLBACK_SOURCE);
  const content = <Fragment><View testID="saved-card-image" style={[styles.imageFrame, { height: layout.imageHeight }]}><Image source={source} accessibilityLabel={model.media?.accessibilityLabel ?? `${model.title} travel image`} resizeMode="cover" onError={() => setImageFailed(true)} style={styles.image} /><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${model.title} from saved`} hitSlop={8} onPress={(event) => { event.stopPropagation(); remove(model.item); }} style={({ pressed }) => [styles.removeTouchTarget, pressed && styles.removePressed]}><View style={[styles.remove, { backgroundColor: theme.surface, borderColor: theme.border }]}><FlowIcon name="close" color={theme.icon} size={16} /></View></Pressable></View><View testID="saved-card-footer" style={[styles.copy, { height: layout.informationHeight }]}><Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>{model.title}</Text><Text numberOfLines={1} style={[styles.secondary, { color: theme.muted }]}>{model.secondary}</Text>{model.summary ? <Text numberOfLines={3} style={[styles.summary, { color: theme.muted }]}>{model.summary}</Text> : null}{model.supporting ? <Text numberOfLines={2} style={[styles.supporting, { color: theme.muted }]}>{model.supporting}</Text> : null}</View></Fragment>;
  return model.open ? <Pressable testID="saved-card" accessibilityRole="button" accessibilityLabel={`Open ${model.title}, ${model.secondary}`} onPress={model.open} style={({ pressed }) => [styles.card, geometry, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}>{content}</Pressable> : <View testID="saved-card" accessibilityLabel={`${model.title}, ${model.secondary}`} style={[styles.card, geometry, { backgroundColor: theme.surface, borderColor: theme.border }]}>{content}</View>;
}

export function SavedRecentScreen() {
  const { theme } = useAppTheme();
  const { isAuthenticated, authResolved } = useSavedDestinations();
  const canonical = useCanonicalSaved();
  const [tab, setTab] = useState<"saved" | "recent">("saved");
  const [recent, setRecent] = useState<MobileRecentSearch[]>([]);
  const [recentError, setRecentError] = useState("");
  const loadServer = useCallback(async () => { if (!isAuthenticated) return; setRecentError(""); try { const searches = await travelApi.recentSearches(); setRecent(searches.items); } catch { setRecentError("Unable to synchronize recent searches. Your last synchronized recent searches remain available."); } }, [isAuthenticated]);
  useFocusEffect(useCallback(() => { void loadServer(); }, [loadServer]));
  const cards = canonicalSavedCards(canonical.items);
  const confirmRemove = (item: MobileSavedItem, title: string) => Alert.alert("Remove from saved?", `Remove ${title} from your saved travel?`, [
    { text: "Cancel", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: () => { void canonical.remove(item.type, item.id).catch(() => undefined); } },
  ]);
  return <SafeAreaView edges={["top", "bottom"]} style={[styles.safe, { backgroundColor: theme.background }]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><FlowIcon name="back" color={theme.icon} size={27} /></Pressable><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Saved & recent</Text></View>
    {!authResolved ? null : !isAuthenticated ? <View style={styles.center}><FlowIcon name="heart" color={flowColors.blue} size={42} /><Text style={[styles.emptyTitle, { color: theme.text }]}>Sign in to view saved favorites</Text><Text style={[styles.emptyText, { color: theme.muted }]}>Your saved travel is private to your account.</Text><Pressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => router.push({ pathname: "/(tabs)/profile/sign-in", params: { returnTo: "/saved" } })} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable></View> : <ScrollView alwaysBounceVertical={false} bounces={false} contentContainerStyle={styles.content} overScrollMode="never">
      <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: theme.surface, borderColor: theme.border }]}>{(["saved", "recent"] as const).map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.activeTab]}><Text style={{ color: tab === value ? "white" : theme.text, fontWeight: "800" }}>{value === "saved" ? "Saved" : "Recent"}</Text></Pressable>)}</View>
      {tab === "saved" && canonical.error ? <Text accessibilityRole="alert" style={styles.syncError}>{canonical.error}</Text> : null}
      {tab === "recent" && recentError ? <Text accessibilityRole="alert" style={styles.syncError}>{recentError}</Text> : null}
      {tab === "saved" ? <><Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>Saved travel</Text><Text style={[styles.explanation, { color: theme.muted }]}>Saved items are things you chose to keep.</Text>{cards.length ? cards.map((model) => <SavedCard key={`${model.item.type}:${model.item.id}`} model={model} remove={(item) => confirmRemove(item, model.title)} />) : !canonical.loading ? <View style={styles.center}><FlowIcon name="heart" color={flowColors.blue} size={42} /><Text style={[styles.emptyTitle, { color: theme.text }]}>No saved travel yet</Text><Text style={[styles.emptyText, { color: theme.muted }]}>Use Save on a flight, hotel, or search to keep it here.</Text></View> : null}</> : <>{recent.length ? <><Pressable accessibilityRole="button" onPress={() => void travelApi.clearRecentSearches().then(loadServer)}><Text style={styles.clear}>Clear all</Text></Pressable>{recent.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Rerun ${item.label}`} onPress={() => router.push({ pathname: item.type === "flight" ? "/flights" : "/hotels", params: item.params as Record<string, string> })} style={[styles.recentRow, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={{ flex: 1 }}><Text style={[styles.name, { color: theme.text }]}>{item.label}</Text><Text style={{ color: theme.muted }}>{item.subtitle}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.label}`} onPress={(event) => { event.stopPropagation(); void travelApi.deleteRecentSearch(item.id).then(loadServer); }} style={styles.removeTouchTarget}><FlowIcon name="close" color={theme.icon} size={16} /></Pressable></Pressable>)}</> : <View style={styles.center}><Text style={[styles.emptyTitle, { color: theme.text }]}>No recent searches</Text><Text style={[styles.emptyText, { color: theme.muted }]}>Successful flight and hotel searches will appear here.</Text></View>}</>}
    </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, header: { height: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }, back: { width: 46, height: 46, alignItems: "center", justifyContent: "center" }, title: { fontSize: 25, lineHeight: 32, fontWeight: "800" }, content: { paddingHorizontal: 18, paddingBottom: 30 }, tabs: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 3 }, tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 9 }, activeTab: { backgroundColor: flowColors.blue }, syncError: { color: "#A4262C", marginTop: 10 }, clear: { color: flowColors.blue, fontWeight: "800", textAlign: "right", paddingVertical: 12 }, recentRow: { minHeight: 68, borderWidth: 1, borderRadius: 12, paddingLeft: 14, marginBottom: 10, flexDirection: "row", alignItems: "center" }, sectionTitle: { fontSize: 19, fontWeight: "800", marginTop: 14 }, explanation: { fontSize: 13, marginTop: 5, marginBottom: 12 }, card: { alignSelf: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, overflow: "hidden", marginBottom: 12 }, imageFrame: { width: "100%", position: "relative", backgroundColor: "#DCE5F3" }, image: { width: "100%", height: "100%" }, copy: { width: "100%", padding: 14, gap: 3, justifyContent: "center" }, name: { fontSize: 21, lineHeight: 27, fontWeight: "800" }, secondary: { fontSize: 14, lineHeight: 18, fontWeight: "600" }, summary: { fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 4, flexShrink: 1 }, supporting: { fontSize: 12, lineHeight: 18, flexShrink: 1 }, removeTouchTarget: { position: "absolute", right: 10, top: 10, width: 44, height: 44, alignItems: "center", justifyContent: "center" }, remove: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" }, removePressed: { opacity: 0.76, transform: [{ scale: 0.94 }] }, center: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 }, emptyTitle: { fontSize: 20, lineHeight: 27, fontWeight: "800", textAlign: "center", marginTop: 15 }, emptyText: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 6 }, primary: { minHeight: 48, marginTop: 20, borderRadius: 10, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", backgroundColor: flowColors.blue }, primaryText: { color: "white", fontSize: 15, fontWeight: "800" }, pressed: { opacity: 0.72 } });
