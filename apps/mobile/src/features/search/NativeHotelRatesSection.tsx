import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Info } from "lucide-react-native";
import type { PublicHotelProviderDetails } from "../../../../../src/lib/hotels/hotelProviderDetails";
import type { PublicHotelResult } from "../../../../../src/lib/types";
import { hotelSupplierFacts } from "../../../../../src/lib/hotels/hotelSupplierFacts";
import type { ExchangeRates } from "../currency/displayCurrency";
import { appFonts } from "../../theme/typography";
import { createHotelDisplayPrices } from "./hotelDetailCurrency";
import type { NativeHotelOffer } from "./nativeHotelDetailsModel";
import { nativeHotelProviderUrl } from "./nativeHotelDetailsModel";
import { ProviderLogo } from "./ProviderLogo";

type Theme = {
  dark: boolean;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
};

type DisplayPrice = { formatted: string; accessibilityLabel: string } | null;
type DetailsStatus = "loading" | "ready" | "error";

export type NativeHotelRateRow = {
  id: string;
  offerId: string;
  providerKind: "kurioticket" | "provider";
  providerName: string;
  providerLogoUrl: string | null;
  totalPrice: string;
  totalAccessibilityLabel: string;
  totalLabel: string;
  actionable: boolean;
  roomName: string | null;
  cancellationLabel: string | null;
  paymentLabel: string | null;
  rateFacts: Array<{ label: string; value: string }>;
  sourceCurrency: string | null;
};

type PropertyRateOffer = {
  hotel: PublicHotelResult;
  providerDetails: PublicHotelProviderDetails | null;
};

/**
 * Each web provider offer is a distinct rate, even when seller names/prices
 * match. The provider's persisted offer ID determines its own View deal action.
 */
export function buildNativeHotelRateRows({
  offers,
  primaryHotel,
  propertyOffers,
  primaryProviderDetails,
  nightlyPrice,
  totalPrice,
  hasPrice,
  displayCurrency,
  exchangeRates,
}: {
  offers: NativeHotelOffer[];
  primaryHotel: PublicHotelResult;
  propertyOffers?: PropertyRateOffer[] | null;
  primaryProviderDetails?: PublicHotelProviderDetails | null;
  nightlyPrice: DisplayPrice;
  totalPrice: DisplayPrice;
  hasPrice: boolean;
  displayCurrency: string;
  exchangeRates: ExchangeRates;
}): NativeHotelRateRow[] {
  const rows: NativeHotelRateRow[] = [];
  const internalOffer = offers.find(offer => offer.kind === "internal-room-flow");
  if (internalOffer) {
    rows.push({
      id: "internal-rooms",
      offerId: internalOffer.id,
      providerKind: "kurioticket",
      providerName: "Kurioticket",
      providerLogoUrl: null,
      totalPrice: hasPrice && totalPrice ? totalPrice.formatted : "Price unavailable",
      totalAccessibilityLabel: hasPrice && totalPrice ? totalPrice.accessibilityLabel : "Price unavailable",
      totalLabel: "Stay total",
      actionable: true,
      roomName: null,
      cancellationLabel: null,
      paymentLabel: null,
      rateFacts: [],
      sourceCurrency: hasPrice ? primaryHotel.currency : null,
    });
  }

  const providerEntries: PropertyRateOffer[] = propertyOffers?.length
    ? propertyOffers
    : [{ hotel: primaryHotel, providerDetails: primaryProviderDetails ?? null }];
  const seen = new Set<string>();
  for (const { hotel, providerDetails } of providerEntries) {
    if (!hotel.id || seen.has(hotel.id)) continue;
    seen.add(hotel.id);
    const amount = hotel.totalPrice;
    const perNight = hotel.pricePerNight;
    const currency = hotel.currency;
    if (!Number.isFinite(amount) || typeof amount !== "number" || amount < 0 ||
      !Number.isFinite(perNight) || typeof perNight !== "number" || perNight < 0 ||
      !currency || !/^[A-Z]{3}$/.test(currency)) continue;
    const prices = hotel.id === primaryHotel.id && hasPrice && totalPrice && nightlyPrice
      ? { total: totalPrice, nightly: nightlyPrice }
      : createHotelDisplayPrices(perNight, amount, currency, displayCurrency, exchangeRates);
    if (!prices.total) continue;
    const rate = providerDetails?.rate;
    const facts = hotelSupplierFacts(providerDetails).filter(fact =>
      /^(Room|Free cancellation|Pay later|Bundled rate|Rate breakdown|Rate condition)/.test(fact.label));
    rows.push({
      id: `provider:${hotel.id}`,
      offerId: hotel.id,
      providerKind: "provider",
      providerName: hotel.bookingProviderName?.trim() || hotel.provider,
      providerLogoUrl: hotel.providerLogoUrl?.trim() || null,
      totalPrice: prices.total.formatted,
      totalAccessibilityLabel: prices.total.accessibilityLabel,
      totalLabel: "Stay total",
      actionable: Boolean(nativeHotelProviderUrl(hotel.partnerRedirectUrl, hotel.bookingUrl)),
      roomName: rate?.roomName || hotel.roomType || null,
      cancellationLabel: rate?.freeCancellation === undefined ? null
        : rate.freeCancellation ? "Free cancellation" : "Cancellation conditions apply",
      paymentLabel: rate?.payLater === undefined ? null
        : rate.payLater ? "Pay later" : "Pay later not offered",
      rateFacts: facts,
      sourceCurrency: currency,
    });
  }
  return rows;
}

function HotelRateProviderBrand({ row, theme }: { row: NativeHotelRateRow; theme: Theme }) {
  if (row.providerKind === "kurioticket") {
    return <Image accessible accessibilityLabel="Kurioticket logo"
      source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
      resizeMode="contain" style={s.kurioticketProviderLogo} />;
  }
  if (row.providerLogoUrl) {
    return <View style={s.providerLogoTile}>
      <ProviderLogo provider={row.providerName} logoUrl={row.providerLogoUrl} />
    </View>;
  }
  return <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
    style={[s.dealProvider, { color: theme.textPrimary }]}>{row.providerName}</Text>;
}

export function NativeHotelRatesSection({
  rows,
  onViewDeal,
  pendingRateId,
  stayDateText,
  nightText,
  detailsStatus,
  theme,
  accentColor,
}: {
  rows: NativeHotelRateRow[];
  onViewDeal: (rateId: string) => void;
  pendingRateId: string | null;
  stayDateText: string | null;
  nightText: string | null;
  detailsStatus: DetailsStatus;
  theme: Theme;
  accentColor: string;
}) {
  const [expandedRateId, setExpandedRateId] = useState<string | null>(null);
  if (detailsStatus === "loading") return null;

  return <View style={s.section}>
    {stayDateText || nightText ? (
      <Text style={[s.stay, { color: theme.textSecondary }]}>
        {[stayDateText, nightText].filter(Boolean).join(" · ")}
      </Text>
    ) : null}

    {!rows.length ? <View style={[s.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No reservable rates available</Text>
      <Text style={[s.emptyCopy, { color: theme.textSecondary }]}>Try updating your stay or check again later.</Text>
    </View> : null}

    <View accessibilityLabel="Hotel rates" style={s.dealList}>
      {rows.map(row => {
        const pending = pendingRateId === row.id;
        const expanded = expandedRateId === row.id;
        const infoAvailable = Boolean(row.roomName || row.rateFacts.length || row.cancellationLabel || row.paymentLabel);
        return <View key={row.id} style={[s.dealCard, {
          backgroundColor: theme.surface,
          borderColor: theme.dark ? theme.border : "#D9E2E8",
        }]}>
          <View style={s.dealMain}>
            <View style={s.providerColumn}>
              <View style={s.providerRow}>
                <View style={s.brandContainer}>
                  <HotelRateProviderBrand row={row} theme={theme} />
                </View>
                {infoAvailable ? <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rate details for ${row.roomName || row.providerName}`}
                  accessibilityState={{ expanded }}
                  onPress={() => setExpandedRateId(expanded ? null : row.id)}
                  hitSlop={8}
                  style={s.infoButton}
                ><Info size={18} strokeWidth={1.7} color={theme.textSecondary} /></Pressable> : null}
              </View>
            </View>
            <View style={s.priceColumn}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}
                accessibilityLabel={`Stay total: ${row.totalAccessibilityLabel}`}
                style={[s.dealPrice, { color: theme.textPrimary }]}>{row.totalPrice}</Text>
              <Text numberOfLines={1} style={[s.dealPriceLabel, { color: theme.textSecondary }]}>{row.totalLabel}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View deal with ${row.providerName}, ${row.totalAccessibilityLabel}`}
              accessibilityState={{ disabled: !row.actionable || pendingRateId !== null, busy: pending }}
              disabled={!row.actionable || pendingRateId !== null}
              onPress={() => onViewDeal(row.id)}
              style={({ pressed }) => [s.viewDealButton, { backgroundColor: accentColor },
                (!row.actionable || pendingRateId !== null) && s.disabledButton,
                pressed && s.pressedButton]}
            ><Text style={s.viewDealText}>{pending ? "Opening…" : "View deal"}</Text></Pressable>
          </View>
          {expanded && infoAvailable ? <View style={[s.rateDetails, { borderTopColor: theme.border }]}>
            <Text style={[s.rateHeading, { color: theme.textPrimary }]}>Rate details</Text>
            <Text style={[s.rateSupplier, { color: theme.textPrimary }]}>{row.providerName}</Text>
            {row.roomName ? <Text style={[s.rateBody, { color: theme.textSecondary }]}>{row.roomName}</Text> : null}
            {row.cancellationLabel || row.paymentLabel ? <View style={s.rateFacts}>
              <Text style={[s.rateHeading, { color: theme.textPrimary }]}>Booking conditions</Text>
              {row.cancellationLabel ? <Text style={[s.rateBody, { color: theme.textSecondary }]}>{row.cancellationLabel}</Text> : null}
              {row.paymentLabel ? <Text style={[s.rateBody, { color: theme.textSecondary }]}>{row.paymentLabel}</Text> : null}
            </View> : null}
            {row.rateFacts.length ? <View style={s.rateFacts}>
              <Text style={[s.rateHeading, { color: theme.textPrimary }]}>Supplier rate information</Text>
              {row.rateFacts.map((fact, index) => <View key={`${fact.label}-${index}`} style={s.factRow}>
                <Text style={[s.factLabel, { color: theme.textSecondary }]}>{fact.label}</Text>
                <Text selectable style={[s.factValue, { color: theme.textPrimary }]}>{fact.value}</Text>
              </View>)}
              {row.sourceCurrency ? <Text style={[s.rateNote, { color: theme.textSecondary }]}>Supplier figures may be in {row.sourceCurrency}.</Text> : null}
            </View> : null}
            <View style={[s.totalRow, { backgroundColor: theme.dark ? theme.border : "#F3F5F9" }]}>
              <Text style={[s.rateBody, { color: theme.textPrimary }]}>Stay total</Text>
              <Text style={[s.rateHeading, { color: theme.textPrimary }]}>{row.totalPrice}</Text>
            </View>
          </View> : null}
        </View>;
      })}
    </View>
  </View>;
}

const s = StyleSheet.create({
  section: { paddingBottom: 18 },
  stay: { fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  dealList: { gap: 10, paddingTop: 12, paddingBottom: 12 },
  dealCard: { minHeight: 84, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, justifyContent: "center" },
  dealMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  providerColumn: { flex: 1, minWidth: 90, maxWidth: "36%" },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  brandContainer: { flex: 1, minWidth: 0, justifyContent: "center" },
  kurioticketProviderLogo: { width: 100, maxWidth: "100%", height: 25 },
  providerLogoTile: { width: 30, height: 27, justifyContent: "center" },
  dealProvider: { fontSize: 12, lineHeight: 17, fontWeight: "600", fontFamily: appFonts.semibold },
  infoButton: { width: 23, height: 28, alignItems: "center", justifyContent: "center" },
  priceColumn: { alignItems: "center", flexShrink: 1, minWidth: 75, maxWidth: "38%" },
  dealPrice: { fontSize: 13, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold, fontVariant: ["tabular-nums"] },
  dealPriceLabel: { fontSize: 10, lineHeight: 15, fontWeight: "400", fontFamily: appFonts.regular },
  viewDealButton: { minHeight: 38, minWidth: 82, paddingHorizontal: 8, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  viewDealText: { fontSize: 12, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold, color: "#FFFFFF" },
  pressedButton: { opacity: 0.83 },
  disabledButton: { opacity: 0.45 },
  rateDetails: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, marginTop: 12, gap: 7 },
  rateHeading: { fontSize: 14, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
  rateSupplier: { fontSize: 13, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold },
  rateBody: { fontSize: 13, lineHeight: 19, fontFamily: appFonts.regular },
  rateFacts: { gap: 6, marginTop: 5 },
  factRow: { flexDirection: "row", justifyContent: "space-between", gap: 15 },
  factLabel: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: appFonts.regular },
  factValue: { flex: 1, textAlign: "right", fontSize: 12, lineHeight: 18, fontFamily: appFonts.medium },
  rateNote: { fontSize: 11, lineHeight: 17, fontFamily: appFonts.regular },
  totalRow: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 5, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  emptyCard: { minHeight: 108, justifyContent: "center", borderWidth: 1, borderRadius: 14, padding: 16 },
  emptyTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700", fontFamily: appFonts.bold },
  emptyCopy: { marginTop: 5, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
});
