import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { travelApi, type FlightResult, type HotelResult } from "../../api/travelApi";
import { FlowIcon } from "../flow/FlowIcon";
import { Badge, Button, TopBar, clock, money, shortDate, ui } from "./SearchUi";
import { visualFlights, visualHotels } from "./visualFixtures";
import { airports } from "../flow/airportData";
import { useAppTheme } from "../../theme/AppTheme";
import { AirlineLogo } from "./AirlineLogo";
import { readCurrencyPreference } from "../../storage/preferenceStorage";
import {
  resolveDisplayCurrencyContext,
  type DisplayCurrencyResolution,
  type DisplayPrice,
  type ExchangeRates,
} from "../currency/displayCurrency";
import { canReuseFlightDetailFare, createFlightDetailFare } from "./flightDetailCurrency";

const parse = <T,>(v?: string | string[]) => {
  try {
    return JSON.parse(Array.isArray(v) ? v[0] : v || "") as T;
  } catch {
    return undefined;
  }
};
const airportLabel = (code: string) => {
  const airport = airports.find((item) => item.code === code);
  return airport ? `${airport.city} (${code})` : code;
};
export function ApprovedDetailScreen({
  product,
}: {
  product: "flight" | "hotel";
}) {
  const { theme } = useAppTheme();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const visualTest =
    process.env.EXPO_PUBLIC_VISUAL_TEST === "1" && params.visual === "1";
  const value =
    parse<FlightResult | HotelResult>(params.result) ??
    (visualTest
      ? product === "flight"
        ? visualFlights[0]
        : visualHotels[0]
      : undefined);
  if (!value)
    return (
      <SafeAreaView style={[d.safe, { backgroundColor: theme.background }]}>
        <TopBar
          detail
          onPriceAlertPress={product === "flight" ? () => router.push("/price-alerts") : undefined}
        />
        <View style={d.missing}>
          <Text style={[d.h2, { color: theme.textPrimary }]}>This offer is no longer available</Text>
          <Text style={[d.meta, { color: theme.textSecondary }]}>Return to results and refresh the search.</Text>
          <Button label="Back to results" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  return product === "flight" ? (
    <FlightDetail result={value as FlightResult} params={params} />
  ) : (
    <HotelDetail result={value as HotelResult} params={params} />
  );
}
function FlightDetail({ result, params }: { result: FlightResult; params: Record<string, string | string[]> }) {
  const inset = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const passedFare = parse<DisplayPrice>(params.displayFare);
  const parsedDisplayCurrencyContext = parse<DisplayCurrencyResolution>(params.displayCurrencyContext);
  const passedDisplayCurrencyContext = typeof parsedDisplayCurrencyContext?.resolvedCurrency === "string"
    ? parsedDisplayCurrencyContext
    : undefined;
  const contextMatchesPassedFare = !passedDisplayCurrencyContext
    || passedDisplayCurrencyContext.resolvedCurrency.toUpperCase() === passedFare?.currency.toUpperCase();
  const initiallyValidPassedFare = canReuseFlightDetailFare({
    passedFare,
    providerAmount: result.price,
    providerCurrency: result.currency,
  }) && contextMatchesPassedFare ? passedFare! : null;
  const [fare, setFare] = useState<DisplayPrice | null>(initiallyValidPassedFare);
  const currencyRatesRef = useRef<ExchangeRates | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    void readCurrencyPreference().catch(() => null).then(async (preferredCurrency) => {
      if (!active) return;
      if (contextMatchesPassedFare && canReuseFlightDetailFare({
        passedFare,
        providerAmount: result.price,
        providerCurrency: result.currency,
        preferredCurrency,
      })) {
        setFare(passedFare!);
        return;
      }

      // A changed explicit preference invalidates the snapshot immediately.
      // Never show the provider currency while the requested conversion loads.
      setFare(null);
      const [location, rates] = await Promise.all([
        passedFare || preferredCurrency
          ? Promise.resolve(null)
          : travelApi.location().catch(() => null),
        currencyRatesRef.current
          ? Promise.resolve(currencyRatesRef.current)
          : travelApi.currencyRates().then((payload) => payload.rates).catch(() => ({})),
      ]);
      if (!active) return;
      const resolution = resolveDisplayCurrencyContext({
        preferredCurrency,
        ipCountryCode: location?.countryCode,
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
      });
      if (Object.keys(rates).length) currencyRatesRef.current = rates;
      setFare(createFlightDetailFare(
        result.price,
        result.currency,
        resolution.resolvedCurrency,
        rates,
      ));
    });
    return () => { active = false; };
  }, [contextMatchesPassedFare, passedDisplayCurrencyContext?.resolvedCurrency,
    passedFare?.amount, passedFare?.currency, passedFare?.providerAmount,
    passedFare?.providerCurrency, result.currency, result.id, result.price]));
  const formattedFare = fare?.formatted ?? "—";
  const legs = result.legs?.length
    ? result.legs
    : [
        {
          direction: "outbound" as const,
          originAirport: result.originAirport,
          destinationAirport: result.destinationAirport,
          departureTime: result.departureTime,
          arrivalTime: result.arrivalTime,
          duration: result.duration,
          durationMinutes: result.durationMinutes,
          stops: result.stops,
          layovers: result.layovers,
          segments: [],
        },
      ];
  const provider = result.provider || result.airlineName;
  const go = async () => {
    const url = result.partnerRedirectUrl || result.bookingUrl;
    if (!/^https:\/\//.test(url))
      return Alert.alert(
        "Offer unavailable",
        "The provider did not return a valid booking link.",
      );
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Unable to open provider",
        "Please refresh the search and try again.",
      );
    }
  };
  return (
    <SafeAreaView style={[d.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <TopBar detail onPriceAlertPress={() => router.push("/price-alerts")} />
      <View style={d.routeRow}>
        <View style={d.routeCopy}>
          <Text style={[d.route, { color: theme.textPrimary }]}>
            {airportLabel(result.originAirport)} ⇄ {airportLabel(result.destinationAirport)}
          </Text>
          <Text style={[d.meta, { color: theme.textSecondary }]}>
            {params.departureDate
              ? `${shortDate(String(params.departureDate))} – ${shortDate(String(params.returnDate || ""))} · `
              : ""}
            {params.travelers || params.adults || 1} Traveler · {result.cabinClass.replace(/-/g, " ")}
          </Text>
        </View>
        <Button label="Edit search" outline flightResults onPress={() => router.back()} />
      </View>
      {/free|refund/i.test(result.refundInfo) ? (
        <View style={[d.reassure, theme.dark && { backgroundColor: "#153B2B" }]}>
          <FlowIcon name="shield" color={theme.dark ? "#72D69A" : ui.green} />
          <View>
            <Text style={[d.green, theme.dark && { color: "#72D69A" }]}>{result.refundInfo}</Text>
            <Text style={[d.meta, { color: theme.textSecondary }]}>Book with confidence</Text>
          </View>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[d.body, { paddingBottom: 130 + inset.bottom }]}
      >
        <View style={[d.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={d.sectionHead}>
            <Text style={[d.h2, { color: theme.textPrimary }]}>Flight details</Text>
            <Badge flightResults>★ Best overall</Badge>
          </View>
          {legs.map((leg, i) => (
            <View key={`${leg.departureTime}-${i}`} style={[d.leg, { backgroundColor: theme.dark ? "#17243A" : theme.surface, borderColor: theme.border }]}>
              <Text style={d.blue}>
                {leg.direction.toUpperCase()} ·{" "}
                {new Date(leg.departureTime).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
              <View style={d.carrierRow}>
                <AirlineLogo
                  airlineName={result.airlineName}
                  logoUrl={result.airlineLogo}
                />
                <Text style={[d.provider, { color: theme.textPrimary }]}>
                  {result.airlineName}
                  {result.flightNumber ? `  ·  ${result.flightNumber}` : ""}
                </Text>
              </View>
              <View style={d.legRoute}>
        <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[d.time, { color: theme.textPrimary }]}>{clock(leg.departureTime)}</Text>
                  <Text style={[d.airport, { color: theme.textSecondary }]}>{leg.originAirport}</Text>
                </View>
                <View style={d.middle}>
                  <Text style={[d.meta, { color: theme.textSecondary }]}>{leg.duration}</Text>
                  <View style={[d.line, { backgroundColor: theme.border }]} />
                  <Text style={d.blue}>
                    {leg.stops
                      ? `${leg.stops} stop${leg.stops > 1 ? "s" : ""}`
                      : "Nonstop"}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={[d.time, { color: theme.textPrimary }]}>{clock(leg.arrivalTime)}</Text>
                  <Text style={[d.airport, { color: theme.textSecondary }]}>{leg.destinationAirport}</Text>
                </View>
              </View>
              {leg.layovers?.length ? (
                <Text style={[d.meta, { color: theme.textSecondary }]}>
                  {leg.layovers
                    .map((x) => `${x.airport} · ${x.duration}`)
                    .join("  ·  ")}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
        <View style={[d.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={d.fareHead}>
            <Text style={[d.h2, { color: theme.textPrimary }]}>Fare summary</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[d.meta, { color: theme.textSecondary }]}>Total (1 traveler)</Text>
              <Text style={[d.price, { color: theme.textPrimary }]}>
                {formattedFare}
              </Text>
              <Text style={[d.meta, { color: theme.textSecondary }]}>Taxes and fees per provider</Text>
            </View>
          </View>
          <FareRow
            label="Carry-on bag"
            value={result.baggageInfo || "Information unavailable"}
          />
          <FareRow label="Checked bag" value="Provider information unavailable" />
          <FareRow label="Seat selection" value="Provider information unavailable" />
          <FareRow label="Changes" value="Provider fare rules apply" />
          <FareRow
            label="Cancellation"
            value={result.refundInfo || "Provider rules apply"}
          />
        </View>
        <View style={[d.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[d.h2, { color: theme.textPrimary }]}>Choose where to book</Text>
          <Text style={[d.meta, { color: theme.textSecondary }]}>
            Prices are per person and include taxes & fees when reported
          </Text>
          <Offer
            provider={provider}
            kind={
              provider === result.airlineName
                ? "Airline direct"
                : "Travel provider"
            }
            price={formattedFare}
            selected
          />
          <Text style={[d.disclosure, { color: theme.textSecondary }]}>
            Only the authoritative offer returned for this search is shown.
          </Text>
        </View>
      </ScrollView>
      <View style={[d.sticky, { paddingBottom: Math.max(inset.bottom, 10), backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <View style={d.stickyTotal}>
          <Text style={[d.meta, { color: theme.textSecondary }]}>Total</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[d.price, { color: theme.textPrimary }]}>{formattedFare}</Text>
          <Text style={[d.meta, { color: theme.textSecondary }]}>Round trip</Text>
        </View>
        <View style={d.stickyCta}>
          <Button label={`Continue to ${provider}`} onPress={() => void go()} />
          <Text style={[d.redirect, { color: theme.textSecondary }]}>You’ll be redirected to {provider}’s site</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
function HotelDetail({
  result,
  params,
}: {
  result: HotelResult;
  params: Record<string, string | string[]>;
}) {
  const inset = useSafeAreaInsets();
  const compact = useWindowDimensions().width < 430;
  const images = result.imageUrls?.length
    ? result.imageUrls
    : result.imageUrl
      ? [result.imageUrl]
      : [];
  const [selectedRoom, setSelectedRoom] = useState(true);
  const redirectUrl = result.partnerRedirectUrl || result.bookingUrl;
  const bookable = result.searchPolicy.bookable && Boolean(redirectUrl);
  const nights = (() => {
    const a = new Date(`${String(params.checkIn || "")}T12:00:00`),
      b = new Date(`${String(params.checkOut || "")}T12:00:00`);
    const n = (+b - +a) / 86400000;
    return Number.isFinite(n) && n > 0 ? n : undefined;
  })();
  const go = async () => {
    if (!bookable || !redirectUrl)
      return Alert.alert(
        "Planning inventory",
        "This property does not currently include a live provider booking offer.",
      );
    try {
      await Linking.openURL(redirectUrl);
    } catch {
      Alert.alert("Unable to open provider", "Please refresh and try again.");
    }
  };
  return (
    <SafeAreaView style={d.safe} edges={[]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + inset.bottom }}>
        <View style={d.gallery}>
          {images[0] ? (
            <Image source={{ uri: images[0] }} style={d.hero} />
          ) : (
            <View style={d.hero} />
          )}
          <View style={d.thumbs}>
            {[images[1], images[2]].map((x, i) =>
              x ? (
                <Image key={x} source={{ uri: x }} style={d.thumb} />
              ) : (
                <View key={i} style={d.thumb} />
              ),
            )}
          </View>
          <Pressable
            onPress={() => router.back()}
            style={[d.floating, { left: 16 }]}
          >
            <FlowIcon name="back" />
          </Pressable>
          <View style={[d.floating, { right: 64 }]}>
            <FlowIcon name="heart" />
          </View>
          <View style={[d.floating, { right: 14 }]}>
            <FlowIcon name="share" />
          </View>
          <Text style={d.count}>▧ 1 / {images.length || 1}</Text>
          {images.length > 3 ? (
            <Text style={d.more}>+{images.length - 3}</Text>
          ) : null}
        </View>
        <View style={d.hotelSummary}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={d.hotelName}>{result.name}</Text>
            <Text style={d.stars}>
              {"★".repeat(
                result.classificationStars || Math.round(result.rating),
              )}{" "}
              <Text style={d.meta}>
                {" "}
                · {result.neighbourhood || result.location}
              </Text>
            </Text>
            <Text style={d.provider}>
              <Text style={d.score}>
                {(result.reviewScore ?? result.rating).toFixed(1)}
              </Text>{" "}
              {result.reviewCount
                ? `${result.reviewCount.toLocaleString()} reviews`
                : "Reviews unavailable"}
            </Text>
            {result.distanceFromCenter ? (
              <Text style={d.meta}>
                ⌾ {result.distanceFromCenter} from city center
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={d.price}>
              {money(result.currency, result.pricePerNight)}
              <Text style={d.meta}> /night</Text>
            </Text>
            <Text style={d.meta}>
              {money(result.currency, result.totalPrice)} total
            </Text>
            <Text style={d.meta}>
              {nights ? `${nights} nights, ` : ""}${String(params.guests || 2)}{" "}
              guests
            </Text>
          </View>
        </View>
        <View style={d.stay}>
          <Text style={d.stayItem}>
            ▣ {shortDate(String(params.checkIn || ""))} –{" "}
            {shortDate(String(params.checkOut || ""))}
            {nights ? `\n${nights} nights` : ""}
          </Text>
          <Text style={d.stayItem}>
            ▤ {params.rooms || 1} Room{"\n"}
            {result.roomType || "Room type unavailable"}
          </Text>
          <Text style={d.stayItem}>♙ {params.guests || 2} Guests</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={d.amenityStrip}
        >
          {result.amenities.map((a) => (
            <View key={a} style={d.amenity}>
              <FlowIcon name="check" size={18} color={ui.green} />
              <Text style={d.amenityText}>{a}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={[d.detailBody, compact && d.detailBodyCompact]}>
          <Text style={d.h2}>Choose your room</Text>
          <Text style={d.meta}>
            Prices are per night, including taxes and fees when reported
          </Text>
          <Pressable
            onPress={() => setSelectedRoom(true)}
            style={[d.room, selectedRoom && { borderColor: ui.blue }]}
          >
            {result.imageUrl ? (
              <Image source={{ uri: result.imageUrl }} style={[d.roomImage, compact && d.roomImageCompact]} />
            ) : null}
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <Text style={d.provider}>{result.roomType || "Room option"}</Text>
              <Text style={d.meta}>
                {result.cancellationInfo || "Cancellation terms unavailable"}
              </Text>
              <Text style={d.green}>
                {result.amenities.slice(0, 2).join(" · ")}
              </Text>
            </View>
            <View style={{ width: compact ? 106 : 126, flexShrink: 0, alignItems: "flex-end" }}>
              <Text style={d.price}>
                {money(result.currency, result.pricePerNight)}
              </Text>
              <Text style={d.meta}>
                {money(result.currency, result.totalPrice)} total
              </Text>
              <Button label="Select room" outline={!selectedRoom} />
            </View>
          </Pressable>
          <View style={d.section}>
            <Text style={d.h2}>Choose where to book</Text>
            <Text style={d.meta}>
              Total price including taxes and fees when reported
            </Text>
            <Offer
              provider={result.provider}
              kind={
                bookable
                  ? result.cancellationInfo
                  : "Planning inventory · no live checkout"
              }
              price={money(result.currency, result.totalPrice)}
              selected
            />
            <Text style={d.disclosure}>
              Only the provider offer returned by the current inventory source
              is shown.
            </Text>
          </View>
        </View>
      </ScrollView>
      <View
        style={[d.hotelSticky, { paddingBottom: Math.max(inset.bottom, 10) }]}
      >
        <View>
          <Text style={d.price}>
            {money(result.currency, result.totalPrice)}{" "}
            <Text style={d.meta}>total</Text>
          </Text>
          <Text style={d.meta}>
            {nights ? `${nights} nights, ` : ""}${params.guests || 2} guests
          </Text>
          <Text style={d.blue}>Price breakdown ⌄</Text>
        </View>
        <View>
          <Button
            disabled={!bookable}
            external
            label={
              bookable
                ? `Continue to ${result.provider}`
                : "Live booking unavailable"
            }
            onPress={() => void go()}
          />
          <Text style={d.redirect}>
            {bookable
              ? `You’ll be redirected to ${result.provider}.`
              : "No live provider redirect was supplied."}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
function FareRow({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[d.fareRow, { borderTopColor: theme.border }]}>
      <Text style={[d.provider, { color: theme.textPrimary }]}>{label}</Text>
      <Text style={[d.meta, { color: theme.textSecondary }]}>{value}</Text>
    </View>
  );
}
function Offer({
  provider,
  kind,
  price,
  selected,
}: {
  provider: string;
  kind: string;
  price: string;
  selected: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={[d.offer, { backgroundColor: theme.dark ? "#17243A" : theme.surface, borderColor: theme.border }, selected && { borderColor: ui.blue }]}>
      <View style={[d.providerLogo, theme.dark && { backgroundColor: "#142B55" }]}>
        <Text style={d.blue}>{provider.slice(0, 1)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[d.provider, { color: theme.textPrimary }]}>
          {provider}{" "}
          {selected ? <Text style={d.green}>★ Recommended</Text> : null}
        </Text>
        <Text style={[d.meta, { color: theme.textSecondary }]}>{kind}</Text>
      </View>
      <Text style={d.priceSmall}>{price}</Text>
      <Button label="Select" />
    </View>
  );
}
const d = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 30,
  },
  routeRow: {
    paddingHorizontal: 26,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeCopy: { flex: 1, minWidth: 0, marginRight: 8 },
  route: { fontSize: 21, fontWeight: "900", color: ui.navy, flexShrink: 1 },
  h2: { fontSize: 18, fontWeight: "900", color: ui.navy },
  meta: { fontSize: 11, color: ui.muted, lineHeight: 16 },
  reassure: {
    marginHorizontal: 22,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#EAF8F3",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  green: { fontSize: 11, color: ui.green, fontWeight: "700" },
  body: { padding: 20, gap: 12 },
  section: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 13,
    padding: 14,
    gap: 10,
    backgroundColor: "white",
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between" },
  leg: {
    borderWidth: 1,
    borderColor: "#E4E8F0",
    borderRadius: 11,
    padding: 14,
    gap: 9,
    shadowColor: "#07152F",
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  blue: { color: ui.blue, fontSize: 11, fontWeight: "800" },
  provider: { fontSize: 13, fontWeight: "800", color: ui.navy },
  carrierRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legRoute: { flexDirection: "row", alignItems: "center" },
  time: { fontSize: 19, fontWeight: "900", color: ui.navy },
  airport: { fontSize: 12, color: ui.muted },
  middle: { width: 120, alignItems: "center" },
  line: {
    height: 1,
    width: "100%",
    backgroundColor: ui.muted,
    marginVertical: 7,
  },
  fareHead: { flexDirection: "row", justifyContent: "space-between" },
  price: { fontSize: 24, fontWeight: "900", color: ui.navy },
  fareRow: {
    borderTopWidth: 1,
    borderTopColor: "#EDF0F4",
    paddingTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  offer: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 9,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  providerLogo: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#EEF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  priceSmall: { fontSize: 18, fontWeight: "900", color: ui.blue },
  disclosure: { fontSize: 10, color: ui.muted, textAlign: "center" },
  sticky: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 105,
    borderTopWidth: 1,
    borderTopColor: ui.border,
    backgroundColor: "white",
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  stickyTotal: { flexShrink: 1, minWidth: 92, maxWidth: "42%" },
  stickyCta: { flex: 1, minWidth: 0, maxWidth: 250 },
  redirect: { fontSize: 9, color: ui.muted, textAlign: "center", marginTop: 4 },
  gallery: { height: 241, flexDirection: "row", backgroundColor: "#E7EBF2" },
  hero: { width: "77%", height: "100%", backgroundColor: "#E7EBF2" },
  thumbs: { width: "23%", gap: 3, paddingLeft: 3 },
  thumb: { flex: 1, width: "100%", backgroundColor: "#DCE2EB" },
  floating: {
    position: "absolute",
    top: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    position: "absolute",
    bottom: 13,
    left: 16,
    color: "white",
    backgroundColor: "rgba(0,0,0,.7)",
    padding: 6,
    borderRadius: 5,
    fontWeight: "700",
  },
  more: {
    position: "absolute",
    right: 22,
    bottom: 33,
    color: "white",
    fontWeight: "900",
    fontSize: 16,
  },
  hotelSummary: { padding: 20, flexDirection: "row", gap: 8 },
  hotelName: { fontSize: 20, fontWeight: "900", color: ui.navy },
  stars: { color: "#FFB800", fontSize: 15, marginVertical: 7 },
  score: { backgroundColor: ui.blue, color: "white", fontWeight: "900" },
  stay: {
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 11,
    padding: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
  },
  stayItem: { fontSize: 11, color: ui.navy, fontWeight: "700", lineHeight: 17 },
  amenityStrip: {
    margin: 14,
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 11,
    padding: 12,
    gap: 14,
  },
  amenity: { width: 62, alignItems: "center", gap: 5 },
  amenityText: { fontSize: 9, color: ui.navy, textAlign: "center" },
  detailBody: { paddingHorizontal: 22, gap: 8 },
  detailBodyCompact: { paddingHorizontal: 14 },
  room: {
    minHeight: 116,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 10,
    padding: 6,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  roomImage: { width: 150, height: 104, borderRadius: 6 },
  roomImageCompact: { width: 120 },
  hotelSticky: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 92,
    borderTopWidth: 1,
    borderTopColor: ui.border,
    backgroundColor: "white",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
