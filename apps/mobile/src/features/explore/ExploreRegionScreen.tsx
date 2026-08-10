import { useMemo, useRef, useState } from "react";
import { FlatList, Image, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { FlowIcon } from "../flow/FlowIcon";
import { destinationDetailsRoute } from "./exploreInteractionModels";
import { destinationMedia, FALLBACK_SOURCE } from "./destinationMedia";
import {
  destinationsForExploreRegion,
  exploreBottomPadding,
  searchExploreRegion,
} from "./exploreModels";
import { isExploreRegionName } from "../../../../../src/shared/destinations/exploreDestinationRegions";
import type { Destination } from "./destinationCatalogue";

const NAVY = "#071A48", BLUE = "#0754F7", MUTED = "#56658E", BORDER = "#E7ECF5";

function RegionRow({ destination }: { destination: Destination }) {
  const media = destinationMedia(destination.id);
  const [failed, setFailed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${destination.name}, ${destination.country}, ${destination.primaryAirportCode}`}
      onPress={() => {
        Keyboard.dismiss();
        router.push(destinationDetailsRoute(destination.id));
      }}
      style={s.row}
    >
      <Image
        alt={`${destination.name}, ${destination.country} travel landscape`}
        source={failed ? FALLBACK_SOURCE : (media?.source ?? FALLBACK_SOURCE)}
        onError={() => setFailed(true)}
        accessibilityLabel={media?.accessibilityLabel ?? `${destination.name}, ${destination.country} travel landscape`}
        style={s.image}
      />
      <View style={s.rowCopy}>
        <Text style={s.rowTitle}>{destination.name}</Text>
        <Text style={s.rowMeta}>{destination.country} · {destination.primaryAirportCode}</Text>
      </View>
      <FlowIcon name="chevron" color={MUTED} size={18} />
    </Pressable>
  );
}

export function ExploreRegionScreen() {
  const params = useLocalSearchParams<{ region?: string | string[] }>();
  const rawRegion = Array.isArray(params.region) ? params.region[0] : params.region;
  const region = rawRegion && isExploreRegionName(rawRegion) ? rawRegion : undefined;
  const [query, setQuery] = useState("");
  const input = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const results = useMemo(() => region ? searchExploreRegion(region, query) : [], [query, region]);

  if (!region) {
    return <SafeAreaView style={s.safe}><Text style={s.empty}>Region not found.</Text></SafeAreaView>;
  }
  const total = destinationsForExploreRegion(region).length;
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" onPress={() => router.back()} style={s.back}>
          <FlowIcon name="chevron" color={NAVY} size={20} />
        </Pressable>
        <Text accessibilityRole="header" style={s.title}>{region}</Text>
      </View>
      <View style={s.search}>
        <FlowIcon name="search" size={22} />
        <TextInput
          ref={input}
          accessibilityLabel={`Search ${region}`}
          accessibilityHint={`Search destinations or airports in ${region}`}
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${region}`}
          placeholderTextColor="#7B849F"
          style={s.searchInput}
        />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${region} search`} onPress={() => { setQuery(""); input.current?.focus(); }} style={s.clear}><Text style={s.clearText}>Clear</Text></Pressable> : null}
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.destination.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: exploreBottomPadding(0, insets.bottom) }]}
        ListHeaderComponent={<Text style={s.count}>{total} destinations</Text>}
        ListEmptyComponent={<Text style={s.empty}>No destinations found in {region}</Text>}
        renderItem={({ item }) => <RegionRow destination={item.destination} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFBFF" },
  header: { minHeight: 64, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center", transform: [{ rotate: "180deg" }] },
  title: { color: NAVY, fontSize: 26, lineHeight: 34, fontWeight: "800" },
  search: { minHeight: 52, marginHorizontal: 18, borderRadius: 26, borderWidth: 1, borderColor: BORDER, backgroundColor: "white", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 8 },
  searchInput: { flex: 1, minHeight: 50, color: NAVY, fontSize: 13 },
  clear: { minHeight: 44, justifyContent: "center" },
  clearText: { color: BLUE, fontWeight: "700" },
  content: { paddingHorizontal: 18 },
  count: { color: MUTED, fontSize: 13, marginVertical: 16 },
  row: { minHeight: 76, borderWidth: 1, borderColor: BORDER, borderRadius: 12, backgroundColor: "white", flexDirection: "row", alignItems: "center", gap: 12, padding: 8, paddingRight: 14, marginBottom: 8 },
  image: { width: 58, height: 58, borderRadius: 10, backgroundColor: BORDER },
  rowCopy: { flex: 1 },
  rowTitle: { color: NAVY, fontSize: 15, fontWeight: "800" },
  rowMeta: { color: MUTED, fontSize: 12, marginTop: 3 },
  empty: { color: MUTED, margin: 18, lineHeight: 20 },
});
