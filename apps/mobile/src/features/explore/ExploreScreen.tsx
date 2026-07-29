import { useRef, useState } from "react";
import {
  Alert, ImageBackground, NativeScrollEvent, NativeSyntheticEvent, Pressable,
  ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { HERO_SLIDES, INTERESTS, POPULAR_DESTINATIONS, TRENDING } from "./exploreData";

const NAVY = "#071A48";
const BLUE = "#0754F7";
const MUTED = "#56658E";
const BORDER = "#E7ECF5";

function goDestination(destination: string) {
  router.push({ pathname: "/flights", params: { destination } });
}
function missing(label: string) {
  Alert.alert(label, `${label} is not available in this version of Kurioticket.`);
}
function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{onViewAll ? <Pressable accessibilityRole="button" accessibilityLabel={`View all ${title.toLowerCase()}`} onPress={onViewAll} style={styles.viewAll}><Text style={styles.viewAllText}>View all</Text><FlowIcon name="chevron" color={BLUE} size={16} /></Pressable> : null}</View>;
}

function ExploreHeader() {
  return <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Explore</Text><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.headerButton}><FlowIcon name="bell" size={28} /></Pressable></View>;
}

function ExploreSearch() {
  const [query, setQuery] = useState("");
  const submit = () => query.trim() && goDestination(query.trim());
  return <View style={styles.search}><FlowIcon name="search" size={22} /><TextInput accessibilityLabel="Explore search" accessibilityHint="Search destinations, countries or interests" returnKeyType="search" value={query} onChangeText={setQuery} onSubmitEditing={submit} placeholder="Search destinations, countries or interests" placeholderTextColor="#7B849F" style={styles.searchInput} /></View>;
}

function ExploreTabs() {
  const [tab, setTab] = useState<"Destinations" | "Inspiration" | "Deals">("Destinations");
  const select = (next: typeof tab) => {
    setTab(next);
    if (next === "Inspiration") router.push("/flights");
    if (next === "Deals") router.push("/deals");
  };
  return <View accessibilityRole="tablist" style={styles.tabs}>{(["Destinations", "Inspiration", "Deals"] as const).map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => select(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}</View>;
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
          <Text style={styles.heroBody}>Explore top destinations and{"\n"}amazing places around the world</Text>
          <View style={styles.heroCta}><Text style={styles.heroCtaText}>Explore now</Text><FlowIcon name="chevron" size={18} /></View>
        </ImageBackground>
      </Pressable>)}
    </ScrollView>
    <View style={styles.dots}>{HERO_SLIDES.map((slide, index) => <View key={slide.id} accessibilityLabel={`Slide ${index + 1}`} style={[styles.dot, index === active && styles.dotActive]} />)}</View>
  </View>;
}

function PopularDestinations() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  return <View><SectionHeader title="Popular destinations" onViewAll={() => goDestination("Anywhere")} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationRow}>{POPULAR_DESTINATIONS.map((item) => {
    const saved = favorites.has(item.name);
    return <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={`Explore ${item.name}, from ${item.price}`} onPress={() => goDestination(item.name)}>
      <ImageBackground source={item.image} style={styles.destinationCard} imageStyle={styles.imageRadius}>
        <View style={styles.cardOverlay} />
        <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? "Remove" : "Add"} ${item.name} ${saved ? "from" : "to"} favorites`} accessibilityState={{ selected: saved }} hitSlop={8} onPress={(event) => { event.stopPropagation(); setFavorites((current) => { const next = new Set(current); saved ? next.delete(item.name) : next.add(item.name); return next; }); }} style={styles.heart}><FlowIcon name="heart" color="white" size={23} /></Pressable>
        <View style={styles.destinationCopy}><Text style={styles.destinationName}>{item.name}</Text><Text style={styles.destinationPrice}>from {item.price}</Text></View>
      </ImageBackground>
    </Pressable>;
  })}</ScrollView></View>;
}

function TrendingSearches() {
  return <View><SectionHeader title="Trending searches" /><View style={styles.chipGrid}>{TRENDING.map(([name, icon]) => <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Search ${name}`} onPress={() => goDestination(name)} style={styles.chip}><FlowIcon name={icon} color={BLUE} size={20} /><Text style={styles.chipText}>{name}</Text></Pressable>)}</View></View>;
}

function DealBanner() {
  return <View><SectionHeader title="Deals for you" onViewAll={() => router.push("/deals")} /><Pressable accessibilityRole="button" accessibilityLabel="See Miami round trip deals" onPress={() => router.push("/deals")}>
    <ImageBackground source={require("../../../assets/destinations/new-york.jpg")} style={styles.deal} imageStyle={styles.imageRadius}><View style={styles.dealOverlay} /><View style={styles.dealCopy}><Text style={styles.dealCity}>Miami</Text><Text style={styles.dealMeta}>Round trip</Text><Text style={styles.dealFrom}>from <Text style={styles.dealPrice}>$210</Text></Text></View><View style={styles.dealCta}><Text style={styles.dealCtaText}>See deals</Text><FlowIcon name="chevron" color="white" size={18} /></View></ImageBackground>
  </Pressable></View>;
}

function InterestDestinations() {
  return <View><SectionHeader title="Top destinations by interest" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestRow}>{INTERESTS.map((item) => <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={`Explore ${item.name}`} onPress={() => goDestination(item.name)}>
    <ImageBackground source={item.image} style={styles.interest} imageStyle={styles.interestImage}><View style={styles.cardOverlay} /><FlowIcon name={item.icon} color="white" size={24} /><Text style={styles.interestText}>{item.name}</Text></ImageBackground>
  </Pressable>)}</ScrollView></View>;
}

const MORE: { title: string; description: string; icon: FlowIconName; action: () => void }[] = [
  { title: "Countries", description: "Explore all countries", icon: "globe", action: () => missing("Countries") },
  { title: "Regions", description: "Discover by region", icon: "map", action: () => missing("Regions") },
  { title: "Flights", description: "Search flights to anywhere", icon: "flight", action: () => router.push("/flights") },
  { title: "Hotels", description: "Find the perfect stay", icon: "hotel", action: () => router.push("/hotels") },
];
function ExploreMoreGrid() {
  return <View><SectionHeader title="Explore more" /><View style={styles.moreGrid}>{MORE.map((item) => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.description}`} onPress={item.action} style={styles.moreCard}><View style={styles.moreIcon}><FlowIcon name={item.icon} size={23} /></View><View style={styles.moreCopy}><Text style={styles.moreTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.moreDescription}>{item.description}</Text></View><FlowIcon name="chevron" size={17} /></Pressable>)}</View></View>;
}

export function ExploreScreen() {
  return <SafeAreaView style={styles.safe} edges={["top"]}><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
    <ExploreHeader /><ExploreSearch /><ExploreTabs /><ExploreHeroCarousel /><PopularDestinations /><TrendingSearches /><DealBanner /><InterestDestinations /><ExploreMoreGrid />
  </ScrollView></SafeAreaView>;
}

const shadow = { shadowColor: "#18305B", shadowOpacity: .06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 };
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFBFF" }, page: { paddingHorizontal: 18, paddingBottom: 26, gap: 15 },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center" }, title: { flex: 1, color: NAVY, fontSize: 30, lineHeight: 38, fontWeight: "800" }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  search: { height: 52, borderRadius: 26, borderWidth: 1, borderColor: BORDER, backgroundColor: "white", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 10, ...shadow }, searchInput: { flex: 1, height: 50, color: NAVY, fontSize: 13 },
  tabs: { height: 48, flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER }, tab: { flex: 1, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" }, tabActive: { borderBottomColor: BLUE }, tabText: { color: NAVY, fontSize: 14, fontWeight: "700" }, tabTextActive: { color: BLUE },
  heroShell: { height: 290, borderRadius: 14, overflow: "hidden" }, hero: { height: 290, justifyContent: "center", paddingHorizontal: 28 }, heroImage: { borderRadius: 14 }, heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(1,21,49,.35)", borderRadius: 14 }, heroTitle: { color: "white", fontSize: 27, lineHeight: 31, fontWeight: "800" }, heroBody: { color: "white", fontSize: 13, lineHeight: 18, marginTop: 9 }, heroCta: { marginTop: 17, width: 126, height: 42, borderRadius: 8, backgroundColor: "white", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, heroCtaText: { color: NAVY, fontSize: 13, fontWeight: "700" }, dots: { position: "absolute", bottom: 12, alignSelf: "center", flexDirection: "row", gap: 9 }, dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: "white" }, dotActive: { backgroundColor: "white" },
  sectionHeader: { minHeight: 27, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { color: NAVY, fontSize: 17, lineHeight: 23, fontWeight: "800" }, viewAll: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 2 }, viewAllText: { color: BLUE, fontSize: 13, fontWeight: "700" },
  destinationRow: { gap: 9, paddingRight: 12 }, destinationCard: { width: 144, height: 178, padding: 11, justifyContent: "flex-end" }, imageRadius: { borderRadius: 12 }, cardOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 12, backgroundColor: "rgba(2,15,42,.24)" }, heart: { position: "absolute", right: 7, top: 7, width: 36, height: 36, alignItems: "center", justifyContent: "center" }, destinationCopy: { zIndex: 1 }, destinationName: { color: "white", fontSize: 16, fontWeight: "800" }, destinationPrice: { color: "white", fontSize: 12, fontWeight: "600" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }, chip: { width: "31.7%", minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: BORDER, backgroundColor: "white", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, ...shadow }, chipText: { color: NAVY, fontSize: 12, fontWeight: "700" },
  deal: { height: 137, borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, dealOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 12, backgroundColor: "rgba(10,14,50,.28)" }, dealCopy: { zIndex: 1 }, dealCity: { color: "white", fontSize: 26, fontWeight: "800" }, dealMeta: { color: "white", fontSize: 13, marginTop: 2 }, dealFrom: { color: "white", fontSize: 13, marginTop: 9 }, dealPrice: { fontSize: 25, fontWeight: "800" }, dealCta: { zIndex: 1, height: 48, borderRadius: 10, paddingHorizontal: 17, backgroundColor: NAVY, flexDirection: "row", alignItems: "center", gap: 8 }, dealCtaText: { color: "white", fontSize: 13, fontWeight: "700" },
  interestRow: { gap: 9 }, interest: { width: 97, height: 108, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 8 }, interestImage: { borderRadius: 10 }, interestText: { color: "white", fontSize: 12, fontWeight: "700", zIndex: 1 },
  moreGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }, moreCard: { width: "49%", minHeight: 68, borderRadius: 11, borderWidth: 1, borderColor: BORDER, backgroundColor: "white", paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8, ...shadow }, moreIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F1F4FB", alignItems: "center", justifyContent: "center" }, moreCopy: { flex: 1, minWidth: 0 }, moreTitle: { color: NAVY, fontSize: 13, fontWeight: "700" }, moreDescription: { color: MUTED, fontSize: 9, marginTop: 2 },
});
