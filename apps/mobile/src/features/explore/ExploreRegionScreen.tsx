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
  exploreRegionFromSlug,
  type Destination,
} from "./destinationCatalogue";
import {
  DESTINATIONS_BY_REGION,
  exactExploreResult,
  exploreBottomPadding,
  formatFlightAccess,
  formatDestinationCount,
  searchExploreRegion,
} from "./exploreModels";
import { destinationDetailsRoute } from "./exploreInteractionModels";
import { DestinationResultRow } from "./ExploreScreen";
import { FlowIcon } from "../flow/FlowIcon";
import { AndroidFavoriteButton } from "../home/AndroidFavoriteButton";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { destinationMedia, FALLBACK_SOURCE } from "./destinationMedia";
import { useAppTheme } from "../../theme/AppTheme";

const EMPTY_DESTINATIONS: readonly Destination[] = [];
const BLUE = "#0754F7";
export const REGION_BROWSE_HORIZONTAL_INSET = 18;
export const REGION_BROWSE_CARD_HORIZONTAL_INSET = 8;
export const REGION_BROWSE_IMAGE_ASPECT_RATIO = 1.7;
export const REGION_BROWSE_IMAGE_HEIGHT_RATIO = 0.6;

export function regionBrowseCardLayout(screenWidth: number) {
  const width = Math.max(
    240,
    screenWidth - REGION_BROWSE_CARD_HORIZONTAL_INSET * 2,
  );
  const imageHeight = width / REGION_BROWSE_IMAGE_ASPECT_RATIO;
  const height = imageHeight / REGION_BROWSE_IMAGE_HEIGHT_RATIO;
  return { width, height, imageHeight, informationHeight: height - imageHeight };
}

function RegionBrowseDestinationCard({
  destination,
  saved,
  onSelect,
  onToggle,
  layout,
}: {
  destination: Destination;
  saved: boolean;
  onSelect: () => void;
  onToggle: () => void;
  layout: ReturnType<typeof regionBrowseCardLayout>;
}) {
  const { theme } = useAppTheme();
  const media = destinationMedia(destination.id);
  const [failed, setFailed] = useState(false);

  return (
    <View style={[s.browseCard, { width: layout.width, height: layout.height, backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${destination.name}, ${destination.country}, ${destination.primaryAirportCode}`}
        onPress={onSelect}
        style={s.browseMain}
      >
        <Image
          source={
            failed ? FALLBACK_SOURCE : (media?.source ?? FALLBACK_SOURCE)
          }
          alt={`${destination.name}, ${destination.country}`}
          accessibilityLabel={
            media?.accessibilityLabel ??
            `${destination.name}, ${destination.country} travel landscape`
          }
          resizeMode="cover"
          onError={() => setFailed(true)}
          style={[s.browseImage, { height: layout.imageHeight, backgroundColor: theme.border }]}
        />
        <View
          style={[s.browseCopy, { height: layout.informationHeight }]}
        >
          <Text
            accessibilityLabel={`${destination.name}, ${destination.country}`}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[s.browseTitle, { color: theme.text }]}
          >
            <Text style={[s.browseName, { color: theme.text }]}>{destination.name}</Text>
            <Text style={[s.browseCountry, { color: theme.muted }]}> · {destination.country}</Text>
          </Text>
          <Text
            numberOfLines={3}
            ellipsizeMode="tail"
            style={[s.browseSummary, { color: theme.text }]}
          >
            {destination.summary}
          </Text>
          <Text numberOfLines={2} ellipsizeMode="tail" style={[s.browseAirport, { color: theme.muted }]}>
            {formatFlightAccess(
              destination.primaryAirportCode,
              destination.airportCodes,
            )}
          </Text>
        </View>
      </Pressable>
      <AndroidFavoriteButton
        saved={saved}
        label={`${saved ? "Remove" : "Save"} ${destination.name}`}
        onPress={onToggle}
        style={s.browseHeart}
      />
    </View>
  );
}

export function ExploreRegionScreen() {
  const { theme } = useAppTheme();
  const { region: slug } = useLocalSearchParams<{ region?: string }>();
  const region = exploreRegionFromSlug(slug ?? "");
  const [query, setQuery] = useState("");
  const input = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const browseCardLayout = regionBrowseCardLayout(windowWidth);
  const { savedIds, toggle } = useSavedDestinations();
  const allDestinations = region
    ? DESTINATIONS_BY_REGION.get(region)!
    : EMPTY_DESTINATIONS;
  const searchActive = Boolean(query.trim());
  const results = useMemo(
    () =>
      region && searchActive
        ? searchExploreRegion(query, region).map(
            ({ destination }) => destination,
          )
        : [],
    [query, region, searchActive],
  );
  const select = (destination: Destination) => {
    Keyboard.dismiss();
    router.push(destinationDetailsRoute(destination.id));
  };
  const submit = () => {
    if (!region) return;
    const exact = exactExploreResult(searchExploreRegion(query, region));
    if (exact) select(exact);
  };

  if (!region)
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Explore"
          onPress={() => router.back()}
          style={s.back}
        >
          <FlowIcon name="back" color={theme.icon} />
          <Text style={[s.backText, { color: theme.text }]}>Explore</Text>
        </Pressable>
        <Text style={[s.invalid, { color: theme.muted }]}>Region not found.</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={[s.header, { backgroundColor: theme.background }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Explore"
          onPress={() => router.back()}
          style={s.back}
        >
          <FlowIcon name="back" color={theme.icon} />
          <Text style={[s.backText, { color: theme.text }]}>Explore</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[s.title, { color: theme.text }]}>
          {region}
        </Text>
        <View style={[s.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <FlowIcon name="search" color={theme.icon} size={22} />
          <TextInput
            ref={input}
            accessibilityLabel={`Search ${region}`}
            accessibilityHint={`Search destinations or airports in ${region}`}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            returnKeyType="search"
            placeholder={`Search ${region}`}
            placeholderTextColor={theme.muted}
            style={[s.searchInput, { color: theme.text }]}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Clear ${region} search`}
              onPress={() => {
                setQuery("");
                input.current?.focus();
              }}
              style={s.clear}
            >
              <Text style={s.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[s.count, { color: theme.muted }]}>
          {formatDestinationCount(
            searchActive ? results.length : allDestinations.length,
          )}
        </Text>
      </View>
      {searchActive ? (
        <FlatList
          data={results}
          keyExtractor={(destination) => destination.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.list,
            { paddingBottom: exploreBottomPadding(20, insets.bottom) },
          ]}
          ListEmptyComponent={
            <Text style={[s.empty, { color: theme.muted }]}>No destinations found in {region}</Text>
          }
          renderItem={({ item }) => (
            <DestinationResultRow
              destination={item}
              saved={savedIds.has(item.id)}
              onSelect={() => select(item)}
              onToggle={() => toggle(item.id)}
            />
          )}
        />
      ) : (
        <FlatList
          data={allDestinations}
          keyExtractor={(destination) => destination.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.browseList,
            { paddingBottom: exploreBottomPadding(20, insets.bottom) },
          ]}
          renderItem={({ item }) => (
            <RegionBrowseDestinationCard
              destination={item}
              saved={savedIds.has(item.id)}
              onSelect={() => select(item)}
              onToggle={() => toggle(item.id)}
              layout={browseCardLayout}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 18 },
  back: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
  },
  backText: { fontSize: 14, fontWeight: "700" },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800",
    marginBottom: 12,
  },
  search: {
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 8,
  },
  searchInput: { flex: 1, minHeight: 50, fontSize: 13 },
  clear: { minHeight: 44, justifyContent: "center" },
  clearText: { color: BLUE, fontWeight: "700" },
  count: { fontSize: 13, fontWeight: "600", paddingVertical: 14 },
  list: { paddingHorizontal: REGION_BROWSE_HORIZONTAL_INSET },
  browseList: { paddingHorizontal: REGION_BROWSE_CARD_HORIZONTAL_INSET },
  browseCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#18305B",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  browseMain: { width: "100%" },
  browseImage: {
    width: "100%",
  },
  browseCopy: {
    padding: 14,
    gap: 3,
  },
  browseTitle: { flexShrink: 1 },
  browseName: { fontSize: 21, lineHeight: 27, fontWeight: "800" },
  browseCountry: { fontSize: 14, fontWeight: "600" },
  browseSummary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    marginTop: 5,
    marginBottom: 4,
    flexShrink: 1,
  },
  browseAirport: { fontSize: 12, lineHeight: 18, flexShrink: 1 },
  browseHeart: { position: "absolute", right: 10, top: 10 },
  empty: { paddingVertical: 18 },
  invalid: { padding: 18 },
});
