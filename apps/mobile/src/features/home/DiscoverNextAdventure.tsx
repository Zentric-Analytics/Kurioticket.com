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
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors, flowStyles } from "../flow/flowStyles";
import { FavoriteButton } from "../../components/FavoriteButton";

type AdventureCard = {
  id: string;
  title: string;
  originCode: string;
  destinationCode: string;
  image: { uri: string };
  imageAlt: string;
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
  const { savedIds, toggle } = useSavedDestinations();
  const [imageFailed, setImageFailed] = useState(false);
  const saved = savedIds.has(card.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}. ${card.originCode} to ${card.destinationCode}.`}
      onPress={() => router.push({ pathname: "/flights", params: { from: card.originCode, to: card.destinationCode } })}
      style={({ pressed }) => [styles.card, flowStyles.shadow, { width }, pressed && flowStyles.pressed]}
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
        <FavoriteButton
          saved={saved}
          accessibilityLabel={saved ? "Remove from saved routes" : "Save route"}
          onPress={(event) => {
            event.stopPropagation();
            toggle(card.id);
          }}
          style={styles.heart}
        />
      </View>
      <View style={styles.cardCopy}>
        <Text numberOfLines={2} style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.route}>{card.originCode} → {card.destinationCode}</Text>
        <Text style={styles.tripSummary}>ONE WAY · ECONOMY · 1 TRAVELER</Text>
        <Text style={styles.from}>From</Text>
      </View>
    </Pressable>
  );
}

export function DiscoverNextAdventure() {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(210, Math.max(170, width * 0.44));
  const rows = [
    nextAdventureCards.filter((_, index) => index % 2 === 0),
    nextAdventureCards.filter((_, index) => index % 2 === 1),
  ];

  return (
    <View collapsable={false} testID="discover-next-adventure" style={styles.section}>
      <View style={styles.headingCopy}>
        <Text accessibilityRole="header" style={styles.heading}>Discover your next adventure here</Text>
        <Text style={styles.subtitle}>Compare smart route ideas, flexible fares, and destinations picked for your region.</Text>
      </View>
      <View style={styles.rows}>
        {rows.map((cards, rowIndex) => (
          <ScrollView
            key={rowIndex === 0 ? "top-row" : "bottom-row"}
            horizontal
            nestedScrollEnabled
            removeClippedSubviews={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {cards.map((card) => <AdventureCardView key={card.id} card={card} width={cardWidth} />)}
          </ScrollView>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 4 },
  headingCopy: { gap: 8 },
  heading: { color: flowColors.navy, fontSize: 21, lineHeight: 27, fontWeight: "600", letterSpacing: -0.25 },
  subtitle: { color: "#475569", fontSize: 14, lineHeight: 24, fontWeight: "400" },
  rows: { gap: 12 },
  carousel: { gap: 12, paddingBottom: 4, paddingRight: 40 },
  card: { height: 300, borderRadius: 16, borderWidth: 1, borderColor: "rgba(226,232,240,0.8)", backgroundColor: "white", overflow: "hidden" },
  imageFrame: { height: 135, backgroundColor: "#EAF2FF", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#EAF2FF" },
  fallbackLabel: { color: "#475569", fontSize: 10, fontWeight: "600", letterSpacing: 1.4 },
  fallbackCode: { color: flowColors.navy, fontSize: 12, fontWeight: "900", letterSpacing: 1.4 },
  heart: { position: "absolute", right: 12, top: 12 },
  cardCopy: { flex: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  cardTitle: { minHeight: 36, color: "#020617", fontSize: 14, lineHeight: 18, fontWeight: "600", letterSpacing: -0.1 },
  route: { color: "#334155", fontSize: 12, lineHeight: 20, fontWeight: "600" },
  tripSummary: { color: "#64748B", fontSize: 10, lineHeight: 16, fontWeight: "600", letterSpacing: 0.8 },
  from: { marginTop: "auto", paddingTop: 8, color: "#334155", fontSize: 14, lineHeight: 20, fontWeight: "600" },
});
