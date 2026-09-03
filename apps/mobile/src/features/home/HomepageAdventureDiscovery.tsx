import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { getApiBaseUrl } from "../../config/apiUrl";
import { useMobileMarketplace } from "../../localization/MobileLocalizationProvider";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { FlowIcon } from "../flow/FlowIcon";
import { flowStyles, useFlowTheme } from "../flow/flowStyles";
import { AndroidFavoriteButton } from "./AndroidFavoriteButton";
import { discoverAdventureNavigation } from "./homepageCardNavigation";
import { getHomepageAdventureDiscoveryItems, readFreshDiscoveryFare, splitAdventureDiscoveryRows, type DiscoveryFare, type HomepageAdventureDiscoveryItem } from "./HomepageAdventureDiscoveryData";
import type { MarketplaceContext } from "../../../../../src/shared/marketplace/marketplaceContext";

const ROW_GAP = 12;

export function HomepageAdventureDiscovery() {
  const ft = useFlowTheme();
  const { width } = useWindowDimensions();
  const { savedIds, toggle } = useSavedDestinations();
  const marketplace = useMobileMarketplace();
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [fares, setFares] = useState<Record<string, DiscoveryFare>>({});
  const cardWidth = Math.min(210, Math.max(170, width * 0.44));
  const api = getApiBaseUrl(undefined, __DEV__);
  const assetOrigin = api.ok ? api.baseUrl : "https://staging.kurioticket.com";
  const items = useMemo(() => getHomepageAdventureDiscoveryItems(marketplace.marketCountryCode, assetOrigin), [assetOrigin, marketplace.marketCountryCode]);
  const rows = useMemo(() => splitAdventureDiscoveryRows(items), [items]);

  useEffect(() => {
    if (!api.ok) return;
    const controller = new AbortController();
    void fetch(`${api.baseUrl}/api/flights/home-discovery-fares?regionCode=${encodeURIComponent(marketplace.marketCountryCode)}&currency=${encodeURIComponent(marketplace.displayCurrency)}&limit=8`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : undefined)
      .then((payload: unknown) => {
        if (!payload || typeof payload !== "object") return;
        const cards = (payload as { cards?: unknown }).cards;
        if (!Array.isArray(cards)) return;
        const next: Record<string, DiscoveryFare> = {};
        for (const item of items) {
          const card = cards.find((candidate) => candidate && typeof candidate === "object" && (candidate as { item?: { id?: unknown } }).item?.id === item.id);
          const fare = readFreshDiscoveryFare(card, item);
          if (fare) next[item.id] = fare;
        }
        setFares(next);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [api.ok ? api.baseUrl : null, items, marketplace.displayCurrency, marketplace.marketCountryCode]);

  return (
    <View collapsable={false} testID="homepage-adventure-discovery" style={styles.section}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.heading, { color: ft.colors.textPrimary }]}>Discover your next adventure here</Text>
        <Text style={[styles.subtitle, { color: ft.colors.textSecondary }]}>Compare smart route ideas, flexible fares, and destinations picked for your region.</Text>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        testID="homepage-adventure-row-top"
        style={styles.rowViewport}
        contentContainerStyle={styles.rowContent}
      >
        {rows.top.map((item) => (
          <AdventureCard key={item.id} item={item} width={cardWidth} fare={fares[item.id]} marketplace={marketplace} imageFailed={failedImages.has(item.id)} saved={savedIds.has(item.id)} onImageError={() => setFailedImages((current) => new Set(current).add(item.id))} onFavorite={() => toggle(item.id)} />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        testID="homepage-adventure-row-bottom"
        style={styles.rowViewport}
        contentContainerStyle={styles.rowContent}
      >
        {rows.bottom.map((item) => (
          <AdventureCard key={item.id} item={item} width={cardWidth} fare={fares[item.id]} marketplace={marketplace} imageFailed={failedImages.has(item.id)} saved={savedIds.has(item.id)} onImageError={() => setFailedImages((current) => new Set(current).add(item.id))} onFavorite={() => toggle(item.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function AdventureCard({ item, width, fare, marketplace, imageFailed, saved, onImageError, onFavorite }: { item: HomepageAdventureDiscoveryItem; width: number; fare?: DiscoveryFare; marketplace: MarketplaceContext; imageFailed: boolean; saved: boolean; onImageError: () => void; onFavorite: () => void }) {
  const ft = useFlowTheme();
  const formattedFare = fare ? new Intl.NumberFormat(marketplace.locale, { style: "currency", currency: fare.currency, maximumFractionDigits: 0 }).format(fare.price) : undefined;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.originCode} to ${item.destinationCode}.${formattedFare ? ` From ${formattedFare}.` : ""}`} onPress={() => router.push(discoverAdventureNavigation(item, marketplace))} style={({ pressed }) => [styles.card, { width, backgroundColor: ft.colors.card, borderColor: ft.colors.border }, ft.styles.shadow, pressed && flowStyles.pressed]}>
      <View style={styles.imageFrame}>
        {imageFailed ? <View accessibilityLabel={`Image unavailable for ${item.destinationCode}`} testID={`adventure-image-fallback-${item.id}`} style={[styles.imageFallback, { backgroundColor: ft.colors.neutralImage }]}><FlowIcon name="compass" color={ft.colors.icon} size={22} /><Text style={[styles.fallbackCode, { color: ft.colors.textPrimary }]}>{item.destinationCode}</Text></View> : <Image accessibilityIgnoresInvertColors accessibilityLabel={item.imageAlt} onError={onImageError} resizeMode="cover" source={item.image} style={styles.image} />}
        <AndroidFavoriteButton saved={saved} label={`${saved ? "Remove" : "Add"} ${item.title} ${saved ? "from" : "to"} favorites`} onPress={(event) => { event.stopPropagation(); onFavorite(); }} style={styles.heart} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={2} style={[styles.title, { color: ft.colors.textPrimary }]}>{item.title}</Text>
        <Text style={[styles.route, { color: ft.colors.textPrimary }]}>{item.originCode} → {item.destinationCode}</Text>
        <Text numberOfLines={2} style={[styles.meta, { color: ft.colors.textSecondary }]}>ONE WAY · ECONOMY · 1 TRAVELER</Text>
        <View style={styles.fare}><Text style={[styles.from, { color: ft.colors.textSecondary }]}>From</Text>{formattedFare ? <Text style={[styles.price, { color: ft.colors.textPrimary }]}>{formattedFare}</Text> : null}</View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16, marginTop: 4 }, header: { gap: 6 }, heading: { fontSize: 21, lineHeight: 27, fontWeight: "800", letterSpacing: -0.25 }, subtitle: { fontSize: 14, lineHeight: 21 },
  rowViewport: { marginHorizontal: -14 }, rowContent: { gap: ROW_GAP, paddingHorizontal: 14, paddingRight: 40 }, card: { height: 292, borderRadius: 16, borderWidth: 1, overflow: "hidden" }, imageFrame: { height: 132 }, image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }, fallbackCode: { fontSize: 13, fontWeight: "900", letterSpacing: 1.4 }, heart: { position: "absolute", right: 8, top: 8 },
  copy: { flex: 1, padding: 11 }, title: { minHeight: 38, fontSize: 14, lineHeight: 18, fontWeight: "700" }, route: { marginTop: 6, fontSize: 12, lineHeight: 17, fontWeight: "700" }, meta: { marginTop: 5, fontSize: 9, lineHeight: 13, fontWeight: "700", letterSpacing: 0.35 }, fare: { marginTop: "auto", flexDirection: "row", alignItems: "baseline", gap: 5 }, from: { fontSize: 12, fontWeight: "600" }, price: { fontSize: 15, fontWeight: "800" },
});
