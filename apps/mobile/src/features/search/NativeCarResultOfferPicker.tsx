import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { SvgUri } from "react-native-svg";
import type { CarResult } from "../../api/travelApi";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import type { ExchangeRates } from "../currency/displayCurrency";
import { money } from "./SearchUi";
import { presentCarOfferCurrency } from "./carDisplayCurrency";
import { nativeCarResultDealChoices } from "./nativeCarResultDeals";
import { resolveTravelProviderLogo } from "./providerLogoResolver";

function ProviderMark({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (/kurioticket/i.test(name)) {
    return <Image accessible={false} source={require("../../../assets/kurioticket-icon-blue.png")} resizeMode="contain" style={styles.logo} />;
  }
  const safeLogoUrl = resolveTravelProviderLogo(logoUrl);
  if (safeLogoUrl && failedUrl !== safeLogoUrl) {
    return /\.svg(?:[?#]|$)/i.test(safeLogoUrl)
      ? <SvgUri uri={safeLogoUrl} width={14} height={14} onError={() => setFailedUrl(safeLogoUrl)} />
      : <Image accessible={false} source={{ uri: safeLogoUrl }} resizeMode="contain" style={styles.logo} onError={() => setFailedUrl(safeLogoUrl)} />;
  }
  return <View accessible={false} style={styles.fallbackMark}><Text style={styles.fallbackLetter}>{name.trim().slice(0, 1).toUpperCase() || "P"}</Text></View>;
}

/** One full-width horizontal row per real offer; the result card grows naturally. */
export function NativeCarResultOfferPicker({
  result, displayCurrency, rates,
}: {
  result: CarResult;
  displayCurrency: string;
  rates: ExchangeRates;
}) {
  const { theme } = useAppTheme();
  const choices = nativeCarResultDealChoices(result);
  if (!choices.length) return null;
  const divider = theme.dark ? theme.border : "#E2E8F0";

  return <View accessibilityLabel="Compare car deals" style={[styles.providers, { backgroundColor: theme.dark ? theme.surface : "#FFFFFF", borderTopColor: theme.dark ? theme.border : "#CBD5E1" }]}>
    <Text style={[styles.heading, { color: theme.textPrimary }]}>Compare deals</Text>
    <View accessibilityLabel="Car deal providers" style={[styles.rows, { borderColor: theme.dark ? theme.border : "#D8E1EC" }]}>
      {choices.map(({ key, providerName, logoUrl, offer, bookingUrl }, index) => {
        const displayed = presentCarOfferCurrency(offer, displayCurrency, rates);
        const actionColor = bookingUrl ? (theme.dark ? "#8FB5FF" : "#004BB8") : "#94A3B8";
        return <View key={key} style={[styles.provider, index > 0 && { borderTopWidth: 1, borderTopColor: divider }]}>
          <View style={styles.brand}>
            <ProviderMark name={providerName} logoUrl={logoUrl} />
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.providerName, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{providerName}</Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.price, { color: theme.textPrimary }]}>{money(displayed.currency, displayed.pricePerDay)}<Text style={[styles.perDay, { color: theme.textSecondary }]}>/day</Text></Text>
          <Pressable
            accessibilityRole={bookingUrl ? "link" : "button"}
            accessibilityLabel={`View deal from ${providerName}`}
            accessibilityState={{ disabled: !bookingUrl }}
            disabled={!bookingUrl}
            onPress={bookingUrl ? () => void Linking.openURL(bookingUrl) : undefined}
            style={styles.action}
          >
            <Text style={[styles.link, { color: actionColor }]}>View deal</Text>
            <ChevronRight accessible={false} size={12} color={actionColor} />
          </Pressable>
        </View>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  providers: { minWidth: 0, borderTopWidth: 1, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12 },
  heading: { marginBottom: 8, fontSize: 13, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold },
  rows: { minWidth: 0, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  provider: { minHeight: 48, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 8 },
  brand: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 5 },
  logo: { width: 16, height: 16, flexShrink: 0 },
  fallbackMark: { width: 16, height: 16, borderRadius: 3, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  fallbackLetter: { fontSize: 10, fontWeight: "700", color: "#07133B", fontFamily: appFonts.bold },
  providerName: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 15, fontWeight: "600", fontFamily: appFonts.semibold },
  price: { flexShrink: 0, minWidth: 60, fontSize: 12, lineHeight: 17, fontWeight: "700", fontFamily: appFonts.bold, fontVariant: ["tabular-nums"], textAlign: "right" },
  perDay: { fontSize: 9, lineHeight: 12, fontWeight: "500", fontFamily: appFonts.medium },
  action: { minHeight: 44, minWidth: 77, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 2 },
  link: { fontSize: 11, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
});
