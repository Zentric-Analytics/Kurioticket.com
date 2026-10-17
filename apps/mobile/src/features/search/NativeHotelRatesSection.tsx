import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Info, X } from "lucide-react-native";
import type { PublicHotelProviderDetails } from "../../../../../src/lib/hotels/hotelProviderDetails";
import type { PublicHotelResult } from "../../../../../src/lib/types";
import { hotelSupplierFacts } from "../../../../../src/lib/hotels/hotelSupplierFacts";
import type { ExchangeRates } from "../currency/displayCurrency";
import { appFonts } from "../../theme/typography";
import { createHotelDisplayPrices } from "./hotelDetailCurrency";
import type { NativeHotelOffer } from "./nativeHotelDetailsModel";
import { nativeHotelProviderUrl } from "./nativeHotelDetailsModel";
import { ProviderLogo } from "./ProviderLogo";
import { placeHotelRatePopover, type HotelRateInfoAnchor } from "./nativeHotelRatePopoverPlacement";

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
      sourceCurrency: hasPrice ? (primaryHotel.currency ?? null) : null,
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
    // Room and booking conditions already have dedicated sections in the expanded card.
    // Only include the remaining provider-specific pricing/rate conditions here.
    const facts = hotelSupplierFacts(providerDetails).filter(fact =>
      /^(Bundled rate|Rate breakdown|Rate condition)/.test(fact.label));
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
  onRateInfo,
  stayDateText,
  nightText,
  detailsStatus,
  theme,
  accentColor,
}: {
  rows: NativeHotelRateRow[];
  onViewDeal: (rateId: string) => void;
  onRateInfo: (row: NativeHotelRateRow, anchor: HotelRateInfoAnchor) => void;
  stayDateText: string | null;
  nightText: string | null;
  detailsStatus: DetailsStatus;
  theme: Theme;
  accentColor: string;
}) {
  const { width } = useWindowDimensions();
  const narrow = width < 350;
  const infoRefs = useRef<Map<string, View>>(new Map());
  const openRateInfo = (row: NativeHotelRateRow) => {
    infoRefs.current.get(row.id)?.measureInWindow((x, y, anchorWidth, anchorHeight) => {
      onRateInfo(row, { x, y, width: anchorWidth, height: anchorHeight });
    });
  };
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
        return <View key={row.id} style={[s.dealCard, narrow && s.narrowCard, {
          backgroundColor: theme.surface,
          borderColor: theme.dark ? theme.border : "#D9E2E8",
        }]}>
          <View style={s.dealMain}>
            <View style={s.providerColumn}>
              <View style={s.providerRow}>
                <View style={s.brandContainer}>
                  <HotelRateProviderBrand row={row} theme={theme} />
                </View>
                <Pressable
                  ref={element => {
                    if (element) infoRefs.current.set(row.id, element);
                    else infoRefs.current.delete(row.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate details for ${row.roomName || row.providerName}`}
                  onPress={() => openRateInfo(row)}
                  hitSlop={8}
                  style={s.infoButton}
                ><Info size={narrow ? 16 : 18} strokeWidth={1.6} color={theme.textSecondary} /></Pressable>
              </View>
            </View>
            <View style={s.priceColumn}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
                accessibilityLabel={`Stay total: ${row.totalAccessibilityLabel}`}
                style={[s.dealPrice, narrow && s.narrowPrice, { color: theme.textPrimary }]}>{row.totalPrice}</Text>
              <Text numberOfLines={1} style={[s.dealPriceLabel, narrow && s.narrowPriceLabel, { color: theme.textSecondary }]}>{row.totalLabel}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View deal with ${row.providerName}, ${row.totalAccessibilityLabel}`}
              accessibilityState={{ disabled: !row.actionable }}
              disabled={!row.actionable}
              onPress={() => onViewDeal(row.id)}
              style={({ pressed }) => [s.viewDealButton, narrow && s.narrowButton, { backgroundColor: accentColor },
                !row.actionable && s.disabledButton,
                pressed && s.pressedButton]}
            ><Text style={[s.viewDealText, narrow && s.narrowButtonText]}>View deal</Text></Pressable>
          </View>

        </View>;
      })}
    </View>
  </View>;
}

export function NativeHotelRatePopover({
  row, anchor, viewport, theme, onClose, onBoundsChange,
}: {
  row: NativeHotelRateRow;
  anchor: HotelRateInfoAnchor;
  viewport: { width: number; height: number };
  theme: Theme;
  onClose: () => void;
  onBoundsChange: (bounds: { left: number; top: number; width: number; height: number }) => void;
}) {
  const [measuredHeight, setMeasuredHeight] = useState(440);
  const placement = placeHotelRatePopover(anchor, viewport, measuredHeight);
  // Render within Hotel Details' own root, not in a native Modal. Transparent
  // surroundings let the underlying ScrollView keep its touch gestures.
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View accessibilityLabel="Rate details" style={[s.popup, {
        left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.maxHeight,
        backgroundColor: theme.surface, borderColor: theme.border,
      }]} onLayout={event => {
        const layout = event.nativeEvent.layout;
        onBoundsChange({ left: layout.x, top: layout.y, width: layout.width, height: layout.height });
        if (Math.abs(layout.height - measuredHeight) > 1) setMeasuredHeight(layout.height);
      }}>
        <View pointerEvents="none" style={[s.popupPointer, placement.pointerSide === "left"
          ? { left: -6, borderBottomWidth: 1, borderLeftWidth: 1 }
          : { right: -6, borderTopWidth: 1, borderRightWidth: 1 },
          { top: placement.pointerTop, backgroundColor: theme.surface, borderColor: theme.border }]} />
        <ScrollView style={s.popupScroll} contentContainerStyle={s.popupContent} showsVerticalScrollIndicator nestedScrollEnabled>
          <View style={s.popupHeader}>
            <Text accessibilityRole="header" style={[s.popupTitle, { color: theme.textPrimary }]}>Rate details</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close Rate details" onPress={onClose} hitSlop={8} style={s.popupClose}>
              <X size={18} color={theme.textSecondary} strokeWidth={1.8} />
            </Pressable>
          </View>
          <Text style={[s.popupProvider, { color: theme.textPrimary }]}>{row.providerName}</Text>
          <Text style={[s.popupRoom, { color: theme.textSecondary }]}>{row.roomName || "Room description not supplied"}</Text>
          {(row.cancellationLabel || row.paymentLabel) ? <View style={s.popupSection}>
            <Text style={[s.popupHeading, { color: theme.textPrimary }]}>Booking conditions</Text>
            {row.cancellationLabel ? <View style={s.factRow}><Text style={[s.factLabel, { color: theme.textSecondary }]}>Cancellation</Text><Text style={[s.factValue, { color: theme.textPrimary }]}>{row.cancellationLabel}</Text></View> : null}
            {row.paymentLabel ? <View style={s.factRow}><Text style={[s.factLabel, { color: theme.textSecondary }]}>Payment</Text><Text style={[s.factValue, { color: theme.textPrimary }]}>{row.paymentLabel}</Text></View> : null}
          </View> : null}
          {row.rateFacts.length ? <View style={s.popupSection}>
            <Text style={[s.popupHeading, { color: theme.textPrimary }]}>Price details</Text>
            {row.rateFacts.map((fact, index) => <View key={`${fact.label}-${index}`} style={s.factRow}>
              <Text style={[s.factLabel, { color: theme.textSecondary }]}>{fact.label.replace(/^Rate breakdown · /, "")}</Text>
              <Text selectable style={[s.factValue, { color: theme.textPrimary }]}>{fact.value}</Text>
            </View>)}
            {row.sourceCurrency ? <Text style={[s.rateNote, { color: theme.textSecondary }]}>Supplier figures may be in {row.sourceCurrency}.</Text> : null}
          </View> : null}
          <View style={[s.totalRow, { backgroundColor: theme.dark ? theme.border : "#F2F4F8" }]}>
            <Text style={[s.rateBody, { color: theme.textPrimary }]}>Stay total</Text>
            <Text style={[s.rateHeading, { color: theme.textPrimary }]}>{row.totalPrice}</Text>
          </View>
        </ScrollView>
      </View>
  </View>;
}

const s = StyleSheet.create({
  popupRoot: { flex: 1 },
  popup: { position: "absolute", borderWidth: 1, borderRadius: 14, overflow: "visible", shadowColor: "#192024", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  popupPointer: { position: "absolute", width: 10, height: 10, transform: [{ rotate: "45deg" }], borderColor: "#E1E6EB", zIndex: 1 },
  popupScroll: { borderRadius: 14, flexGrow: 0 },
  popupContent: { padding: 14, gap: 7 },
  popupHeader: { minHeight: 22, flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 3 },
  popupTitle: { fontSize: 14, fontWeight: "600", fontFamily: appFonts.semibold },
  popupClose: { position: "absolute", right: 0, top: -3, width: 28, height: 28, justifyContent: "center", alignItems: "center" },
  popupProvider: { fontSize: 12, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold },
  popupRoom: { fontSize: 12, lineHeight: 18, fontFamily: appFonts.regular },
  popupSection: { gap: 5, marginTop: 12 },
  popupHeading: { fontSize: 12, lineHeight: 18, fontFamily: appFonts.semibold, fontWeight: "600", marginBottom: 1 },
  section: { paddingBottom: 18 },
  stay: { fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  dealList: { gap: 8, paddingTop: 2, paddingBottom: 6 },
  dealCard: { minHeight: 76, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, justifyContent: "center" },
  narrowCard: { paddingHorizontal: 8 },
  dealMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  providerColumn: { flexShrink: 1, minWidth: 0, maxWidth: "36%" },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  brandContainer: { flexShrink: 1, minWidth: 0, justifyContent: "center" },
  kurioticketProviderLogo: { width: 64, maxWidth: "100%", height: 25 },
  providerLogoTile: { width: 30, height: 27, justifyContent: "center" },
  dealProvider: { fontSize: 11, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  infoButton: { width: 20, height: 22, alignItems: "center", justifyContent: "center" },
  priceColumn: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 3, flexShrink: 1, minWidth: 0 },
  dealPrice: { fontSize: 13, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold, fontVariant: ["tabular-nums"], flexShrink: 1 },
  narrowPrice: { fontSize: 10, lineHeight: 16 },
  dealPriceLabel: { fontSize: 10, lineHeight: 16, fontWeight: "400", fontFamily: appFonts.regular },
  narrowPriceLabel: { fontSize: 9, lineHeight: 16 },
  viewDealButton: { minHeight: 32, minWidth: 76, paddingHorizontal: 6, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  narrowButton: { minWidth: 68, paddingHorizontal: 4 },
  viewDealText: { fontSize: 12, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold, color: "#FFFFFF" },
  narrowButtonText: { fontSize: 11, lineHeight: 17 },
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
