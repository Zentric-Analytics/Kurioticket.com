import { useState } from "react";
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CarFront, ChevronRight, IdCard, Info, MapPin, ShieldCheck, Wallet, X } from "lucide-react-native";
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
import { getCarRateDisclosureSections, getCarRatePaymentLabel, type CarRateDisclosureSection } from "../../../../../src/lib/cars/carRateDisclosure";

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


const rateSectionIcons = {
  payment: Wallet,
  policies: ShieldCheck,
  pickup: MapPin,
  driver: IdCard,
  vehicle: CarFront,
  other: Info,
} as const;

function RateSectionHeading({
  id, title, textColor, iconColor,
}: {
  id: CarRateDisclosureSection["id"];
  title: string;
  textColor: string;
  iconColor: string;
}) {
  const SectionIcon = rateSectionIcons[id];
  return (
    <View style={styles.sectionHeading}>
      <SectionIcon accessible={false} size={18} strokeWidth={2.1} color={iconColor} />
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
    </View>
  );
}

/** Compact seller offers, with all supplier facts in a rate-specific native sheet. */
const INITIAL_VISIBLE_OFFER_COUNT = 3;
export function NativeCarResultOfferPicker({
  result, displayCurrency, rates,
}: {
  result: CarResult;
  displayCurrency: string;
  rates: ExchangeRates;
}) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const choices = nativeCarResultDealChoices(result);
  const visibleChoices = expanded ? choices : choices.slice(0, INITIAL_VISIBLE_OFFER_COUNT);
  const selectedChoice = choices.find(choice => choice.key === selectedKey);
  const disclosureSections = selectedChoice ? getCarRateDisclosureSections(selectedChoice.offer) : [];
  const paymentFacts = disclosureSections.find(section => section.id === "payment")?.facts ?? [];
  const selectedPrice = selectedChoice
    ? presentCarOfferCurrency(selectedChoice.offer, displayCurrency, rates)
    : null;
  if (!choices.length) return null;


  return <View accessibilityLabel="Car deal providers" style={styles.providers}>
    <View style={styles.offerRows}>
      {visibleChoices.map(({ key, providerName, logoUrl, offer, bookingUrl }) => {
        const displayed = presentCarOfferCurrency(offer, displayCurrency, rates);
        const hasDetails = result.inventorySource === "kayak-sandbox" && Boolean(offer.suppliedFacts?.length);
        return (
          <View
            key={key}
            style={[styles.provider, { backgroundColor: theme.dark ? theme.surface : "#FFFFFF", borderColor: theme.dark ? theme.border : "#D9E2E8" }]}
          >
            <View style={styles.brand}>
              <ProviderMark name={providerName} logoUrl={logoUrl} />
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.providerName, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{providerName}</Text>
              {hasDetails ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={"Rate information for " + providerName}
                  onPress={() => setSelectedKey(key)}
                  hitSlop={4}
                  style={styles.infoAction}
                >
                  <Info accessible={false} size={18} strokeWidth={1.6} color={theme.dark ? theme.textSecondary : "#595959"} />
                </Pressable>
              ) : null}
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.price, { color: theme.textPrimary }]}>
              {money(displayed.currency, displayed.pricePerDay)}<Text style={[styles.perDay, { color: theme.textSecondary }]}>/day</Text>
            </Text>
            <Pressable
              accessibilityRole={bookingUrl ? "link" : "button"}
              accessibilityLabel={"View deal from " + providerName}
              accessibilityState={{ disabled: !bookingUrl }}
              disabled={!bookingUrl}
              onPress={bookingUrl ? () => void Linking.openURL(bookingUrl) : undefined}
              style={({ pressed }) => [styles.action, !bookingUrl && styles.actionDisabled, pressed && styles.actionPressed]}
            >
              <Text style={styles.link}>View deal</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
    <View style={styles.moreSlot}>
      {choices.length > INITIAL_VISIBLE_OFFER_COUNT ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Show fewer car offers" : "Show " + (choices.length - INITIAL_VISIBLE_OFFER_COUNT) + " more car offers"}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(current => !current)}
          style={styles.moreAction}
        >
          <Text style={styles.moreText}>{expanded ? "Show fewer offers" : "+" + (choices.length - INITIAL_VISIBLE_OFFER_COUNT) + " more offers"}</Text>
          <ChevronRight accessible={false} size={12} color="#004BB8" style={{ transform: [{ rotate: expanded ? "-90deg" : "90deg" }] }} />
        </Pressable>
      ) : null}
    </View>
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
            <View style={styles.sheetTitleRow}>
              <View accessible={false} style={styles.sheetHeadingSpacer} />
              <Text accessibilityRole="header" style={[styles.sheetTitle, { color: theme.textPrimary }]}>Rate details</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close rate details" onPress={() => setSelectedKey(null)} style={styles.closeButton}>
                <X accessible={false} color={theme.textPrimary} size={20} />
              </Pressable>
            </View>
            <Text numberOfLines={2} style={[styles.seller, { color: theme.textSecondary }]}>Booking provider · {selectedChoice?.providerName ?? ""}</Text>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} nestedScrollEnabled>
            {selectedPrice && selectedChoice ? (
              <>
                <View style={[styles.paymentSection, { borderBottomColor: theme.border }]}>
                  <RateSectionHeading id="payment" title="Price and payment" textColor={theme.textPrimary} iconColor={theme.dark ? "#CBD5E1" : "#475569"} />
                  <Text style={[styles.sheetPrice, { color: theme.textPrimary }]}>{money(selectedPrice.currency, selectedPrice.pricePerDay)}<Text style={[styles.sheetPerDay, { color: theme.textSecondary }]}> per day</Text></Text>
                  <Text style={[styles.sheetTotal, { color: theme.dark ? "#CBD5E1" : "#475569" }]}>Estimated total: <Text style={[styles.sheetTotalAmount, { color: theme.textPrimary }]}>{money(selectedPrice.currency, selectedPrice.totalPrice)}</Text></Text>
                  <Text style={[styles.sheetPayment, { color: theme.textSecondary }]}>Payment timing: {getCarRatePaymentLabel(selectedChoice.offer) ?? "Not supplied"}</Text>
                  {paymentFacts.map((fact, index) => (
                    <View key={fact.label + ":" + index} style={[styles.factRow, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.factLabel, { color: theme.dark ? "#CBD5E1" : "#475569" }]}>{fact.label}</Text>
                      <Text style={[styles.factValue, { color: theme.dark ? "#E2E8F0" : "#1E293B" }]}>{fact.value}</Text>
                    </View>
                  ))}
                </View>
                {disclosureSections.filter(section => section.id !== "payment").map(section => (
                  <View key={section.id} style={[styles.section, { borderBottomColor: theme.border }]}>
                    <RateSectionHeading id={section.id} title={section.title} textColor={theme.textPrimary} iconColor={theme.dark ? "#CBD5E1" : "#475569"} />
                    {section.facts.map((fact, index) => (
                      <View key={fact.label + ":" + index} style={[styles.factRow, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.factLabel, { color: theme.dark ? "#CBD5E1" : "#475569" }]}>{fact.label}</Text>
                        <Text style={[styles.factValue, { color: theme.dark ? "#E2E8F0" : "#1E293B" }]}>{fact.value}</Text>
                      </View>
                    ))}
                  </View>
                ))}
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
  offerRows: { minWidth: 0, minHeight: 168 },
  moreSlot: { minHeight: 36, justifyContent: "center" },
  provider: { minHeight: 50, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  brand: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 4 },
  logo: { width: 16, height: 16, flexShrink: 0 },
  fallbackMark: { width: 16, height: 16, borderRadius: 3, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  fallbackLetter: { fontSize: 11, fontWeight: "700", color: "#07133B", fontFamily: appFonts.bold },
  providerName: { flexShrink: 1, minWidth: 0, fontSize: 11, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  infoAction: { width: 25, height: 40, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  price: { width: 67, flexShrink: 0, textAlign: "right", fontSize: 12, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold, fontVariant: ["tabular-nums"] },
  perDay: { fontSize: 10, lineHeight: 14, fontWeight: "400", fontFamily: appFonts.regular },
  action: { width: 78, minHeight: 36, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#004BB8", paddingHorizontal: 5 },
  actionDisabled: { opacity: 0.4 },
  actionPressed: { backgroundColor: "#003B91" },
  link: { fontSize: 12, lineHeight: 16, color: "#FFFFFF", fontWeight: "600", fontFamily: appFonts.semibold },
  moreAction: { minHeight: 36, paddingLeft: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  moreText: { fontSize: 11, lineHeight: 16, color: "#004BB8", fontWeight: "600", fontFamily: appFonts.semibold },
  sheetScreen: { flex: 1, paddingHorizontal: 18 },
  sheetScroll: { flex: 1, minHeight: 0 },
  sheetHeader: { borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingBottom: 14 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  sheetHeadingSpacer: { width: 44, height: 44 },
  sheetTitle: { flex: 1, minWidth: 0, textAlign: "center", fontSize: 18, lineHeight: 23, fontWeight: "700", fontFamily: appFonts.bold },
  seller: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetBody: { paddingTop: 16, paddingBottom: 24 },
  sheetPrice: { fontSize: 22, fontWeight: "700", fontFamily: appFonts.bold, fontVariant: ["tabular-nums"], lineHeight: 28 },
  sheetPerDay: { fontSize: 12, fontWeight: "500", fontFamily: appFonts.medium },
  sheetTotal: { marginTop: 4, fontSize: 14, lineHeight: 20, fontWeight: "500", fontFamily: appFonts.medium },
  sheetTotalAmount: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold, fontVariant: ["tabular-nums"] },
  sheetPayment: { marginTop: 4, marginBottom: 12, fontSize: 12, lineHeight: 18, fontFamily: appFonts.medium },
  paymentSection: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 16 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 16, paddingBottom: 12, gap: 0 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  sectionTitle: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 21, letterSpacing: -0.18, fontWeight: "600", fontFamily: appFonts.semibold },
  factRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, minWidth: 0, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  factLabel: { width: "42%", minWidth: 0, flexShrink: 1, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  factValue: { flex: 1, minWidth: 0, textAlign: "right", fontSize: 13, lineHeight: 19, fontWeight: "500", fontFamily: appFonts.medium },
});
