import { useMemo, useRef, useState } from "react";
import {
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
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  exploreBottomPadding,
  formatFlightAccess,
  formatDestinationCount,
} from "./exploreModels";
import { destinationDetailsRoute } from "./exploreInteractionModels";
import { DestinationResultRow } from "./ExploreScreen";
import { FlowIcon } from "../flow/FlowIcon";
import { AndroidFavoriteButton } from "../home/AndroidFavoriteButton";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { destinationMedia, FALLBACK_SOURCE } from "./destinationMedia";
import {
  regionBrowseCardLayout,
  REGION_BROWSE_CARD_HORIZONTAL_INSET,
  REGION_BROWSE_HORIZONTAL_INSET,
} from "./regionBrowseCardLayout";
import { useExploreCatalogue } from "./exploreCatalogueStore";
import { useAppTheme } from "../../theme/AppTheme";
import {
  exactLiveExploreResult,
  liveExploreRegionBySlug,
  searchLiveExplore,
  type LiveExploreDestination,
} from "./liveExploreModels";

const BLUE = "#0754F7";
function RegionBrowseDestinationCard({
  destination,
  saved,
  onSelect,
  onToggle,
  layout,
}: {
  destination: LiveExploreDestination;
  saved: boolean;
  onSelect: () => void;
  onToggle: () => void;
  layout: ReturnType<typeof regionBrowseCardLayout>;
}) {
  const { theme } = useAppTheme();
  const media = destinationMedia(destination.imageDestinationId) ?? destinationMedia(destination.id);
  const [failed, setFailed] = useState(false);

  return (
    <View style={[s.browseCard, { width: layout.width, height: layout.height, backgroundColor: theme.surface, borderColor: theme.border }, theme.dark && s.darkShadow]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${destination.name}, ${destination.country}, ${destination.primaryAirportCode}`}
        onPress={onSelect}
        style={s.browseMain}
      >
        <Image
          source={failed ? FALLBACK_SOURCE : (media?.source ?? FALLBACK_SOURCE)}
          alt={`${destination.name}, ${destination.country}`}
          accessibilityLabel={media?.accessibilityLabel ?? `${destination.name}, ${destination.country} travel landscape`}
          resizeMode="cover"
          onError={() => setFailed(true)}
          style={[s.browseImage, { height: layout.imageHeight, backgroundColor: theme.border }]}
        />
        <View style={[s.browseCopy, { height: layout.informationHeight, backgroundColor: theme.surface }]}>
          <Text accessibilityLabel={`${destination.name}, ${destination.country}`} numberOfLines={1} ellipsizeMode="tail" style={s.browseTitle}>
            <Text style={[s.browseName, { color: theme.textPrimary }]}>{destination.name}</Text>
            <Text style={[s.browseCountry, { color: theme.textSecondary }]}> · {destination.country}</Text>
          </Text>
          <Text numberOfLines={3} ellipsizeMode="tail" style={[s.browseSummary, { color: theme.textSecondary }]}>{destination.summary}</Text>
          <Text numberOfLines={2} ellipsizeMode="tail" style={[s.browseAirport, { color: theme.textMuted }]}>
            {formatFlightAccess(destination.primaryAirportCode, destination.airportCodes)}
          </Text>
        </View>
      </Pressable>
      <AndroidFavoriteButton saved={saved} label={`${saved ? "Remove" : "Save"} ${destination.name}`} onPress={onToggle} style={s.browseHeart} />
    </View>
  );
}

export function ExploreRegionScreen() {
  const { theme } = useAppTheme();
  const catalogue = useExploreCatalogue();
  const { region: slug } = useLocalSearchParams<{ region?: string }>();
  const region = liveExploreRegionBySlug(catalogue, slug ?? "");
  const [query, setQuery] = useState("");
  const input = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const browseCardLayout = regionBrowseCardLayout(windowWidth);
  const { savedIds, toggle } = useSavedDestinations();
  const allDestinations = region?.destinations ?? [];
  const searchActive = Boolean(query.trim());
  const searchResults = useMemo(
    () => region && searchActive ? searchLiveExplore(query, region.destinations) : [],
    [query, region, searchActive],
  );
  const results = useMemo(() => searchResults.map(({ destination }) => destination), [searchResults]);
  const select = (destination: LiveExploreDestination) => {
    Keyboard.dismiss();
    router.push(destinationDetailsRoute(destination.id));
  };
  const submit = () => {
    const exact = exactLiveExploreResult(searchResults);
    if (exact) select(exact);
  };

  if (!region)
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" onPress={() => router.back()} style={s.back}>
          <FlowIcon name="back" color={theme.icon} />
          <Text style={[s.backText, { color: theme.textPrimary }]}>Explore</Text>
        </Pressable>
        <Text style={[s.invalid, { color: theme.textSecondary }]}>Region not found.</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" onPress={() => router.back()} style={s.back}>
          <FlowIcon name="back" color={theme.icon} />
          <Text style={[s.backText, { color: theme.textPrimary }]}>Explore</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[s.title, { color: theme.textPrimary }]}>{region.name}</Text>
        <View style={[s.search, { backgroundColor: theme.surface, borderColor: theme.border }, theme.dark && s.darkShadow]}>
          <FlowIcon name="search" size={22} color={theme.icon} />
          <TextInput
            ref={input}
            accessibilityLabel={`Search ${region.name}`}
            accessibilityHint={`Search destinations or airports in ${region.name}`}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            returnKeyType="search"
            placeholder={`Search ${region.name}`}
            placeholderTextColor={theme.textMuted}
            style={[s.searchInput, { color: theme.textPrimary }]}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${region.name} search`} onPress={() => { setQuery(""); input.current?.focus(); }} style={s.clear}>
              <Text style={s.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[s.count, { color: theme.textSecondary }]}>{formatDestinationCount(searchActive ? results.length : allDestinations.length)}</Text>
      </View>
      {searchActive ? (
        <FlatList
          alwaysBounceVertical={false}
          bounces={false}
          data={results}
          overScrollMode="never"
          keyExtractor={(destination) => destination.id}
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={[s.list, { paddingBottom: exploreBottomPadding(20, insets.bottom) }]}
          ListEmptyComponent={<Text style={[s.empty, { color: theme.textSecondary }]}>No destinations found in {region.name}</Text>}
          renderItem={({ item }) => (
            <DestinationResultRow destination={item} saved={savedIds.has(item.id)} onSelect={() => select(item)} onToggle={() => toggle(item.id)} />
          )}
        />
      ) : (
        <FlatList
          alwaysBounceVertical={false}
          bounces={false}
          data={allDestinations}
          overScrollMode="never"
          keyExtractor={(destination) => destination.id}
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={[s.browseList, { paddingBottom: exploreBottomPadding(20, insets.bottom) }]}
          renderItem={({ item }) => (
            <RegionBrowseDestinationCard destination={item} saved={savedIds.has(item.id)} onSelect={() => select(item)} onToggle={() => toggle(item.id)} layout={browseCardLayout} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 18 },
  back: { minHeight: 48, flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4 },
  backText: { fontSize: 14, fontWeight: "700" },
  title: { fontSize: 28, lineHeight: 36, fontWeight: "800", marginBottom: 12 },
  search: { minHeight: 52, borderRadius: 26, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 8 },
  searchInput: { flex: 1, minHeight: 50, fontSize: 13 },
  clear: { minHeight: 44, justifyContent: "center" },
  clearText: { color: BLUE, fontWeight: "700" },
  count: { fontSize: 13, fontWeight: "600", paddingVertical: 14 },
  list: { paddingHorizontal: REGION_BROWSE_HORIZONTAL_INSET },
  browseList: { paddingHorizontal: REGION_BROWSE_CARD_HORIZONTAL_INSET },
  browseCard: { borderWidth: 1, borderRadius: 16, overflow: "hidden", marginBottom: 12, shadowColor: "#18305B", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  browseMain: { width: "100%" },
  browseImage: { width: "100%" },
  browseCopy: { padding: 14, gap: 3 },
  browseTitle: { flexShrink: 1 },
  browseName: { fontSize: 21, lineHeight: 27, fontWeight: "800" },
  browseCountry: { fontSize: 14, fontWeight: "600" },
  browseSummary: { fontSize: 14, lineHeight: 20, fontWeight: "400", marginTop: 5, marginBottom: 4, flexShrink: 1 },
  browseAirport: { fontSize: 12, lineHeight: 18, flexShrink: 1 },
  darkShadow: { shadowOpacity: 0, elevation: 1 },
  browseHeart: { position: "absolute", right: 10, top: 10 },
  empty: { paddingVertical: 18 },
  invalid: { padding: 18 },
});
