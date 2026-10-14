import { useState } from "react";
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Info, X } from "lucide-react-native";
import { SvgUri } from "react-native-svg";
import type { CarResult } from "../../api/travelApi";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import type { ExchangeRates } from "../currency/displayCurrency";
import { money } from "./SearchUi";
import { presentCarOfferCurrency } from "./carDisplayCurrency";
import { nativeCarResultDealChoices } from "./nativeCarResultDeals";
import { resolveTravelProviderLogo } from "./providerLogoResolver";
import { getCarRateDisclosureSections, getCarRatePaymentLabel } from "../../../../../src/lib/cars/carRateDisclosure";

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


/** Compact seller offers, with all supplier facts in a rate-specific native sheet. */
export function NativeCarResultOfferPicker({
  result, displayCurrency, rates,
}: {
  result: CarResult;
  displayCurrency: string;
  rates: ExchangeRates;
}) {
  const { theme } = useAppTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const choices = nativeCarResultDealChoices(result);
  const visibleChoices = expanded ? choices : choices.slice(0, 2);
  const selectedChoice = choices.find(choice => choice.key === selectedKey);
  const selectedPrice = selectedChoice
    ? presentCarOfferCurrency(selectedChoice.offer, displayCurrency, rates)
    : null;
  if (!choices.length) return null;

  return <View
    accessibilityLabel="Car deal providers"
    style={styles.providers}
    onLayout={event => {
      const width = Math.round(event.nativeEvent.layout.width);
      setRowWidth(current => current === width ? current : width);
    }}
  >
    {visibleChoices.map(({ key, providerName, logoUrl, offer, bookingUrl }) => {
      const displayed = presentCarOfferCurrency(offer, displayCurrency, rates);
      const actionColor = bookingUrl ? (theme.dark ? "#8FB5FF" : "#004BB8") : "#94A3B8";
      const hasDetails = result.inventorySource === "kayak-sandbox" && Boolean(offer.suppliedFacts?.length);
      return <View key={key} style={styles.provider}>
        <View style={[styles.meta, { width: rowWidth > 0 ? Math.min(rowWidth, rowWidth / 2 + 26) : ("62%" as const) }]}>
          <View style={styles.brand}>
            <ProviderMark name={providerName} logoUrl={logoUrl} />
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.providerName, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{providerName}</Text>
          </View>
          <Text numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.price, { color: theme.textPrimary }]}>{money(displayed.currency, displayed.pricePerDay)}<Text style={[styles.perDay, { color: theme.textSecondary }]}>/day</Text></Text>
        </View>
        <View style={styles.actionArea}>
          <Pressable
            accessibilityRole={bookingUrl ? "link" : "button"}
            accessibilityLabel={"View deal from " + providerName}
            accessibilityState={{ disabled: !bookingUrl }}
            disabled={!bookingUrl}
            onPress={bookingUrl ? () => void Linking.openURL(bookingUrl) : undefined}
            style={styles.action}
          >
            <Text style={[styles.link, { color: actionColor }]}>View deal</Text>
            {bookingUrl ? <ChevronRight accessible={false} size={10} color={actionColor} /> : null}
          </Pressable>
          {hasDetails ? <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Rate information for " + providerName}
            onPress={() => setSelectedKey(key)}
            hitSlop={4}
            style={styles.infoAction}
          >
            <Info accessible={false} size={12} color={theme.textSecondary} />
          </Pressable> : null}
        </View>
      </View>;
    })}
    {choices.length > 2 ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Show fewer car offers" : "Show " + (choices.length - 2) + " more car offers"}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(current => !current)}
        style={styles.moreAction}
      >
        <Text style={styles.moreText}>{expanded ? "Show fewer offers" : "+" + (choices.length - 2) + " more offers"}</Text>
        <ChevronRight accessible={false} size={12} color="#004BB8" style={{ transform: [{ rotate: expanded ? "-90deg" : "90deg" }] }} />
      </Pressable>
    ) : null}
    <Modal
      transparent
      visible={Boolean(selectedChoice)}
      animationType="slide"
      onRequestClose={() => setSelectedKey(null)}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close rate details"
          style={styles.backdrop}
          onPress={() => setSelectedKey(null)}
        />
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityViewIsModal>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeading}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Rate details</Text>
              <Text numberOfLines={1} style={[styles.seller, { color: theme.textSecondary }]}>{selectedChoice?.providerName ?? ""}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close rate details" onPress={() => setSelectedKey(null)} style={styles.closeButton}>
              <X accessible={false} color={theme.textPrimary} size={20} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} nestedScrollEnabled>
            {selectedPrice && selectedChoice ? (
              <>
                <Text style={[styles.sheetPrice, { color: theme.textPrimary }]}>{money(selectedPrice.currency, selectedPrice.pricePerDay)}<Text style={[styles.sheetPerDay, { color: theme.textSecondary }]}> per day</Text></Text>
                <Text style={[styles.sheetTotal, { color: theme.textSecondary }]}>Estimated total: {money(selectedPrice.currency, selectedPrice.totalPrice)}</Text>
                <Text style={[styles.sheetPayment, { color: theme.textSecondary }]}>{getCarRatePaymentLabel(selectedChoice.offer) ?? "Payment timing not supplied"}</Text>
                {getCarRateDisclosureSections(selectedChoice.offer).map(section => (
                  <View key={section.id} style={[styles.section, { borderTopColor: theme.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{section.title}</Text>
                    {section.facts.map((fact, index) => (
                      <View key={fact.label + ":" + index} style={styles.factRow}>
                        <Text style={[styles.factLabel, { color: theme.textSecondary }]}>{fact.label}</Text>
                        <Text style={[styles.factValue, { color: theme.textPrimary }]}>{fact.value}</Text>
                      </View>
                    ))}
                  </View>
                ))}
                <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>These conditions are specific to this offer. Confirm final terms with the rental provider before booking.</Text>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  actionArea: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center" },
  action: { minHeight: 18, flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 2 },
  link: { fontSize: 9, lineHeight: 13, fontWeight: "600", fontFamily: appFonts.semibold },
  infoAction: { width: 24, height: 26, alignItems: "center", justifyContent: "center" },
  moreAction: { minHeight: 28, paddingLeft: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  moreText: { fontSize: 10, color: "#004BB8", fontWeight: "600", fontFamily: appFonts.semibold },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(7,19,59,0.55)" },
  sheet: { maxHeight: "82%", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24 },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  sheetHeading: { flex: 1, minWidth: 0, gap: 3 },
  sheetTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700", fontFamily: appFonts.bold },
  seller: { fontSize: 13, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold },
  closeButton: { minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center" },
  sheetBody: { paddingBottom: 18 },
  sheetPrice: { fontSize: 22, fontWeight: "700", fontFamily: appFonts.bold, fontVariant: ["tabular-nums"], lineHeight: 28 },
  sheetPerDay: { fontSize: 12, fontWeight: "500", fontFamily: appFonts.medium },
  sheetTotal: { marginTop: 4, fontSize: 13, lineHeight: 18, fontFamily: appFonts.medium },
  sheetPayment: { marginTop: 4, marginBottom: 12, fontSize: 11, lineHeight: 16, fontFamily: appFonts.medium },
  section: { borderTopWidth: 1, paddingTop: 12, paddingBottom: 6, gap: 10 },
  sectionTitle: { fontSize: 13, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold },
  factRow: { flexDirection: "row", gap: 10 },
  factLabel: { width: "38%", fontSize: 11, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  factValue: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
  disclaimer: { marginTop: 12, fontSize: 11, lineHeight: 16, fontFamily: appFonts.medium },
});
