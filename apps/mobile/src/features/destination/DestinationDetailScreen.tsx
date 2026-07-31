import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View, ImageBackground } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { FlowIcon } from "../flow/FlowIcon";
import { ILLUSTRATIVE_FARE_DISCLAIMER } from "./destinationData";
import { flightsHref, priceAlertsHref } from "./destinationNavigation";
import type { DestinationDetail } from "./destinationModel";
import { useSavedDestination } from "../../storage/useSavedDestination";

const NAVY = "#071A48";
const CTA = "#061B5B";
const IVORY = "#FBF8F2";
const INK = "#111A33";
const MUTED = "#667085";
const WARM = "#C38A45";
const BORDER = "#E8E3DC";

function RoundControl({ label, onPress, icon, selected }: { label: string; onPress: () => void; icon: "back" | "heart" | "share"; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={selected === undefined ? undefined : { selected }} onPress={onPress} style={({ pressed }) => [styles.roundControl, pressed && styles.pressed]}>
    <FlowIcon name={icon} color={selected ? "#FFD8DF" : "white"} size={25} />
  </Pressable>;
}

function SummaryField({ label, value, icon, onPress, last }: { label: string; value: string; icon: "flight" | "calendar" | "person"; onPress: () => void; last?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Edit in flight search`} onPress={onPress} style={[styles.summaryField, !last && styles.summaryDivider]}>
    <FlowIcon name={icon} size={20} /><View style={styles.summaryCopy}><Text style={styles.summaryLabel}>{label}</Text><Text numberOfLines={2} style={styles.summaryValue}>{value}</Text></View>
  </Pressable>;
}

function PrimaryButton({ destination, compact = false, onPress }: { destination: DestinationDetail; compact?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Search flights to ${destination.name}`} onPress={onPress} style={({ pressed }) => [styles.primary, compact && styles.primaryCompact, pressed && styles.primaryPressed]}>
    <FlowIcon name="flight" color="white" size={22} /><Text style={styles.primaryText}>{compact ? "Search flights" : `Search flights to ${destination.name}`}</Text>
  </Pressable>;
}

export function DestinationNotFound() {
  return <SafeAreaView style={styles.notFound}><Text accessibilityRole="header" style={styles.notFoundTitle}>Destination not found</Text><Text style={styles.notFoundBody}>This destination guide is not available yet.</Text><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.notFoundButton}><FlowIcon name="back" color="white" /><Text style={styles.primaryText}>Back</Text></Pressable></SafeAreaView>;
}

export function DestinationDetailScreen({ destination }: { destination: DestinationDetail }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { saved, toggle } = useSavedDestination(destination.name);
  const heroHeight = Math.max(430, Math.min(480, width * 1.22));
  const contentWidth = width - 40;
  const goFlights = () => router.push(flightsHref(destination));
  const share = () => void Share.share({ message: `Discover ${destination.name}, ${destination.country} with Kurioticket.` });

  return <View style={styles.screen}>
    <StatusBar style="light" translucent backgroundColor="transparent" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 128 + insets.bottom }}>
      <ImageBackground source={destination.image} resizeMode="cover" style={[styles.hero, { height: heroHeight }]}>
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%"><Defs><LinearGradient id="heroScrim" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#071A48" stopOpacity="0.08" /><Stop offset="0.52" stopColor="#071A48" stopOpacity="0.04" /><Stop offset="1" stopColor="#020A20" stopOpacity="0.78" /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#heroScrim)" /></Svg>
        <View style={[styles.heroControls, { top: insets.top + 12 }]}><RoundControl label="Go back" icon="back" onPress={() => router.back()} /><View style={styles.heroRight}><RoundControl label={`${saved ? "Remove" : "Save"} ${destination.name} ${saved ? "from" : "to"} favorites`} icon="heart" selected={saved} onPress={toggle} /><RoundControl label={`Share ${destination.name}`} icon="share" onPress={share} /></View></View>
        <View style={styles.heroCopy}><Text accessibilityRole="header" adjustsFontSizeToFit numberOfLines={1} style={[styles.destinationTitle, width <= 340 && styles.destinationTitleNarrow]}>{destination.name.toUpperCase()}</Text><View style={styles.country}><FlowIcon name="location" color="white" size={18} /><Text style={styles.countryText}>{destination.country}</Text></View><Text style={styles.description}>{destination.description}</Text><Text style={styles.fareLabel}>Sample fare from <Text style={styles.heroFare}>{destination.sampleFare}</Text></Text><Text style={styles.heroDisclaimer}>Illustrative sample</Text></View>
      </ImageBackground>

      <View style={[styles.planner, { width: contentWidth }]}>
        <View style={styles.summaryRow}><SummaryField label="From" value="Lagos (LOS)" icon="flight" onPress={goFlights} /><SummaryField label="Dates" value="Any dates" icon="calendar" onPress={goFlights} /><SummaryField label="Travellers" value="1 Adult" icon="person" onPress={goFlights} last /></View>
        <PrimaryButton destination={destination} onPress={goFlights} />
        <View style={styles.secondaryRow}><Pressable accessibilityRole="button" accessibilityLabel={`${saved ? "Remove" : "Save"} this trip to ${destination.name}`} accessibilityState={{ selected: saved }} onPress={toggle} style={({ pressed }) => [styles.secondaryAction, pressed && styles.lightPressed]}><FlowIcon name="heart" size={21} /><Text style={styles.secondaryText}>{saved ? "Trip saved" : "Save this trip"}</Text></Pressable><View style={styles.actionDivider} /><Pressable accessibilityRole="button" accessibilityLabel={`Track prices to ${destination.name}`} accessibilityHint="Opens Price Alerts" onPress={() => router.push(priceAlertsHref(destination))} style={({ pressed }) => [styles.secondaryAction, pressed && styles.lightPressed]}><FlowIcon name="bell" size={21} /><Text style={styles.secondaryText}>Track prices</Text></Pressable></View>
      </View>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>DISCOVER {destination.name.toUpperCase()}</Text><Text accessibilityRole="header" style={styles.sectionTitle}>Why visit?</Text><Text style={styles.body}>{destination.whyVisit}</Text>
        <ImageBackground accessible accessibilityLabel={`${destination.name} destination view`} source={destination.image} resizeMode="cover" style={styles.supportImage} imageStyle={styles.supportImageRadius} />
        <View style={styles.tags}>{destination.tags.map((tag, index) => <View key={tag} style={[styles.tag, index % 2 === 1 && styles.tagWarm]}><Text style={styles.tagText}>{tag}</Text></View>)}</View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>Top experiences</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} accessibilityLabel={`${destination.name} top experiences`}>
        {destination.experiences.map((experience, index) => <View key={experience.title} accessible accessibilityLabel={`${experience.title}, ${experience.subtitle}`} style={[styles.experience, { width: width * .72 }]}><ImageBackground source={destination.image} resizeMode="cover" style={styles.experienceImage} imageStyle={styles.experienceRadius}><View style={styles.experienceScrim} /><View style={styles.experienceCopy}><Text style={styles.experienceTitle}>{experience.title}</Text><Text style={styles.experienceSubtitle}>{experience.subtitle}</Text></View></ImageBackground></View>)}
      </ScrollView>

      <View style={styles.content}><Text accessibilityRole="header" style={styles.sectionTitle}>Best time to visit</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} accessibilityLabel={`${destination.name} seasons`}>
        {destination.seasons.map((season) => <View key={season.range} accessible accessibilityLabel={`${season.range}, ${season.description}${season.recommended ? ", best time" : ""}`} style={[styles.season, season.recommended && styles.seasonRecommended]}><Text style={styles.seasonIcon}>☀</Text><Text style={styles.seasonRange}>{season.range}</Text><Text style={styles.seasonDescription}>{season.description}</Text>{season.recommended ? <Text style={styles.bestBadge}>Best time</Text> : null}</View>)}
      </ScrollView>
      <View style={styles.content}><Text style={styles.disclaimer}>{ILLUSTRATIVE_FARE_DISCLAIMER}</Text><Text accessibilityRole="header" style={styles.sectionTitle}>Travelling from Nigeria 🇳🇬</Text><View style={styles.nigeriaInfo}><View style={styles.infoRow}><FlowIcon name="currency" size={21} color={WARM} /><Text style={styles.infoText}><Text style={styles.infoStrong}>Currency: </Text>{destination.currency}</Text></View><View style={styles.infoRow}><FlowIcon name="flight" size={21} color={WARM} /><Text style={styles.infoText}><Text style={styles.infoStrong}>Main airports: </Text>{destination.airports.join(", ")}</Text></View>{destination.nigeriaNotes.map((note) => <View key={note} style={styles.infoRow}><FlowIcon name="check" size={21} color={WARM} /><Text style={styles.infoText}>{note}</Text></View>)}</View></View>
    </ScrollView>

    <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, 10) }]}><View style={styles.stickyFare}><Text style={styles.stickyLabel}>Sample from</Text><Text style={styles.stickyPrice}>{destination.sampleFare}</Text><Text style={styles.stickyIllustrative}>Illustrative</Text></View><PrimaryButton destination={destination} compact onPress={goFlights} /></View>
  </View>;
}

const serif = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: IVORY }, hero: { width: "100%", justifyContent: "flex-end" }, heroControls: { position: "absolute", left: 20, right: 20, flexDirection: "row", justifyContent: "space-between" }, heroRight: { flexDirection: "row", gap: 10 }, roundControl: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(3,12,35,.55)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.28)" }, pressed: { opacity: .72, transform: [{ scale: .96 }] }, heroCopy: { paddingHorizontal: 24, paddingBottom: 76 }, destinationTitle: { color: "white", fontFamily: serif, fontSize: 54, lineHeight: 60, letterSpacing: 1.3 }, destinationTitleNarrow: { fontSize: 44, lineHeight: 50 }, country: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 }, countryText: { color: "white", fontSize: 17, fontWeight: "600" }, description: { color: "white", fontSize: 16, lineHeight: 24, maxWidth: 330, marginTop: 14 }, fareLabel: { color: "rgba(255,255,255,.92)", fontSize: 13, marginTop: 13 }, heroFare: { color: "white", fontSize: 22, fontWeight: "800" }, heroDisclaimer: { color: "rgba(255,255,255,.8)", fontSize: 11, marginTop: 3 },
  planner: { alignSelf: "center", backgroundColor: "white", borderRadius: 24, padding: 16, marginTop: -48, shadowColor: "#071A48", shadowOpacity: .12, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 7 }, summaryRow: { flexDirection: "row", marginBottom: 15 }, summaryField: { flex: 1, minWidth: 0, minHeight: 58, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 5 }, summaryDivider: { borderRightWidth: 1, borderRightColor: BORDER }, summaryCopy: { flex: 1, minWidth: 0 }, summaryLabel: { color: MUTED, fontSize: 11 }, summaryValue: { color: INK, fontSize: 13, lineHeight: 17, fontWeight: "700", marginTop: 3 }, primary: { minHeight: 58, borderRadius: 13, backgroundColor: CTA, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 14, gap: 9 }, primaryCompact: { minHeight: 56, flex: 1, maxWidth: 220 }, primaryPressed: { backgroundColor: "#0C2C78", transform: [{ scale: .99 }] }, primaryText: { color: "white", fontSize: 15, fontWeight: "800", textAlign: "center" }, secondaryRow: { flexDirection: "row", alignItems: "center", marginTop: 10 }, secondaryAction: { minHeight: 48, flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }, secondaryText: { color: NAVY, fontSize: 12, fontWeight: "700" }, actionDivider: { width: 1, height: 24, backgroundColor: BORDER }, lightPressed: { backgroundColor: "#F7F3EC", borderRadius: 10 },
  content: { paddingHorizontal: 20, paddingTop: 34 }, eyebrow: { color: WARM, fontSize: 12, fontWeight: "800", letterSpacing: 1.1 }, sectionTitle: { color: INK, fontFamily: serif, fontSize: 30, lineHeight: 38, marginTop: 5, marginBottom: 12 }, body: { color: MUTED, fontSize: 15, lineHeight: 24 }, supportImage: { height: 210, marginTop: 20 }, supportImageRadius: { borderRadius: 18 }, tags: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 16, marginBottom: 16 }, tag: { borderRadius: 20, backgroundColor: "#EEF2F9", paddingHorizontal: 15, paddingVertical: 9 }, tagWarm: { backgroundColor: "#F7EDE0" }, tagText: { color: NAVY, fontSize: 13, fontWeight: "700" }, carousel: { paddingHorizontal: 20, paddingBottom: 4, gap: 13 }, experience: { height: 235 }, experienceImage: { flex: 1, justifyContent: "flex-end" }, experienceRadius: { borderRadius: 18 }, experienceScrim: { ...StyleSheet.absoluteFillObject, borderRadius: 18, backgroundColor: "rgba(2,10,30,.30)" }, experienceCopy: { padding: 18, backgroundColor: "rgba(2,10,30,.42)", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }, experienceTitle: { color: "white", fontSize: 20, fontWeight: "800" }, experienceSubtitle: { color: "rgba(255,255,255,.9)", fontSize: 14, marginTop: 4 }, season: { width: 166, minHeight: 155, backgroundColor: "#FFFDFC", borderWidth: 1, borderColor: BORDER, borderRadius: 17, padding: 16 }, seasonRecommended: { borderColor: WARM, borderWidth: 1.5 }, seasonIcon: { color: WARM, fontSize: 23 }, seasonRange: { color: INK, fontSize: 16, fontWeight: "800", marginTop: 8 }, seasonDescription: { color: MUTED, fontSize: 12, lineHeight: 17, marginTop: 7 }, bestBadge: { alignSelf: "flex-start", color: "white", backgroundColor: WARM, borderRadius: 11, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 3, fontSize: 10, fontWeight: "800", marginTop: 10 }, disclaimer: { color: MUTED, fontSize: 12, lineHeight: 18, marginBottom: 25 }, nigeriaInfo: { gap: 17, paddingBottom: 10 }, infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 }, infoText: { flex: 1, color: MUTED, fontSize: 14, lineHeight: 21 }, infoStrong: { color: INK, fontWeight: "800" },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 88, backgroundColor: "white", borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 18, paddingTop: 10, flexDirection: "row", alignItems: "center", gap: 13, shadowColor: NAVY, shadowOpacity: .08, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 10 }, stickyFare: { minWidth: 102 }, stickyLabel: { color: MUTED, fontSize: 11 }, stickyPrice: { color: NAVY, fontSize: 18, fontWeight: "800", marginTop: 2 }, stickyIllustrative: { color: MUTED, fontSize: 10, marginTop: 1 }, notFound: { flex: 1, backgroundColor: IVORY, justifyContent: "center", alignItems: "center", padding: 30 }, notFoundTitle: { color: INK, fontFamily: serif, fontSize: 34 }, notFoundBody: { color: MUTED, fontSize: 15, marginTop: 10, marginBottom: 24 }, notFoundButton: { minWidth: 150, minHeight: 52, borderRadius: 13, backgroundColor: CTA, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
