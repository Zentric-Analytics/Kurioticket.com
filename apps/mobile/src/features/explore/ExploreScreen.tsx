import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  ImageBackground,
  Keyboard,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { destinations, type Destination } from "./destinationCatalogue";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";
import { HERO_SLIDES, INTERESTS, POPULAR_DESTINATIONS } from "./exploreData";
import {
  exactExploreResult,
  EXPLORE_TABS,
  exploreBottomPadding,
  searchExplore,
} from "./exploreModels";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import {
  navigateFromDestination,
  type DestinationProduct,
} from "./exploreInteractionModels";
import { destinationMedia, FALLBACK_SOURCE } from "./destinationMedia";
const NAVY = "#071A48",
  BLUE = "#0754F7",
  MUTED = "#56658E",
  BORDER = "#E7ECF5";
type Tab = (typeof EXPLORE_TABS)[number];
const destinationFor = (name: string) =>
  destinations.find((destination) => destination.name === name);

function DestinationAction({
  destination,
  saved,
  onToggle,
  onClose,
}: {
  destination: Destination | null;
  saved: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const navigating = useRef(false);
  useEffect(() => {
    navigating.current = false;
  }, [destination]);
  const navigate = (product: DestinationProduct) => {
    if (!destination) return;
    navigateFromDestination(
      destination,
      product,
      onClose,
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
      navigating,
    );
  };
  return (
    <Modal
      visible={!!destination}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.modalBackdrop}>
          <TouchableWithoutFeedback
            onPress={(event) => event.stopPropagation()}
          >
            <SafeAreaView
              edges={["bottom"]}
              style={s.sheet}
              accessibilityLabel="Destination actions"
            >
              <View style={s.sheetHandle} />
              {destination ? (
                <>
                  <Text
                    accessibilityRole="header"
                    numberOfLines={2}
                    style={s.sheetTitle}
                  >
                    {destination.name}
                  </Text>
                  <Text style={s.sheetMeta}>
                    {destination.country} · {destination.primaryAirportCode}
                    {destination.airportCodes.length > 1
                      ? ` + ${destination.airportCodes.length - 1} airports`
                      : ""}
                  </Text>
                  <Action
                    icon="heart"
                    label={
                      saved
                        ? "Remove from saved destinations"
                        : "Save destination"
                    }
                    onPress={onToggle}
                  />
                  <Action
                    icon="flight"
                    label="Search flights"
                    onPress={() => navigate("flights")}
                  />
                  <Action
                    icon="hotel"
                    label="Search hotels"
                    onPress={() => navigate("hotels")}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close destination actions"
                    onPress={onClose}
                    style={s.close}
                  >
                    <Text style={s.closeText}>Close</Text>
                  </Pressable>
                </>
              ) : null}
            </SafeAreaView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
function Action({
  icon,
  label,
  onPress,
}: {
  icon: FlowIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.action}
    >
      <FlowIcon name={icon} color={BLUE} />
      <Text style={s.actionText}>{label}</Text>
      <FlowIcon name="chevron" size={18} />
    </Pressable>
  );
}
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
        accessibilityLabel={`Open actions for ${destination.name}, ${destination.country}, ${destination.primaryAirportCode}`}
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
  tab,
  setTab,
  submit,
}: {
  query: string;
  setQuery: (value: string) => void;
  input: React.RefObject<TextInput | null>;
  tab: Tab;
  setTab: (tab: Tab) => void;
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
          accessibilityHint="Search destinations, countries or interests"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="Search destinations, countries or interests"
          placeholderTextColor="#7B849F"
          style={s.searchInput}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear Explore search"
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
      <View accessibilityRole="tablist" style={s.tabs}>
        {EXPLORE_TABS.map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={[s.tab, tab === t && s.tabActive]}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

export function ExploreScreen() {
  const [tab, setTab] = useState<Tab>("Destinations"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<Destination | null>(null);
  const { savedIds, toggle } = useSavedDestinations();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const input = useRef<TextInput>(null);
  const results = useMemo(() => searchExplore(query), [query]);
  const saved = destinations.filter((a) => savedIds.has(a.id));
  const select = (destination: Destination) => {
    Keyboard.dismiss();
    input.current?.blur();
    setSelected(destination);
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
  const header = (
    <ExploreHeader
      query={query}
      setQuery={setQuery}
      input={input}
      tab={tab}
      setTab={setTab}
      submit={submit}
    />
  );
  const overlays = (
    <>
      <DestinationAction
        destination={selected}
        saved={!!selected && savedIds.has(selected.id)}
        onToggle={() => selected && toggle(selected.id)}
        onClose={() => setSelected(null)}
      />
    </>
  );
  if (!query.trim() && tab === "Destinations")
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <Destinations
          header={header}
          bottomPadding={exploreBottomPadding(65, insets.bottom)}
          saved={savedIds}
          savedDestinations={saved}
          select={select}
          toggle={toggle}
        />
        {overlays}
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          s.page,
          { paddingBottom: exploreBottomPadding(65, insets.bottom) },
        ]}
      >
        {header}
        {query.trim() ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityLabel={`${results.length} Explore results`}
          >
            <Section
              title={`${results.length} result${results.length === 1 ? "" : "s"}`}
            />
            {results.length ? (
              results.map((r) => (
                <View key={r.destination.id}>
                  {r.match === "interest" ? (
                    <Text style={s.matchLabel}>
                      Interest match: {r.interest}
                    </Text>
                  ) : null}
                  <Row
                    destination={r.destination}
                    saved={savedIds.has(r.destination.id)}
                    onSelect={() => select(r.destination)}
                    onToggle={() => toggle(r.destination.id)}
                  />
                </View>
              ))
            ) : (
              <Text style={s.empty}>
                No destinations or maintained interests match “{query.trim()}”.
                Try a city, destination code, or country.
              </Text>
            )}
          </View>
        ) : (
          <Inspiration width={width} select={select} />
        )}
      </ScrollView>
      {overlays}
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
        accessibilityLabel={`Open actions for ${destination.name}, ${destination.country}`}
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved ? "Remove" : "Save"} ${destination.name}`}
        onPress={onToggle}
        style={s.heart}
      >
        <FlowIcon name="heart" color={saved ? "#E92D55" : "white"} />
      </Pressable>
      <View style={s.popularCopy}>
        <Text style={s.popularCardTitle}>{destination.name}</Text>
        <Text style={s.countryName}>{destination.country}</Text>
        <Text style={s.airportMeta}>
          {destination.primaryAirportCode} · {destination.airportNames[0]}
          {destination.airportCodes.length > 1
            ? ` + ${destination.airportCodes.length - 1} airports`
            : ""}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Search flights to ${destination.name}`}
          onPress={searchFlights}
          style={s.flightButton}
        >
          <FlowIcon name="flight" color="white" size={18} />
          <Text style={s.flightButtonText}>Search flights</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Destinations({
  header,
  bottomPadding,
  saved,
  savedDestinations,
  select,
  toggle,
}: {
  header: React.ReactElement;
  bottomPadding: number;
  saved: ReadonlySet<string>;
  savedDestinations: Destination[];
  select: (a: Destination) => void;
  toggle: (id: string) => void;
}) {
  return (
    <FlatList
      data={POPULAR_DESTINATIONS}
      keyExtractor={(item) => item.destination.id}
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
      contentContainerStyle={[s.page, { paddingBottom: bottomPadding }]}
      ListHeaderComponent={
        <View>
          {header}
          <Section title="Popular destinations" />
        </View>
      }
      ItemSeparatorComponent={() => <View style={s.popularSeparator} />}
      renderItem={({ item }) => (
        <PopularDestinationCard
          destination={item.destination}
          saved={saved.has(item.destination.id)}
          onSelect={() => select(item.destination)}
          onToggle={() => toggle(item.destination.id)}
        />
      )}
      ListFooterComponent={
        <View>
          <Section title="Saved destinations" />
          {savedDestinations.length ? (
            savedDestinations.map((a) => (
              <Row
                key={a.id}
                destination={a}
                saved
                onSelect={() => select(a)}
                onToggle={() => toggle(a.id)}
              />
            ))
          ) : (
            <View style={s.emptyState}>
              <FlowIcon name="heart" color={MUTED} />
              <View style={s.emptyCopy}>
                <Text style={s.emptyTitle}>No saved destinations yet</Text>
                <Text style={s.emptyText}>
                  Tap a heart to keep a destination close at hand.
                </Text>
              </View>
            </View>
          )}
        </View>
      }
    />
  );
}
function Inspiration({
  width,
  select,
}: {
  width: number;
  select: (a: Destination) => void;
}) {
  const [active, setActive] = useState(0);
  const cardWidth = width - 36;
  const end = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setActive(Math.round(e.nativeEvent.contentOffset.x / cardWidth));
  return (
    <>
      <View style={s.heroShell}>
        <ScrollView
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={end}
        >
          {HERO_SLIDES.map((slide) => (
            <Pressable
              key={slide.id}
              accessibilityRole="button"
              accessibilityLabel={`Open actions for ${slide.destination}, ${slide.label}`}
              onPress={() => {
                const a = destinationFor(slide.destination);
                if (a) select(a);
              }}
            >
              <ImageBackground
                source={slide.image}
                style={[s.hero, { width: cardWidth }]}
                imageStyle={s.cardRadius}
              >
                <View style={s.overlay} />
                <Text style={s.heroLabel}>{slide.label}</Text>
                <Text style={s.heroTitle}>{slide.destination}</Text>
                <View style={s.heroCta}>
                  <Text style={s.heroCtaText}>Explore {slide.destination}</Text>
                </View>
              </ImageBackground>
            </Pressable>
          ))}
        </ScrollView>
        <View style={s.dots}>
          {HERO_SLIDES.map((x, i) => (
            <View key={x.id} style={[s.dot, i === active && s.dotActive]} />
          ))}
        </View>
      </View>
      <View>
        <Section title="Explore by interest" />
        <View style={s.interests}>
          {INTERESTS.map((item) => (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, mapped to ${item.destination}`}
              onPress={() => {
                const a = destinationFor(item.destination);
                if (a) select(a);
              }}
              style={s.interest}
            >
              <FlowIcon name={item.icon} color={BLUE} />
              <View>
                <Text style={s.resultTitle}>{item.name}</Text>
                <Text style={s.resultMeta}>{item.destination}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </>
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
  page: { paddingHorizontal: 18, gap: 15 },
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
  clearText: { color: BLUE, fontWeight: "700" },
  tabs: {
    height: 48,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: BLUE },
  tabText: { color: NAVY, fontSize: 14, fontWeight: "700" },
  tabTextActive: { color: BLUE },
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
  cardRadius: { borderRadius: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,15,42,.46)",
    borderRadius: 16,
  },
  heart: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(2,15,42,.62)",
    alignItems: "center",
    justifyContent: "center",
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
  emptyState: {
    minHeight: 76,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: NAVY, fontSize: 14, fontWeight: "800" },
  emptyText: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: 2 },
  matchLabel: { color: BLUE, fontSize: 12, fontWeight: "700", marginBottom: 4 },
  action: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "white",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  actionText: { flex: 1, color: NAVY, fontSize: 14, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,15,42,.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    maxHeight: "92%",
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: { color: NAVY, fontSize: 24, lineHeight: 31, fontWeight: "800" },
  sheetMeta: { color: MUTED, fontSize: 14, marginBottom: 18 },
  close: { minHeight: 50, alignItems: "center", justifyContent: "center" },
  closeText: { color: BLUE, fontWeight: "800" },
  heroShell: { height: 290, borderRadius: 14, overflow: "hidden" },
  hero: {
    height: 290,
    justifyContent: "flex-end",
    padding: 24,
    paddingBottom: 42,
  },
  heroLabel: { color: "white", fontSize: 14, fontWeight: "700", zIndex: 1 },
  heroTitle: {
    color: "white",
    fontSize: 30,
    fontWeight: "800",
    zIndex: 1,
    marginTop: 3,
  },
  heroCta: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderRadius: 9,
    paddingHorizontal: 15,
    minHeight: 42,
    justifyContent: "center",
    marginTop: 14,
    zIndex: 1,
  },
  heroCtaText: { color: NAVY, fontWeight: "800" },
  dots: {
    position: "absolute",
    bottom: 13,
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "white",
  },
  dotActive: { backgroundColor: "white" },
  interests: { gap: 8 },
  interest: {
    minHeight: 66,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
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
  airportMeta: { color: MUTED, fontSize: 12, lineHeight: 18, minHeight: 36 },
  flightButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  flightButtonText: { color: "white", fontSize: 14, fontWeight: "800" },
});
