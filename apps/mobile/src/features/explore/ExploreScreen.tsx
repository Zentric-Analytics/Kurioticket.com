import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  Keyboard,
  Pressable,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { Destination } from "./destinationCatalogue";
import { FlowIcon } from "../flow/FlowIcon";
import { AndroidFavoriteButton } from "../home/AndroidFavoriteButton";
import { POPULAR_DESTINATIONS } from "./exploreData";
import {
  exactExploreResult,
  exploreBottomPadding,
  formatFlightAccess,
  searchExplore,
} from "./exploreModels";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { destinationDetailsRoute, navigateFromDestination } from "./exploreInteractionModels";
import { destinationMedia, FALLBACK_SOURCE } from "./destinationMedia";
const NAVY = "#071A48",
  BLUE = "#0754F7",
  MUTED = "#56658E",
  BORDER = "#E7ECF5";
function Header() {
  return (
    <View style={s.header}>
      <Text accessibilityRole="header" style={s.title}>
        Explore
      </Text>
    </View>
  );
}
function Section({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.sectionHeader}>
      <Text accessibilityRole="header" style={s.sectionTitle}>
        {title}
      </Text>
      {onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={s.link}>
          <Text style={s.linkText}>{action ?? "View all"}</Text>
          <FlowIcon name="chevron" color={BLUE} size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}
function DestinationThumbnail({ destination }: { destination: Destination }) {
  const media = destinationMedia(destination.id);
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={failed ? FALLBACK_SOURCE : (media?.source ?? FALLBACK_SOURCE)}
      accessibilityLabel={
        media?.accessibilityLabel ??
        `${destination.name}, ${destination.country} travel landscape`
      }
      resizeMode="cover"
      onError={() => setFailed(true)}
      style={s.rowImage}
    />
  );
}
function Row({
  destination,
  saved,
  onSelect,
  onToggle,
}: {
  destination: Destination;
  saved: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={s.resultRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${destination.name}, ${destination.country}, ${destination.primaryAirportCode}`}
        onPress={onSelect}
        style={s.resultMain}
      >
        <DestinationThumbnail key={destination.id} destination={destination} />
        <View style={s.resultCopy}>
          <Text style={s.resultTitle}>{destination.name}</Text>
          <Text style={s.resultMeta}>
            {destination.country} · {destination.primaryAirportCode}
            {destination.airportCodes.length > 1
              ? ` + ${destination.airportCodes.length - 1} airports`
              : ""}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved ? "Remove" : "Save"} ${destination.name}`}
        onPress={onToggle}
        style={s.rowHeart}
      >
        <FlowIcon name="heart" color={saved ? "#E92D55" : MUTED} />
      </Pressable>
    </View>
  );
}

function ExploreHeader({
  query,
  setQuery,
  input,
  submit,
}: {
  query: string;
  setQuery: (value: string) => void;
  input: React.RefObject<TextInput | null>;
  submit: () => void;
}) {
  return (
    <>
      <Header />
      <View style={s.search}>
        <FlowIcon name="search" size={22} />
        <TextInput
          ref={input}
          accessibilityLabel="Explore search"
          accessibilityHint="Search destinations, countries or airports"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="Search destinations, countries or airports"
          placeholderTextColor="#7B849F"
          style={s.searchInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear Explore search"
          accessibilityElementsHidden={!query}
          importantForAccessibility={query ? "auto" : "no-hide-descendants"}
          disabled={!query}
          onPress={() => {
            setQuery("");
            input.current?.focus();
          }}
          style={[s.clear, !query && s.clearHidden]}
        >
          <Text style={s.clearText}>Clear</Text>
        </Pressable>
      </View>
    </>
  );
}

export function ExploreScreen() {
  const [query, setQuery] = useState("");
  const { savedIds, toggle } = useSavedDestinations();
  const insets = useSafeAreaInsets();
  const input = useRef<TextInput>(null);
  const results = useMemo(() => searchExplore(query), [query]);
  const select = (destination: Destination) => {
    Keyboard.dismiss();
    input.current?.blur();
    router.push(destinationDetailsRoute(destination.id));
  };
  const submit = () => {
    const exact = exactExploreResult(results);
    if (exact) select(exact);
  };
  useEffect(() => {
    if (query.trim())
      void AccessibilityInfo.announceForAccessibility(
        `${results.length} ${results.length === 1 ? "result" : "results"}`,
      );
  }, [query, results.length]);
  const bottomPadding = exploreBottomPadding(65, insets.bottom);
  const isSearching = Boolean(query.trim());
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.stableHeader}>
        <ExploreHeader
          query={query}
          setQuery={setQuery}
          input={input}
          submit={submit}
        />
      </View>
      {isSearching ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.destination.id}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]}
          ListHeaderComponent={
            <Section
              title={`${results.length} result${results.length === 1 ? "" : "s"}`}
            />
          }
          ListEmptyComponent={
            <Text style={s.empty}>
              No destinations match “{query.trim()}”. Try a city, airport, or
              country.
            </Text>
          }
          renderItem={({ item: r }) => (
            <Row
              destination={r.destination}
              saved={savedIds.has(r.destination.id)}
              onSelect={() => select(r.destination)}
              onToggle={() => toggle(r.destination.id)}
            />
          )}
        />
      ) : (
        <ExploreDiscoveryContent
          bottomPadding={bottomPadding}
          saved={savedIds}
          select={select}
          toggle={toggle}
        />
      )}
    </SafeAreaView>
  );
}

function PopularDestinationCard({
  destination,
  saved,
  onSelect,
  onToggle,
}: {
  destination: Destination;
  saved: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const media = destinationMedia(destination.id);
  const [failed, setFailed] = useState(false);
  const searchFlights = () =>
    navigateFromDestination(
      destination,
      "flights",
      () => undefined,
      (route, name, handoff) =>
        router.push({
          pathname: `/${route}`,
          params: {
            destination: name,
            destinationId: handoff.destinationId,
            airportCodes: handoff.airportCodes.join(","),
            to: handoff.primaryAirportCode,
          },
        }),
      { current: false },
    );
  return (
    <View style={s.popularCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${destination.name}, ${destination.country}`}
        onPress={onSelect}
      >
        <Image
          source={failed ? FALLBACK_SOURCE : (media?.source ?? FALLBACK_SOURCE)}
          onError={() => setFailed(true)}
          accessibilityLabel={
            media?.accessibilityLabel ??
            `${destination.name}, ${destination.country} travel landscape`
          }
          resizeMode="cover"
          style={s.popularImage}
        />
      </Pressable>
      <AndroidFavoriteButton
        saved={saved}
        label={`${saved ? "Remove" : "Save"} ${destination.name}`}
        onPress={onToggle}
        style={s.heart}
      />
      <View style={s.popularCopy}>
        <Text style={s.popularCardTitle}>{destination.name}</Text>
        <Text style={s.countryName}>{destination.country}</Text>
        {destination.summary ? (
          <Text
            style={s.destinationSummary}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {destination.summary}
          </Text>
        ) : null}
        <Text style={s.airportMeta} numberOfLines={2} ellipsizeMode="tail">
          {formatFlightAccess(
            destination.primaryAirportCode,
            destination.airportCodes,
          )}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Search flights to ${destination.name}`}
          hitSlop={{ top: 2, bottom: 2 }}
          onPress={searchFlights}
          style={s.flightButton}
        >
          <FlowIcon name="flight" color="white" size={16} />
          <Text style={s.flightButtonText}>Search flights</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ExploreDiscoveryContent({
  bottomPadding,
  saved,
  select,
  toggle,
}: {
  bottomPadding: number;
  saved: ReadonlySet<string>;
  select: (a: Destination) => void;
  toggle: (id: string) => void;
}) {
  return (
    <FlatList
      data={POPULAR_DESTINATIONS}
      keyExtractor={(item) => item.destination.id}
      keyboardDismissMode="none"
      keyboardShouldPersistTaps="handled"
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
      contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]}
      ListHeaderComponent={<Section title="Popular destinations" />}
      ItemSeparatorComponent={() => <View style={s.popularSeparator} />}
      renderItem={({ item }) => (
        <PopularDestinationCard
          destination={item.destination}
          saved={saved.has(item.destination.id)}
          onSelect={() => select(item.destination)}
          onToggle={() => toggle(item.destination.id)}
        />
      )}
    />
  );
}
const shadow = {
  shadowColor: "#18305B",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFBFF" },
  stableHeader: { paddingHorizontal: 18, paddingBottom: 8 },
  content: { paddingHorizontal: 18 },
  header: { minHeight: 58, justifyContent: "center" },
  title: { color: NAVY, fontSize: 30, lineHeight: 38, fontWeight: "800" },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 8,
    ...shadow,
  },
  searchInput: { flex: 1, minHeight: 50, color: NAVY, fontSize: 13 },
  clear: { minHeight: 44, justifyContent: "center" },
  clearHidden: { opacity: 0 },
  clearText: { color: BLUE, fontWeight: "700" },
  sectionHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: NAVY,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
  },
  link: { minHeight: 44, flexDirection: "row", alignItems: "center" },
  linkText: { color: BLUE, fontSize: 13, fontWeight: "700" },
  popularSeparator: { height: 15 },
  heart: {
    position: "absolute",
    right: 10,
    top: 10,
  },
  resultRow: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    ...shadow,
  },
  resultMain: {
    flex: 1,
    minHeight: 76,
    paddingLeft: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: "#E7ECF5",
  },
  resultCopy: { flex: 1 },
  resultTitle: { color: NAVY, fontSize: 15, fontWeight: "800" },
  resultMeta: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: 2 },
  rowHeart: {
    width: 52,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    color: MUTED,
    lineHeight: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
  },
  popularCard: {
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    ...shadow,
  },
  popularImage: { width: "100%", height: 190, backgroundColor: "#E7ECF5" },
  popularCopy: { padding: 14, gap: 3 },
  popularCardTitle: {
    color: NAVY,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
  },
  countryName: { color: MUTED, fontSize: 14, fontWeight: "600" },
  destinationSummary: {
    color: NAVY,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    marginTop: 5,
    marginBottom: 4,
    flexShrink: 1,
  },
  airportMeta: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
  flightButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    minHeight: 40,
    minWidth: 44,
    borderRadius: 10,
    backgroundColor: BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 6,
  },
  flightButtonText: { color: "white", fontSize: 13, fontWeight: "800" },
});
