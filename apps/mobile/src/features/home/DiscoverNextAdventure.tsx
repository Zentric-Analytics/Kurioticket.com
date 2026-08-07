import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors, flowStyles, useFlowTheme } from "../flow/flowStyles";
import { AndroidFavoriteButton } from "./AndroidFavoriteButton";
import { discoverAdventureNavigation } from "./homepageCardNavigation";

type AdventureCard = {
  id: string;
  title: string;
  originCode: string;
  destinationCode: string;
  image: { uri: string };
  imageAlt: string;
};

// Mirrored from the mobile `DiscoverySuggestionCard` in src/app/page.tsx.
export const WEBSITE_DISCOVERY_CARD = {
  height: 300,
  imageHeight: 135,
  radius: 16,
  gap: 12,
  sideInset: 16,
} as const;

// Keep this order aligned with the website's current Nigeria discovery board.
export const nextAdventureCards: readonly AdventureCard[] = [
  {
    id: "ng-los-lhr",
    title: "London business and weekend mix",
    originCode: "LOS",
    destinationCode: "LHR",
    image: { uri: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Tower Bridge and London skyline",
  },
  {
    id: "ng-los-dxb",
    title: "Dubai shopping stopover",
    originCode: "LOS",
    destinationCode: "DXB",
    image: { uri: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Downtown Dubai skyline with Burj Khalifa",
  },
  {
    id: "ng-abv-acc",
    title: "Accra quick regional trip",
    originCode: "ABV",
    destinationCode: "ACC",
    image: { uri: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "City traffic and skyline in Accra",
  },
  {
    id: "ng-los-nbo",
    title: "Nairobi safari gateway",
    originCode: "LOS",
    destinationCode: "NBO",
    image: { uri: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Nairobi skyline with distant national park plains",
  },
  {
    id: "ng-abv-jnb",
    title: "Johannesburg city break",
    originCode: "ABV",
    destinationCode: "JNB",
    image: { uri: "https://images.unsplash.com/photo-1604633193983-5ad0f0f9d4f8?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Johannesburg skyline at golden hour",
  },
  {
    id: "ng-los-ist",
    title: "Istanbul connector route",
    originCode: "LOS",
    destinationCode: "IST",
    image: { uri: "https://images.pexels.com/photos/11540297/pexels-photo-11540297.jpeg?auto=compress&cs=tinysrgb&w=1200" },
    imageAlt: "Blue Mosque and Istanbul skyline under a clear travel-poster sky",
  },
  {
    id: "ng-abv-cdg",
    title: "Paris style escape",
    originCode: "ABV",
    destinationCode: "CDG",
    image: { uri: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Eiffel Tower above Paris streets",
  },
  {
    id: "ng-los-doh",
    title: "Doha premium transit",
    originCode: "LOS",
    destinationCode: "DOH",
    image: { uri: "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Doha skyline and corniche waterfront",
  },
] as const;

function AdventureCardView({ card }: { card: AdventureCard }) {
  const { savedIds, toggle } = useSavedDestinations();
  const [imageFailed, setImageFailed] = useState(false);
  const saved = savedIds.has(card.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}. ${card.originCode} to ${card.destinationCode}.`}
      onPress={() => router.push(discoverAdventureNavigation(card))}
      style={({ pressed }) => [styles.card, pressed && flowStyles.pressed]}
    >
      <View style={styles.imageFrame}>
        {imageFailed ? (
          <View accessibilityLabel={`Image unavailable for ${card.destinationCode}`} style={styles.imageFallback}>
            <FlowIcon name="compass" color={flowColors.navy} size={18} />
            <Text style={styles.fallbackLabel}>DESTINATION</Text>
            <Text style={styles.fallbackCode}>{card.destinationCode}</Text>
          </View>
        ) : (
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={card.imageAlt}
            onError={() => setImageFailed(true)}
            resizeMode="cover"
            source={card.image}
            style={styles.image}
          />
        )}
        <AndroidFavoriteButton
          saved={saved}
          label={saved ? "Remove from saved routes" : "Save route"}
          onPress={(event) => {
            event.stopPropagation();
            toggle(card.id);
          }}
          style={styles.heart}
        />
      </View>
      <View style={styles.contentPanel}>
        <Text numberOfLines={2} style={styles.cardTitle}>{card.title}</Text>
        <Text numberOfLines={1} style={styles.route}>{card.originCode} → {card.destinationCode}</Text>
        <Text numberOfLines={1} style={styles.tripSummary}>ONE WAY · ECONOMY · 1 TRAVELER</Text>
        <View style={styles.fromRow}>
          <Text style={styles.from}>From</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function DiscoverNextAdventure() {
  const ft = useFlowTheme();

  return (
    <View collapsable={false} testID="discover-next-adventure" style={styles.section}>
      <View style={styles.headingCopy}>
        <Text accessibilityRole="header" style={[styles.heading, { color: ft.colors.textPrimary }]}>Discover your next adventure</Text>
        <Text style={[styles.subtitle, { color: ft.colors.textSecondary }]}>Compare smart route ideas, flexible fares, and destinations picked for your region.</Text>
      </View>
      <View style={styles.grid}>
        {nextAdventureCards.map((card) => <AdventureCardView key={card.id} card={card} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginHorizontal: -14, marginTop: 4 },
  headingCopy: { gap: 8, paddingHorizontal: WEBSITE_DISCOVERY_CARD.sideInset },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: "600", letterSpacing: -0.25 },
  subtitle: { fontSize: 14, lineHeight: 24, fontWeight: "400" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: WEBSITE_DISCOVERY_CARD.gap, paddingBottom: 4, paddingHorizontal: WEBSITE_DISCOVERY_CARD.sideInset },
  card: { flexBasis: "47%", flexGrow: 1, height: WEBSITE_DISCOVERY_CARD.height, maxWidth: "50%", borderWidth: 1, borderColor: "rgba(226,232,240,0.8)", borderRadius: WEBSITE_DISCOVERY_CARD.radius, backgroundColor: "white", overflow: "hidden", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.18, shadowRadius: 17.5, elevation: 4 },
  imageFrame: { width: "100%", height: WEBSITE_DISCOVERY_CARD.imageHeight, backgroundColor: "#EAF2FF", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#EAF2FF" },
  fallbackLabel: { color: "#475569", fontSize: 10, fontWeight: "600", letterSpacing: 1.4 },
  fallbackCode: { color: flowColors.navy, fontSize: 12, fontWeight: "900", letterSpacing: 1.4 },
  heart: { position: "absolute", right: 12, top: 12, width: 32, height: 32, borderRadius: 16 },
  contentPanel: { flex: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  cardTitle: { color: "#020617", fontSize: 14, lineHeight: 18, fontWeight: "600", letterSpacing: -0.14 },
  route: { color: "#334155", fontSize: 12, lineHeight: 20, fontWeight: "600" },
  tripSummary: { color: "#64748B", fontSize: 10, lineHeight: 16, fontWeight: "600", letterSpacing: 0.8 },
  fromRow: { marginTop: "auto", paddingTop: 8, flexDirection: "row", alignItems: "baseline", gap: 6 },
  from: { color: "#334155", fontSize: 14, lineHeight: 20, fontWeight: "600" },
});
