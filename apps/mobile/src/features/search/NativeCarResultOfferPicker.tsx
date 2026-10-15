import { useState } from "react";
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Info, X } from "lucide-react-native";
import { SvgUri } from "react-native-svg";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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
      ? <SvgUri uri={safeLogoUrl} width={16} height={16} onError={() => setFailedUrl(safeLogoUrl)} />
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
  const visibleChoices = expanded ? choices : choices.slice(0, 5);
  const narrowActions = rowWidth > 0 && rowWidth < 268;
  const stackVeryNarrow = rowWidth > 0 && rowWidth < 225;
  const selectedChoice = choices.find(choice => choice.key === selectedKey);
  const disclosureSections = selectedChoice ? getCarRateDisclosureSections(selectedChoice.offer) : [];
  const paymentFacts = disclosureSections.find(section => section.id === "payment")?.facts ?? [];
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
      return <View key={key} style={[styles.provider, stackVeryNarrow && styles.providerNarrow]}>
        <View style={[styles.meta, { width: stackVeryNarrow ? ("100%" as const) : rowWidth > 0 ? Math.min(rowWidth, rowWidth / 2 + 20) : ("58%" as const) }]}>
          <View style={styles.brand}>
            <ProviderMark name={providerName} logoUrl={logoUrl} />
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.providerName, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{providerName}</Text>
          </View>
          <Text numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.price, { color: theme.textPrimary }]}>{money(displayed.currency, displayed.pricePerDay)}<Text style={[styles.perDay, { color: theme.textSecondary }]}>/day</Text></Text>
        </View>
        <View style={[styles.actionArea, stackVeryNarrow && styles.actionAreaNarrow]}>
          <Pressable
            accessibilityRole={bookingUrl ? "link" : "button"}
            accessibilityLabel={"View deal from " + providerName}
            accessibilityState={{ disabled: !bookingUrl }}
            disabled={!bookingUrl}
            onPress={bookingUrl ? () => void Linking.openURL(bookingUrl) : undefined}
            style={styles.action}
          >
            <Text style={[styles.link, { color: actionColor }]}>View deal</Text>
            {bookingUrl && !narrowActions ? <ChevronRight accessible={false} size={12} color={actionColor} /> : null}
          </Pressable>
          {hasDetails ? <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Rate information for " + providerName}
            onPress={() => setSelectedKey(key)}
            style={styles.infoAction}
          >
            <Info accessible={false} size={16} color={theme.textSecondary} />
          </Pressable> : null}
        </View>
      </View>;
    })}
    {choices.length > 5 ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Show fewer car offers" : "Show " + (choices.length - 5) + " more car offers"}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(current => !current)}
        style={styles.moreAction}
      >
        <Text style={styles.moreText}>{expanded ? "Show fewer offers" : "+" + (choices.length - 5) + " more offers"}</Text>
        <ChevronRight accessible={false} size={12} color="#004BB8" style={{ transform: [{ rotate: expanded ? "-90deg" : "90deg" }] }} />
      </Pressable>
    ) : null}
    <Modal
      visible={Boolean(selectedChoice)}
      transparent={false}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      onRequestClose={() => setSelectedKey(null)}
    >
      <SafeAreaProvider>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={[styles.sheetScreen, { backgroundColor: theme.surface }]} accessibilityViewIsModal>
          <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.sheetHeading}>
              <Text accessibilityRole="header" style={[styles.sheetTitle, { color: theme.textPrimary }]}>Rate details</Text>
              <Text numberOfLines={2} style={[styles.seller, { color: theme.textSecondary }]}>Booking provider · {selectedChoice?.providerName ?? ""}</Text>
              <Text style={[styles.sandboxNote, { color: theme.textSecondary }]}>KAYAK sandbox · Simulated rates and availability. No live booking.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close rate details" onPress={() => setSelectedKey(null)} style={[styles.closeButton, { borderColor: theme.border }]}>
              <X accessible={false} color={theme.textPrimary} size={20} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} nestedScrollEnabled>
            {selectedPrice && selectedChoice ? (
              <>
                <View style={[styles.paymentSection, { borderBottomColor: theme.border }]}>
                  <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.textPrimary }]}>Price and payment</Text>
                  <Text style={[styles.sheetPrice, { color: theme.textPrimary }]}>{money(selectedPrice.currency, selectedPrice.pricePerDay)}<Text style={[styles.sheetPerDay, { color: theme.textSecondary }]}> per day</Text></Text>
                  <Text style={[styles.sheetTotal, { color: theme.textSecondary }]}>Estimated total: {money(selectedPrice.currency, selectedPrice.totalPrice)}</Text>
                  <Text style={[styles.sheetPayment, { color: theme.textSecondary }]}>Payment timing: {getCarRatePaymentLabel(selectedChoice.offer) ?? "Not supplied"}</Text>
                  {paymentFacts.map((fact, index) => (
                    <View key={fact.label + ":" + index} style={[styles.factRow, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.factLabel, { color: theme.textSecondary }]}>{fact.label}</Text>
                      <Text style={[styles.factValue, { color: theme.textPrimary }]}>{fact.value}</Text>
                    </View>
                  ))}
                </View>
                {disclosureSections.filter(section => section.id !== "payment").map(section => (
                  <View key={section.id} style={[styles.section, { borderBottomColor: theme.border }]}>
                    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.textPrimary }]}>{section.title}</Text>
                    {section.facts.map((fact, index) => (
                      <View key={fact.label + ":" + index} style={[styles.factRow, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.factLabel, { color: theme.textSecondary }]}>{fact.label}</Text>
                        <Text style={[styles.factValue, { color: theme.textPrimary }]}>{fact.value}</Text>
                      </View>
                    ))}
                  </View>
                ))}
                <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>Sandbox rate information is simulated. Confirm pricing, rental eligibility, and final terms directly with the rental provider before booking.</Text>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  providers: { minWidth: 0, gap: 0, paddingTop: 0, paddingBottom: 0 },
  provider: { minHeight: 40, minWidth: 0, flexDirection: "row", alignItems: "center" },
  providerNarrow: { flexDirection: "column", alignItems: "stretch", paddingVertical: 3 },
  meta: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 6, paddingRight: 8 },
  brand: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 2 },
  logo: { width: 16, height: 16, flexShrink: 0 },
  fallbackMark: { width: 16, height: 16, borderRadius: 3, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  fallbackLetter: { fontSize: 11, fontWeight: "700", color: "#07133B", fontFamily: appFonts.bold },
  providerName: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 15, fontWeight: "600", fontFamily: appFonts.semibold },
  price: { flexShrink: 1, minWidth: 0, fontSize: 12, lineHeight: 16, fontWeight: "700", fontFamily: appFonts.bold, fontVariant: ["tabular-nums"] },
  perDay: { fontSize: 10, lineHeight: 14, fontWeight: "500", fontFamily: appFonts.medium },
  actionArea: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 2 },
  actionAreaNarrow: { width: "100%", flex: 0, paddingLeft: 22 },
  action: { minHeight: 40, flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 2 },
  link: { fontSize: 12, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  infoAction: { width: 36, height: 40, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  moreAction: { minHeight: 36, paddingLeft: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  moreText: { fontSize: 11, lineHeight: 16, color: "#004BB8", fontWeight: "600", fontFamily: appFonts.semibold },
  sheetScreen: { flex: 1, paddingHorizontal: 18 },
  sheetScroll: { flex: 1, minHeight: 0 },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingBottom: 14 },
  sheetHeading: { flex: 1, minWidth: 0, gap: 3 },
  sheetTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700", fontFamily: appFonts.bold },
  seller: { fontSize: 13, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold },
  sandboxNote: { fontSize: 11, lineHeight: 16, marginTop: 2, fontFamily: appFonts.regular },
  closeButton: { width: 44, height: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  sheetBody: { paddingTop: 16, paddingBottom: 24 },
  sheetPrice: { fontSize: 22, fontWeight: "700", fontFamily: appFonts.bold, fontVariant: ["tabular-nums"], lineHeight: 28 },
  sheetPerDay: { fontSize: 12, fontWeight: "500", fontFamily: appFonts.medium },
  sheetTotal: { marginTop: 4, fontSize: 13, lineHeight: 18, fontFamily: appFonts.medium },
  sheetPayment: { marginTop: 4, marginBottom: 12, fontSize: 12, lineHeight: 18, fontFamily: appFonts.medium },
  paymentSection: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 16 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 16, paddingBottom: 12, gap: 0 },
  sectionTitle: { marginBottom: 12, fontSize: 15, lineHeight: 21, letterSpacing: -0.18, fontWeight: "600", fontFamily: appFonts.semibold },
  factRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, minWidth: 0, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  factLabel: { width: "42%", minWidth: 0, flexShrink: 1, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  factValue: { flex: 1, minWidth: 0, textAlign: "right", fontSize: 13, lineHeight: 19, fontWeight: "500", fontFamily: appFonts.medium },
  disclaimer: { marginTop: 12, fontSize: 11, lineHeight: 16, fontFamily: appFonts.medium },
});
