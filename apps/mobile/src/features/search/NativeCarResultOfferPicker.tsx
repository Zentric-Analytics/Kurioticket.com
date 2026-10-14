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

/** Compact one-line seller offers in the card's existing left-side comparison area. */
export function NativeCarResultOfferPicker({
  result, displayCurrency, rates,
}: {
  result: CarResult;
  displayCurrency: string;
  rates: ExchangeRates;
}) {
  const { theme } = useAppTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const choices = nativeCarResultDealChoices(result);
  if (!choices.length) return null;

  return <View
    accessibilityLabel="Car deal providers"
    style={styles.providers}
    onLayout={event => {
      const width = Math.round(event.nativeEvent.layout.width);
      setRowWidth(current => current === width ? current : width);
    }}
  >
    {choices.map(({ key, providerName, logoUrl, offer, bookingUrl }) => {
      const displayed = presentCarOfferCurrency(offer, displayCurrency, rates);
      const actionColor = bookingUrl ? (theme.dark ? "#8FB5FF" : "#004BB8") : "#94A3B8";
      return <View key={key} style={styles.provider}>
        <View style={[styles.meta, { width: rowWidth > 0 ? Math.min(rowWidth, rowWidth / 2 + 26) : ("62%" as const) }]}>
          <View style={styles.brand}>
          <ProviderMark name={providerName} logoUrl={logoUrl} />
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.providerName, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{providerName}</Text>
          </View>
          <Text numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.price, { color: theme.textPrimary }]}>{money(displayed.currency, displayed.pricePerDay)}<Text style={[styles.perDay, { color: theme.textSecondary }]}>/day</Text></Text>
        </View>
        <Pressable
          accessibilityRole={bookingUrl ? "link" : "button"}
          accessibilityLabel={`View deal from ${providerName}`}
          accessibilityState={{ disabled: !bookingUrl }}
          disabled={!bookingUrl}
          onPress={bookingUrl ? () => void Linking.openURL(bookingUrl) : undefined}
          style={styles.action}
        >
          <Text style={[styles.link, { color: actionColor }]}>View deal</Text>
          {bookingUrl ? <ChevronRight accessible={false} size={10} color={actionColor} /> : null}
        </Pressable>
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  providers: { minWidth: 0, gap: 0, paddingTop: 2, paddingBottom: 3 },
  provider: { minHeight: 18, minWidth: 0, flexDirection: "row", alignItems: "center" },
  meta: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 6, paddingRight: 8 },
  brand: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 2 },
  logo: { width: 14, height: 14, flexShrink: 0 },
  fallbackMark: { width: 14, height: 14, borderRadius: 3, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  fallbackLetter: { fontSize: 10, fontWeight: "700", color: "#07133B", fontFamily: appFonts.bold },
  providerName: { flex: 1, minWidth: 0, fontSize: 9, lineHeight: 12, fontWeight: "600", fontFamily: appFonts.semibold },
  price: { flexShrink: 1, minWidth: 0, fontSize: 11, lineHeight: 14, fontWeight: "700", fontFamily: appFonts.bold, fontVariant: ["tabular-nums"] },
  perDay: { fontSize: 9, lineHeight: 12, fontWeight: "500", fontFamily: appFonts.medium },
  action: { minHeight: 18, flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 2 },
  link: { fontSize: 9, lineHeight: 13, fontWeight: "600", fontFamily: appFonts.semibold },
});
