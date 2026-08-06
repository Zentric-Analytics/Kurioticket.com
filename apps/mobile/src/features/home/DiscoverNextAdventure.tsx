import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
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
  category?: string;
};

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

function AdventureCardView({ card, width }: { card: AdventureCard; width: number }) {
  const ft = useFlowTheme();
  const { savedIds, toggle } = useSavedDestinations();
  const [imageFailed, setImageFailed] = useState(false);
  const saved = savedIds.has(card.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}. ${card.originCode} to ${card.destinationCode}.`}
      onPress={() => router.push(discoverAdventureNavigation(card))}
      style={({ pressed }) => [styles.card, { width }, pressed && flowStyles.pressed]}
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
        <Svg pointerEvents="none" style={styles.gradientOverlay} preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id={`discover-overlay-${ft.theme.dark ? "dark" : "light"}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={ft.theme.dark ? "#020617" : "#071A48"} stopOpacity="0" />
              <Stop offset="0.44" stopColor={ft.theme.dark ? "#020617" : "#071A48"} stopOpacity={ft.theme.dark ? "0.42" : "0.32"} />
              <Stop offset="1" stopColor={ft.theme.dark ? "#020617" : "#071A48"} stopOpacity={ft.theme.dark ? "0.86" : "0.72"} />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill={`url(#discover-overlay-${ft.theme.dark ? "dark" : "light"})`} />
        </Svg>
        <View style={styles.cardCopy}>
          {card.category ? <Text numberOfLines={1} style={[styles.categoryPill, ft.theme.dark && styles.categoryPillDark]}>{card.category}</Text> : null}
          <Text numberOfLines={2} style={styles.cardTitle}>{card.title}</Text>
          <Text numberOfLines={1} style={styles.route}>{card.originCode} → {card.destinationCode}</Text>
        </View>
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
    </Pressable>
  );
}

export function DiscoverNextAdventure() {
  const ft = useFlowTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(190, Math.max(160, width * 0.42));

  return (
    <View collapsable={false} testID="discover-next-adventure" style={styles.section}>
      <View style={styles.headingCopy}>
        <Text accessibilityRole="header" style={[styles.heading, { color: ft.colors.textPrimary }]}>Discover your next adventure here</Text>
        <Text style={[styles.subtitle, { color: ft.colors.textSecondary }]}>Compare smart route ideas, flexible fares, and destinations picked for your region.</Text>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {nextAdventureCards.map((card) => <AdventureCardView key={card.id} card={card} width={cardWidth} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 4 },
  headingCopy: { gap: 8 },
  heading: { fontSize: 21, lineHeight: 27, fontWeight: "600", letterSpacing: -0.25 },
  subtitle: { fontSize: 14, lineHeight: 24, fontWeight: "400" },
  carousel: { gap: 12, paddingBottom: 4, paddingRight: 40 },
  card: { height: 187, borderRadius: 18, overflow: "hidden" },
  imageFrame: { flex: 1, borderRadius: 18, backgroundColor: "#EAF2FF", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#EAF2FF" },
  fallbackLabel: { color: "#475569", fontSize: 10, fontWeight: "600", letterSpacing: 1.4 },
  fallbackCode: { color: flowColors.navy, fontSize: 12, fontWeight: "900", letterSpacing: 1.4 },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  heart: { position: "absolute", right: 12, top: 12 },
  cardCopy: { position: "absolute", left: 12, right: 12, bottom: 13, gap: 5 },
  categoryPill: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(219,234,254,0.92)", color: flowColors.blue, paddingHorizontal: 9, paddingVertical: 4, fontSize: 10, lineHeight: 13, fontWeight: "800", letterSpacing: 0.2 },
  categoryPillDark: { backgroundColor: "rgba(29,78,216,0.58)", color: "#DBEAFE" },
  cardTitle: { color: "white", fontSize: 15, lineHeight: 19, fontWeight: "800", letterSpacing: -0.12 },
  route: { color: "rgba(255,255,255,0.84)", fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 0.35 },
});
