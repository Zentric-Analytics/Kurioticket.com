import { useEffect, useState } from "react";
import {
  ImageBackground, NativeScrollEvent, NativeSyntheticEvent, Pressable,
  ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { FEATURED_DESTINATIONS, HERO_SLIDES, INTERESTS, QUICK_DESTINATIONS } from "./exploreData";
import { readSavedDestinationIds, writeSavedDestinationIds } from "../../storage/savedDestinationsStorage";

const NAVY = "#071A48";
const BLUE = "#0754F7";
const MUTED = "#56658E";
const BORDER = "#E7ECF5";

function goDestination(destination: string) {
  router.push({ pathname: "/flights", params: { destination } });
}
function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{onViewAll ? <Pressable accessibilityRole="button" accessibilityLabel={`View all ${title.toLowerCase()}`} onPress={onViewAll} style={styles.viewAll}><Text style={styles.viewAllText}>View all</Text><FlowIcon name="chevron" color={BLUE} size={16} /></Pressable> : null}</View>;
}

function ExploreHeader() {
  return <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Explore</Text><Pressable accessibilityRole="button" accessibilityLabel="Price alerts" onPress={() => router.push("/price-alerts")} style={styles.headerButton}><FlowIcon name="bell" size={28} /></Pressable></View>;
}

function ExploreSearch() {
  const [query, setQuery] = useState("");
  const submit = () => query.trim() && goDestination(query.trim());
  return <View style={styles.search}><FlowIcon name="search" size={22} /><TextInput accessibilityLabel="Explore search" accessibilityHint="Search destinations, countries or interests" returnKeyType="search" value={query} onChangeText={setQuery} onSubmitEditing={submit} placeholder="Search destinations, countries or interests" placeholderTextColor="#7B849F" style={styles.searchInput} /></View>;
}

type ExploreTab = "Destinations" | "Inspiration" | "Deals";
function ExploreTabs({ tab, onChange }: { tab: ExploreTab; onChange: (tab: ExploreTab) => void }) {
  return <View accessibilityRole="tablist" style={styles.tabs}>{(["Destinations", "Inspiration", "Deals"] as const).map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => onChange(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}</View>;
}

function ExploreHeroCarousel() {
  const { width } = useWindowDimensions();
  const cardWidth = width - 36;
  const [active, setActive] = useState(0);
  const end = (event: NativeSyntheticEvent<NativeScrollEvent>) => setActive(Math.round(event.nativeEvent.contentOffset.x / cardWidth));
  return <View accessibilityLabel={`Explore carousel, slide ${active + 1} of ${HERO_SLIDES.length}`} style={styles.heroShell}>
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={end} decelerationRate="fast">
      {HERO_SLIDES.map((slide) => <Pressable key={slide.id} accessibilityRole="button" accessibilityLabel={`${slide.label}, explore now`} onPress={() => goDestination(slide.destination)}>
        <ImageBackground source={slide.image} resizeMode="cover" style={[styles.hero, { width: cardWidth }]} imageStyle={styles.heroImage}>
          <View style={styles.heroOverlay} />
          <Text style={styles.heroTitle}>Find your{"\n"}next adventure</Text>
          <Text style={styles.heroBody}>Explore destinations and{"\n"}places around the world</Text>
          <View style={styles.heroCta}><Text style={styles.heroCtaText}>Explore now</Text><FlowIcon name="chevron" size={18} /></View>
        </ImageBackground>
      </Pressable>)}
    </ScrollView>
    <View style={styles.dots}>{HERO_SLIDES.map((slide, index) => <View key={slide.id} accessibilityLabel={`Slide ${index + 1}`} style={[styles.dot, index === active && styles.dotActive]} />)}</View>
  </View>;
}

function FeaturedDestinations({ favorites, onToggleFavorite }: { favorites: ReadonlySet<string>; onToggleFavorite: (id: string) => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(230, Math.max(210, width * .62));
  return <View><SectionHeader title="Featured destinations" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationRow}>{FEATURED_DESTINATIONS.map(({ airport, image }) => {
    const saved = favorites.has(airport.city);
    const copy = <><View style={styles.destinationLowerOverlay} /><View style={styles.destinationCopy}><Text style={styles.destinationName}>{airport.city}</Text><Text style={styles.destinationRegion}>{airport.country}</Text></View></>;
    return <View key={airport.code} style={[styles.destinationCard, { width: cardWidth }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Explore ${airport.city}, ${airport.country}`} onPress={() => goDestination(airport.city)} style={styles.destinationCardAction}>
        {image ? <ImageBackground source={image} resizeMode="cover" style={styles.destinationCardImage} imageStyle={styles.destinationImage}>{copy}</ImageBackground> : <View style={[styles.destinationCardImage, styles.destinationCardNeutral]}>{copy}</View>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? "Remove" : "Add"} ${airport.city} ${saved ? "from" : "to"} favorites`} accessibilityState={{ selected: saved }} hitSlop={4} onPress={() => onToggleFavorite(airport.city)} style={[styles.heart, saved ? styles.heartSaved : styles.heartUnsaved]}><FlowIcon name="heart" color={saved ? "#E92D55" : "white"} size={24} /></Pressable>
    </View>;
  })}</ScrollView></View>;
}

function TrendingSearches() {
  return <View><SectionHeader title="Quick destinations" /><View style={styles.chipGrid}>{QUICK_DESTINATIONS.map(([name, icon]) => <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Search flights to ${name}`} android_ripple={{ color: "#E5ECFF" }} onPress={() => goDestination(name)} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}><FlowIcon name={icon} color={BLUE} size={19} /><Text numberOfLines={1} style={styles.chipText}>{name}</Text></Pressable>)}</View></View>;
}

function DealBanner() {
  return <View><SectionHeader title="Compare travel options" /><Pressable accessibilityRole="button" accessibilityLabel="Compare flights, hotels and rental cars" onPress={() => router.push("/deals")}>
    <View style={[styles.deal, styles.dealNeutral]}><View style={styles.dealCopy}><Text style={styles.dealCity}>Plan your next trip</Text><Text style={styles.dealMeta}>Compare flights, hotels and rental cars</Text></View><View style={styles.dealCta}><Text style={styles.dealCtaText}>Compare</Text><FlowIcon name="chevron" color="white" size={18} /></View></View>
  </Pressable></View>;
}

function InterestDestinations() {
  return <View><SectionHeader title="Explore by interest" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestRow}>{INTERESTS.map((item) => <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={`Explore ${item.name} in ${item.destination}`} onPress={() => goDestination(item.destination)}>
    <ImageBackground source={item.image} style={styles.interest} imageStyle={styles.interestImage}><View style={styles.cardOverlay} /><FlowIcon name={item.icon} color="white" size={24} /><Text style={styles.interestText}>{item.name}</Text></ImageBackground>
  </Pressable>)}</ScrollView></View>;
}

const MORE: { title: string; description: string; icon: FlowIconName; action?: () => void }[] = [
  { title: "Countries", description: "Coming soon", icon: "globe" },
  { title: "Regions", description: "Coming soon", icon: "map" },
  { title: "Flights", description: "Search flights to anywhere", icon: "flight", action: () => router.push("/flights") },
  { title: "Hotels", description: "Find the perfect stay", icon: "hotel", action: () => router.push("/hotels") },
];
function ExploreMoreGrid() {
  return <View><SectionHeader title="Explore more" /><View style={styles.moreGrid}>{MORE.map((item) => {
    const disabled = !item.action;
    const content = <><View style={[styles.moreIcon, disabled && styles.moreIconDisabled]}><FlowIcon name={item.icon} color={disabled ? MUTED : NAVY} size={22} /></View><View style={styles.moreCopy}><Text style={[styles.moreTitle, disabled && styles.moreTitleDisabled]}>{item.title}</Text><Text style={[styles.moreDescription, disabled && styles.moreDescriptionDisabled]}>{item.description}</Text></View>{item.action ? <FlowIcon name="chevron" color={NAVY} size={16} /> : null}</>;
    return item.action ? <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.description}`} android_ripple={{ color: "#E8EEFC" }} onPress={item.action} style={({ pressed }) => [styles.moreCard, pressed && styles.moreCardPressed]}>{content}</Pressable> : <View key={item.title} accessible accessibilityLabel={`${item.title}, Coming soon`} accessibilityState={{ disabled: true }} style={[styles.moreCard, styles.moreCardDisabled]}>{content}</View>;
  })}</View></View>;
}

export function ExploreScreen() {
  const [tab, setTab] = useState<ExploreTab>("Destinations");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    readSavedDestinationIds().then((ids) => { if (active) setFavorites(new Set(ids)); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      void writeSavedDestinationIds([...next]).catch(() => undefined);
      return next;
    });
  };

  return <SafeAreaView style={styles.safe} edges={["top"]}><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
    <ExploreHeader /><ExploreSearch /><ExploreTabs tab={tab} onChange={setTab} />
    {tab === "Destinations" ? <><FeaturedDestinations favorites={favorites} onToggleFavorite={toggleFavorite} /><TrendingSearches /><ExploreMoreGrid /></> : null}
    {tab === "Inspiration" ? <><ExploreHeroCarousel /><InterestDestinations /><TrendingSearches /></> : null}
    {tab === "Deals" ? <DealBanner /> : null}
  </ScrollView></SafeAreaView>;
}

const shadow = { shadowColor: "#18305B", shadowOpacity: .06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 };
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFBFF" }, page: { paddingHorizontal: 18, paddingBottom: 34, gap: 15 },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center" }, title: { flex: 1, color: NAVY, fontSize: 30, lineHeight: 38, fontWeight: "800" }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  search: { height: 52, borderRadius: 26, borderWidth: 1, borderColor: BORDER, backgroundColor: "white", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 10, ...shadow }, searchInput: { flex: 1, height: 50, color: NAVY, fontSize: 13 },
  tabs: { height: 48, flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER }, tab: { flex: 1, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" }, tabActive: { borderBottomColor: BLUE }, tabText: { color: NAVY, fontSize: 14, fontWeight: "700" }, tabTextActive: { color: BLUE },
  heroShell: { height: 290, borderRadius: 14, overflow: "hidden" }, hero: { height: 290, justifyContent: "center", paddingHorizontal: 28 }, heroImage: { borderRadius: 14 }, heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(1,21,49,.35)", borderRadius: 14 }, heroTitle: { color: "white", fontSize: 27, lineHeight: 31, fontWeight: "800" }, heroBody: { color: "white", fontSize: 13, lineHeight: 18, marginTop: 9 }, heroCta: { marginTop: 17, width: 126, height: 42, borderRadius: 8, backgroundColor: "white", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, heroCtaText: { color: NAVY, fontSize: 13, fontWeight: "700" }, dots: { position: "absolute", bottom: 12, alignSelf: "center", flexDirection: "row", gap: 9 }, dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: "white" }, dotActive: { backgroundColor: "white" },
  sectionHeader: { minHeight: 27, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { color: NAVY, fontSize: 17, lineHeight: 23, fontWeight: "800" }, viewAll: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 2 }, viewAllText: { color: BLUE, fontSize: 13, fontWeight: "700" },
  destinationRow: { gap: 14, paddingRight: 18 }, destinationCard: { height: 268, borderRadius: 14, overflow: "hidden" }, destinationCardAction: { flex: 1 }, destinationCardImage: { flex: 1, padding: 16, justifyContent: "flex-end" }, destinationCardNeutral: { backgroundColor: "#24436E" }, destinationImage: { borderRadius: 14 }, cardOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 12, backgroundColor: "rgba(2,15,42,.24)" }, destinationLowerOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: 132, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: "rgba(2,15,42,.48)" }, heart: { position: "absolute", right: 8, top: 8, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 }, heartUnsaved: { backgroundColor: "rgba(2,15,42,.42)", borderColor: "rgba(255,255,255,.55)" }, heartSaved: { backgroundColor: "white", borderColor: "rgba(255,255,255,.9)" }, destinationCopy: { zIndex: 1 }, destinationName: { color: "white", fontSize: 21, lineHeight: 26, fontWeight: "800" }, destinationRegion: { color: "rgba(255,255,255,.92)", fontSize: 14, lineHeight: 20, fontWeight: "600", marginTop: 1 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 10 }, chip: { minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: BORDER, backgroundColor: "white", paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, overflow: "hidden", ...shadow }, chipPressed: { backgroundColor: "#F3F6FF", borderColor: "#C9D7FA", transform: [{ scale: .98 }] }, chipText: { color: NAVY, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  deal: { height: 137, borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, dealNeutral: { backgroundColor: "#24436E" }, dealCopy: { zIndex: 1 }, dealCity: { color: "white", fontSize: 26, fontWeight: "800" }, dealMeta: { color: "white", fontSize: 13, marginTop: 2 }, dealCta: { zIndex: 1, height: 48, borderRadius: 10, paddingHorizontal: 17, backgroundColor: NAVY, flexDirection: "row", alignItems: "center", gap: 8 }, dealCtaText: { color: "white", fontSize: 13, fontWeight: "700" },
  interestRow: { gap: 9 }, interest: { width: 97, height: 108, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 8 }, interestImage: { borderRadius: 10 }, interestText: { color: "white", fontSize: 12, fontWeight: "700", zIndex: 1 },
  moreGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }, moreCard: { width: "49%", minHeight: 92, borderRadius: 11, borderWidth: 1, borderColor: BORDER, backgroundColor: "white", paddingHorizontal: 10, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 7, overflow: "hidden", ...shadow }, moreCardPressed: { backgroundColor: "#F4F7FD", borderColor: "#CCD8F0", transform: [{ scale: .985 }] }, moreCardDisabled: { backgroundColor: "#F8F9FC", borderColor: "#D9DFEA", elevation: 0, shadowOpacity: 0 }, moreIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center" }, moreIconDisabled: { backgroundColor: "#E9EDF4" }, moreCopy: { flex: 1, minWidth: 0 }, moreTitle: { color: NAVY, fontSize: 13, lineHeight: 18, fontWeight: "700" }, moreTitleDisabled: { color: "#485674" }, moreDescription: { color: MUTED, fontSize: 10, lineHeight: 14, marginTop: 3 }, moreDescriptionDisabled: { color: "#64708A", fontWeight: "600" },
});
