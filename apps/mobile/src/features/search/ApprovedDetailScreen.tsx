import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
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
import { Armchair, ArrowLeft, Award, CalendarDays, Check, FilePenLine, Heart, Info, Luggage, MapPin, Repeat2, ShieldX, Users } from "lucide-react-native";
import { Button, TopBar, clock, money, shortDate, ui } from "./SearchUi";
import { visualFlights, visualHotels } from "./visualFixtures";
import { useAppTheme } from "../../theme/AppTheme";
import { AirlineLogo } from "./AirlineLogo";
import { ProviderLogo } from "./ProviderLogo";
import { readCurrencyPreference } from "../../storage/preferenceStorage";
import { readSession } from "../../storage/sessionStorage";
import {
  resolveDisplayCurrencyContext,
  type DisplayCurrencyResolution,
  type DisplayPrice,
  type ExchangeRates,
} from "../currency/displayCurrency";
import { canReuseFlightDetailFare, createFlightDetailFare } from "./flightDetailCurrency";
import { canReuseHotelDisplayPrices, createHotelDisplayPrices, type HotelDisplayPriceSnapshot } from "./hotelDetailCurrency";
import { createHotelRoomDisplayPrice } from "./hotelDetailCurrency";
import { authoritativeProviderUrl } from "./providerBooking";
import { flightShareMessage, shareFlightForAuthenticatedSession } from "./flightDetailInteractions";
import { flightEditSearchParams } from "../flow/flightSearchModel";
import { flightDetailHeaderModel } from "./flightDetailHeaderModel";
import { flightTripDetails, type FlightTripDetail, type FlightTripDetailIcon } from "./flightTripDetails";
import { useSavedFlights } from "../../storage/useSavedFlights";
import { flightSavedSignature } from "../../storage/savedMapping";
import { useCanonicalSaved } from "../../storage/useCanonicalSaved";
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { providerLocalArrivalDate } from "./flightArrivalDayOffset";
import { flightPriceBasis } from "./flightPriceBasis";
import { HOTEL_LIMITS } from "../flow/hotelSearchModel";
import { homepageAirports } from "../home/homepageAirports";
import type { MobileHotelDetailsResponse } from "../../api/travelApi";
import { canonicalHotelAddress, HotelRoomOptionsModal, hotelStaySummary, meaningfulHotelCenterDistance, NativeHotelGallery } from "./NativeHotelDetails";
import { nativeHotelOffers, nativeHotelProviderUrl, reconcileNativeHotelOfferSelection, type NativeHotelOffer } from "./nativeHotelDetailsModel";
import { colors } from "../../theme/tokens";
import { NativeHotelPropertyLocationSection, NativeRelatedHotelsSection } from "./NativeHotelDecisionSections";
import { prepareNativeRelatedHotels, type NativeRelatedHotel } from "./nativeHotelRelatedHotelsModel";

const parse = <T,>(v?: string | string[]) => {
  try {
    return JSON.parse(Array.isArray(v) ? v[0] : v || "") as T;
  } catch {
    return undefined;
  }
};
const positiveCount = (value: string | string[] | undefined, fallback: number, maximum: number) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  const parsed = Number(raw);
  return parsed >= 1 && parsed <= maximum ? parsed : fallback;
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
          priceAlertDisabled={product === "flight"}
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
  const { savedFlights, toggle: toggleSavedFlight } = useSavedFlights();
  const saved = savedFlights.has(flightSavedSignature(result));
  const header = flightDetailHeaderModel(result, params);
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
  const sharePendingRef = useRef(false);
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
  const priceBasis = flightPriceBasis(params, fare);
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
  const handleProviderBooking = async () => {
    const url = authoritativeProviderUrl(result);
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
  const handleShare = async () => {
    if (sharePendingRef.current) return;
    sharePendingRef.current = true;
    try {
      const outcome = await shareFlightForAuthenticatedSession({
        readSession,
        share: (message) => Share.share({ message }),
        message: flightShareMessage(result, formattedFare),
      });
      if (outcome === "sign-in-required") {
        Alert.alert("Sign in required", "Sign in to share this flight.", [
          { text: "Sign in", onPress: () => router.push("/email-auth") },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    }
    catch { Alert.alert("Unable to share", "Please try again."); }
    finally { sharePendingRef.current = false; }
  };
  return (
    <SafeAreaView style={[d.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <View accessibilityLabel="Flight details header" style={[d.flightBackHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}><Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={() => router.back()} style={({ pressed }) => [d.backToResults, pressed && d.headerActionPressed]}><ArrowLeft size={17} strokeWidth={2} color={ui.blue}/><Text style={d.backToResultsText}>Back to results</Text></Pressable></View>
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
        contentContainerStyle={[d.body, { paddingBottom: 110 + inset.bottom }]}
      >
        <View style={d.flightSummary}>
          <View style={d.flightSummaryCopy}>
            <Text accessibilityRole="header" numberOfLines={1} style={[d.flightSummaryRoute, { color: theme.textPrimary }]}>{header.route}</Text>
            <Text style={[d.headerMetadata, { color: theme.textSecondary }]}>{header.tripTypeLabel} · {priceBasis.travelerLabel.toLowerCase()}</Text>
          </View>
          <View accessibilityLabel="Flight details actions" style={d.flightSummaryActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={saved ? `Remove ${result.airlineName} flight from saved` : `Save ${result.airlineName} flight`} accessibilityState={{ selected: saved }} onPress={() => toggleSavedFlight(result, params)} style={d.headerAction}>
              <Heart size={20} strokeWidth={2} fill={saved ? androidFavoriteColors.active : "transparent"} color={saved ? androidFavoriteColors.active : theme.icon} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Share flight" onPress={() => void handleShare()} style={d.headerAction}>
              <FlowIcon name="share" size={20} color={theme.icon} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit search" onPress={() => router.push({ pathname: "/edit-flight-search", params: flightEditSearchParams(params) })} style={[d.editSearch, { borderColor: ui.blue }]}>
              <FilePenLine size={16} strokeWidth={2} color={ui.blue} />
              <Text style={d.editSearchText}>Edit search</Text>
            </Pressable>
          </View>
        </View>
        <View style={d.itineraryList}>
          {legs.map((leg, i) => <FlightItineraryLeg key={`${leg.departureTime}-${i}`} leg={leg} result={result} />)}
        </View>
        <View style={[d.tripDetails, { backgroundColor: theme.surface }, theme.dark && d.tripDetailsDark]}>
          <Text style={[d.h2, { color: theme.textPrimary }]}>Trip details</Text>
          {flightTripDetails(result).map((detail) => (
            <DetailsRow key={detail.label} {...detail} />
          ))}
        </View>
        <View style={d.bookingProviderSection}>
          <Text style={[d.h2, { color: theme.textPrimary }]}>Booking provider</Text>
          <BookingProviderCard
            provider={provider}
            logoUrl={result.airlineLogo}
            kind={
              provider === result.airlineName
                ? "Airline direct"
                : "Travel provider"
            }
            price={formattedFare}
          />
          {priceBasis.providerFareText ? (
            <Text accessibilityLabel={priceBasis.providerFareAccessibilityText ?? undefined} style={[d.disclosure, { color: theme.textSecondary }]}>
              {priceBasis.providerFareText}
            </Text>
          ) : null}
          <Text style={[d.disclosure, { color: theme.textSecondary }]}>Final price is confirmed by {provider} before booking.</Text>
        </View>
      </ScrollView>
      <View style={[d.sticky, { paddingBottom: Math.max(inset.bottom, 10), backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <View accessible accessibilityLabel={`Total ${fare?.accessibilityLabel ?? formattedFare} for ${priceBasis.travelerLabel}, ${priceBasis.tripTypeLabel.toLowerCase()}.`} style={d.stickyTotal}>
          <Text style={[d.meta, { color: theme.textSecondary }]}>Total</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[d.price, { color: theme.textPrimary }]}>{formattedFare}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[d.meta, { color: theme.textSecondary }]}>{priceBasis.summary}</Text>
        </View>
        <View style={d.stickyCta}>
          <Button label={`Continue to ${provider}`} onPress={handleProviderBooking} />
          <Text numberOfLines={2} style={[d.redirect, { color: theme.textSecondary }]}>You’ll continue on {provider}’s site</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
type FlightItineraryLegProps = {
  leg: NonNullable<FlightResult["legs"]>[number];
  result: FlightResult;
};

const airportFromCatalogue = (code: string) =>
  homepageAirports.find((airport) => airport.code === code.toUpperCase());

const itineraryDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

function FlightItineraryLeg({ leg, result }: FlightItineraryLegProps) {
  const { theme } = useAppTheme();
  const firstSegment = leg.segments[0];
  const lastSegment = leg.segments[leg.segments.length - 1];
  const originDetails = firstSegment?.originDetails;
  const destinationDetails = lastSegment?.destinationDetails;
  const origin = airportFromCatalogue(leg.originAirport);
  const destination = airportFromCatalogue(leg.destinationAirport);
  const segmentRows = leg.segments.length ? leg.segments : [undefined];
  const arrivalDay = providerLocalArrivalDate(leg.departureTime, leg.arrivalTime);
  const stopLabel = leg.stops === 0
    ? "Nonstop"
    : `${leg.stops} stop${leg.stops === 1 ? "" : "s"}`;
  const endpoint = (
    code: string,
    value: string,
    details: typeof originDetails,
    catalogue: ReturnType<typeof airportFromCatalogue>,
    arrival = false,
  ) => (
    <View style={d.itineraryEndpoint}>
      <Text style={[d.itineraryTime, { color: theme.textPrimary }]}>{clock(value)}</Text>
      <Text style={[d.itineraryCode, { color: theme.textPrimary }]}>{code}</Text>
      <Text numberOfLines={2} style={[d.itineraryAirport, { color: theme.textSecondary }]}>
        {details?.name ?? catalogue?.airport ?? code}
      </Text>
      <Text numberOfLines={1} style={[d.itineraryCity, { color: theme.textSecondary }]}>
        {details?.cityName ?? catalogue?.city ?? ""}
      </Text>
      {details?.terminal ? (
        <Text style={[d.itineraryFact, { color: theme.textSecondary }]}>Terminal {details.terminal}</Text>
      ) : null}
      {arrival && arrivalDay ? (
        <Text style={[d.itineraryFact, { color: theme.textSecondary }]}>{`Arrives ${arrivalDay}`}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={[d.itineraryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={d.itineraryHeading}>
        <Text style={d.itineraryDirection}>{leg.direction.toUpperCase()}</Text>
        <Text style={[d.itineraryDate, { color: theme.textSecondary }]}>{itineraryDate(leg.departureTime)}</Text>
      </View>
      <View style={d.itineraryRoute}>
        {endpoint(leg.originAirport, leg.departureTime, originDetails, origin)}
        <View style={d.itineraryJourney}>
          <Text style={[d.itineraryDuration, { color: theme.textSecondary }]}>{leg.duration}</Text>
          <View style={d.itineraryLineRow}>
            <View style={[d.itineraryDot, { backgroundColor: theme.textSecondary }]} />
            <View style={[d.itineraryLine, { backgroundColor: theme.border }]} />
            <FlowIcon name="flight" size={17} color={ui.blue} />
            <View style={[d.itineraryLine, { backgroundColor: theme.border }]} />
            <View style={[d.itineraryDot, { backgroundColor: theme.textSecondary }]} />
          </View>
          <Text style={[d.itineraryStops, { color: leg.stops === 0 ? ui.green : theme.textSecondary }]}>{stopLabel}</Text>
        </View>
        {endpoint(leg.destinationAirport, leg.arrivalTime, destinationDetails, destination, true)}
      </View>
      {leg.layovers.length ? (
        <Text style={[d.itineraryLayovers, { color: theme.textSecondary }]}>
          {leg.layovers.map((layover) => `${layover.duration} in ${layover.airport}`).join(" · ")}
        </Text>
      ) : null}
      <View style={[d.segmentList, { borderTopColor: theme.border }]}>
        {segmentRows.map((segment, index) => {
          const airlineName = segment?.marketingCarrier?.name
            ?? segment?.airlineName
            ?? result.airlineName;
          const flightNumber = segment?.marketingFlightNumber
            ?? segment?.flightNumber
            ?? (segmentRows.length === 1 ? result.flightNumber : undefined);
          const matchingOfferCarrier = airlineName.trim().toLowerCase()
            === result.airlineName.trim().toLowerCase();
          return (
            <View key={`${segment?.departureTime ?? leg.departureTime}-${index}`} style={d.segmentSummary}>
              <AirlineLogo airlineName={airlineName} logoUrl={matchingOfferCarrier ? result.airlineLogo : null} />
              <View style={d.segmentCopy}>
                <Text style={[d.segmentRoute, { color: theme.textPrimary }]}>
                  {segment?.originAirport ?? leg.originAirport} → {segment?.destinationAirport ?? leg.destinationAirport} · {clock(segment?.departureTime ?? leg.departureTime)}–{clock(segment?.arrivalTime ?? leg.arrivalTime)}
                </Text>
                <Text style={[d.segmentMeta, { color: theme.textSecondary }]}>
                  {[airlineName, flightNumber].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {segment?.distanceKm ? (
                <Text style={[d.segmentDistance, { color: theme.textSecondary }]}>{Math.round(segment.distanceKm).toLocaleString()} km</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
function HotelDetail({
  result,
  params,
}: {
  result: HotelResult;
  params: Record<string, string | string[]>;
}) {
  const { theme } = useAppTheme();
  const hotelCanvasColor = theme.dark ? theme.background : theme.surface;
  const hotelAccent = theme.dark ? "#8FB5FF" : colors.blue;
  const inset = useSafeAreaInsets();
  const canonical = useCanonicalSaved();
  const saved = canonical.items.some(
    (item) =>
      item.type === "hotel" &&
      (
        (item.payload as Record<string, unknown> | undefined)?.result as
          | { id?: string }
          | undefined
      )?.id === result.id,
  );
  const width = useWindowDimensions().width;
  const [activeHotelTab, setActiveHotelTab] = useState<
    "compare" | "about" | "location" | "reviews"
  >("compare");
  const [details, setDetails] = useState<MobileHotelDetailsResponse | null>(
    null,
  );
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<NativeHotelOffer["id"] | null>(null);
  const guestCount = positiveCount(params.guests, 2, HOTEL_LIMITS.guests.max);
  const roomCount = positiveCount(params.rooms, 1, HOTEL_LIMITS.rooms.max);
  const checkIn = String(params.checkIn || "");
  const checkOut = String(params.checkOut || "");
  const enrichmentKey = `${result.id}\u0000${checkIn}\u0000${checkOut}\u0000${guestCount}\u0000${roomCount}`;
  useEffect(() => {
    const controller = new AbortController();
    let eligible = true;
    setDetails(null);
    void travelApi
      .hotelDetails(
        {
          id: result.id,
          checkIn,
          checkOut,
          guests: guestCount,
          rooms: roomCount,
        },
        { signal: controller.signal },
      )
      .then((response) => {
        if (eligible && response.hotel?.id === result.id) setDetails(response);
      })
      .catch(() => undefined);
    return () => {
      eligible = false;
      controller.abort();
    };
  }, [enrichmentKey, result.id, checkIn, checkOut, guestCount, roomCount]);

  const property = details?.propertyDetails ?? null;
  const roomOptions = details?.roomOptions ?? [];
  const images = result.imageUrls?.length
    ? result.imageUrls
    : result.imageUrl
      ? [result.imageUrl]
      : [];
  const stay = hotelStaySummary(checkIn, checkOut, guestCount, roomCount);
  const address = canonicalHotelAddress(property, result.location);
  const classification =
    Number.isInteger(result.classificationStars) &&
    result.classificationStars! >= 1 &&
    result.classificationStars! <= 5
      ? result.classificationStars!
      : null;
  const hasVerifiedReview =
    typeof result.reviewScore === "number" &&
    result.reviewScore > 0 &&
    typeof result.reviewScale === "number" &&
    result.reviewScale > 0;
  const redirectUrl = nativeHotelProviderUrl(
    result.partnerRedirectUrl,
    result.bookingUrl,
  );
  const providerBookable =
    result.searchPolicy.bookable && Boolean(redirectUrl);
  const internalRoomFlowAvailable = roomOptions.length > 0;
  const hotelOffers = nativeHotelOffers(internalRoomFlowAvailable, providerBookable);
  const offerKey = hotelOffers.map(({ id }) => id).join("\u0000");
  useEffect(() => {
    setSelectedOfferId((current) => reconcileNativeHotelOfferSelection(current, hotelOffers));
  }, [offerKey]);
  const selectedOffer = hotelOffers.find(({ id }) => id === selectedOfferId)
    ?? hotelOffers[0]
    ?? null;
  const canContinue = selectedOffer !== null;
  const hasPrice = result.pricePerNight != null && result.totalPrice != null;
  const passedDisplayPrices = parse<HotelDisplayPriceSnapshot>(
    params.hotelDisplayPrices,
  );
  const passedDisplayCurrencyContext = parse<DisplayCurrencyResolution>(
    params.displayCurrencyContext,
  );
  const initiallyValidDisplayPrices =
    hasPrice &&
    canReuseHotelDisplayPrices({
      snapshot: passedDisplayPrices,
      providerNightly: result.pricePerNight!,
      providerTotal: result.totalPrice!,
      providerCurrency: result.currency,
      displayCurrency: passedDisplayCurrencyContext?.resolvedCurrency,
    })
      ? passedDisplayPrices!
      : null;
  const [displayPrices, setDisplayPrices] =
    useState<HotelDisplayPriceSnapshot | null>(initiallyValidDisplayPrices);
  const hotelCurrencyRatesRef = useRef<ExchangeRates | null>(null);
  const [hotelCurrencyRates, setHotelCurrencyRates] = useState<ExchangeRates>({});
  useFocusEffect(
    useCallback(() => {
      if (!hasPrice) return;
      let active = true;
      void readCurrencyPreference()
        .catch(() => null)
        .then(async (preferredCurrency) => {
          if (!active) return;
          if (
            canReuseHotelDisplayPrices({
              snapshot: passedDisplayPrices,
              providerNightly: result.pricePerNight!,
              providerTotal: result.totalPrice!,
              providerCurrency: result.currency,
              displayCurrency: passedDisplayCurrencyContext?.resolvedCurrency,
              preferredCurrency,
            })
          ) {
            setDisplayPrices(passedDisplayPrices!);
          }
          const [location, rates] = await Promise.all([
            preferredCurrency
              ? Promise.resolve(null)
              : travelApi.location().catch(() => null),
            hotelCurrencyRatesRef.current
              ? Promise.resolve(hotelCurrencyRatesRef.current)
              : travelApi
                  .currencyRates()
                  .then((payload) => payload.rates)
                  .catch(() => ({})),
          ]);
          if (!active) return;
          if (Object.keys(rates).length) hotelCurrencyRatesRef.current = rates;
          setHotelCurrencyRates(rates);
          if (canReuseHotelDisplayPrices({
            snapshot: passedDisplayPrices,
            providerNightly: result.pricePerNight!,
            providerTotal: result.totalPrice!,
            providerCurrency: result.currency,
            displayCurrency: passedDisplayCurrencyContext?.resolvedCurrency,
            preferredCurrency,
          })) return;
          const resolution = resolveDisplayCurrencyContext({
            preferredCurrency,
            ipCountryCode: location?.countryCode,
            locale: Intl.DateTimeFormat().resolvedOptions().locale,
          });
          setDisplayPrices(
            createHotelDisplayPrices(
              result.pricePerNight!,
              result.totalPrice!,
              result.currency,
              resolution.resolvedCurrency,
              rates,
            ),
          );
        });
      return () => {
        active = false;
      };
    }, [
      hasPrice,
      passedDisplayCurrencyContext?.resolvedCurrency,
      passedDisplayPrices?.nightly?.currency,
      passedDisplayPrices?.nightly?.providerAmount,
      passedDisplayPrices?.total?.providerAmount,
      result.currency,
      result.id,
      result.pricePerNight,
      result.totalPrice,
    ]),
  );
  const nightlyPrice = displayPrices?.nightly;
  const totalPrice = displayPrices?.total;
  const relatedHotels = prepareNativeRelatedHotels({
    hotels: details?.relatedHotels ?? [],
    currentHotelId: result.id,
    displayCurrency: nightlyPrice?.currency,
    rates: hotelCurrencyRates,
  });
  const viewRelatedHotel = (item: NativeRelatedHotel) => {
    const snapshot = item.displayPrices;
    const consistentContext = snapshot?.nightly?.currency
      && snapshot.nightly.currency === snapshot.total?.currency
      && snapshot.nightly.currency === passedDisplayCurrencyContext?.resolvedCurrency;
    router.push({
      pathname: "/hotel-details",
      params: {
        result: JSON.stringify(item.result),
        destination: String(params.destination || property?.city || result.location),
        checkIn,
        checkOut,
        guests: String(guestCount),
        rooms: String(roomCount),
        hotelDisplayPrices: snapshot ? JSON.stringify(snapshot) : "",
        displayCurrencyContext: consistentContext
          ? JSON.stringify(passedDisplayCurrencyContext)
          : "",
      },
    });
  };
  const presentedRoomOptions = roomOptions.map((option) => ({
    ...option,
    displayPrice: nightlyPrice
      ? createHotelRoomDisplayPrice(
          option.pricePerNight,
          option.totalPrice,
          option.currency,
          nightlyPrice.currency,
          hotelCurrencyRates,
        )
      : null,
  }));
  const continueBooking = async () => {
    if (selectedOffer?.kind === "internal-room-flow") {
      setRoomsOpen(true);
      return;
    }
    if (selectedOffer?.kind !== "provider-handoff" || !providerBookable || !redirectUrl) return;
    try {
      await Linking.openURL(redirectUrl);
    } catch {
      Alert.alert("Unable to open provider", "Please refresh and try again.");
    }
  };
  const shareHotel = () =>
    void Share.share({
      message: `${result.name} — ${address}${nightlyPrice ? ` — ${nightlyPrice.formatted}/night` : ""}`,
    });
  const returnToHotelResults = () =>
    router.replace({
      pathname: "/hotel-results",
      params: {
        destination: String(params.destination || result.location),
        checkIn,
        checkOut,
        guests: String(guestCount),
        rooms: String(roomCount),
      },
    });
  const highlights = result.amenities.slice(0, 6);
  const remainingAmenities = result.amenities.slice(6);
  const Fact = ({
    icon: Icon,
    children,
  }: {
    icon: typeof CalendarDays;
    children: string;
  }) => (
    <View style={d.hotelFactRow}>
      <Icon accessible={false} size={17} color={theme.icon} />
      <Text style={[d.hotelFact, { color: theme.textSecondary }]}>
        {children}
      </Text>
    </View>
  );
  return (
    <SafeAreaView
      style={[d.safe, { backgroundColor: hotelCanvasColor }]}
      edges={["top"]}
    >
      <View
        style={[
          d.hotelBackHeader,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to hotel results"
          onPress={returnToHotelResults}
          style={d.backToResults}
        >
          <ArrowLeft size={17} color={hotelAccent} />
          <Text style={[d.hotelBackToResultsText, { color: hotelAccent }]}>Back to hotel results</Text>
        </Pressable>
      </View>
      <ScrollView
        stickyHeaderIndices={[2]}
        contentContainerStyle={{ paddingBottom: 126 + inset.bottom }}
      >
        <View style={d.hotelIdentity}>
          <View style={d.hotelIdentityCopy}>
            <Text
              accessibilityRole="header"
              style={[d.hotelName, { color: theme.textPrimary }]}
            >
              {result.name}
            </Text>
            {stay.dates ? <Fact icon={CalendarDays}>{stay.dates}</Fact> : null}
            <Fact icon={Users}>{stay.occupancy}</Fact>
            <Fact icon={MapPin}>{address}</Fact>
            {classification ? (
              <View
                accessible
                accessibilityLabel={`${classification} star hotel`}
                style={d.hotelFactRow}
              >
                <Award accessible={false} size={17} color={theme.icon} />
                <Text accessible={false} style={d.hotelClassificationStars}>
                  {"★".repeat(classification)}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={d.hotelHeaderActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                saved
                  ? `Remove ${result.name} hotel from saved`
                  : `Save ${result.name} hotel`
              }
              accessibilityState={{ selected: saved }}
              onPress={() => void canonical.toggleHotel(result, params)}
              style={d.hotelHeaderAction}
            >
              <Heart
                size={21}
                color={saved ? androidFavoriteColors.active : theme.icon}
                fill={saved ? androidFavoriteColors.active : "transparent"}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Share ${result.name}`}
              onPress={shareHotel}
              style={d.hotelHeaderAction}
            >
              <FlowIcon name="share" size={20} color={theme.icon} />
            </Pressable>
          </View>
        </View>
        <NativeHotelGallery
          name={result.name}
          initialImages={images}
          theme={theme}
          accentColor={hotelAccent}
        />
        <View
          style={[
            d.hotelTabsShell,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          <View accessibilityRole="tablist" style={d.hotelTabsRow}>
            {(["compare", "about", "location", "reviews"] as const).map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeHotelTab === tab }}
                onPress={() => setActiveHotelTab(tab)}
                style={[
                  d.hotelTab,
                  tab === "compare" && d.hotelTabWide,
                  activeHotelTab === tab && { borderBottomColor: hotelAccent },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    d.hotelTabText,
                    width < 350 && d.hotelTabTextCompact,
                    { color: theme.textSecondary },
                    activeHotelTab === tab && {
                      color: hotelAccent,
                      fontWeight: "800",
                    },
                  ]}
                >
                  {tab === "compare"
                    ? "Compare prices"
                    : tab[0].toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={d.hotelDetailBody}>
          {activeHotelTab === "compare" ? (
            <>
              <Text style={[d.hotelHeading, { color: theme.textPrimary }]}>
                Compare prices
              </Text>
              <Text
                style={[d.hotelSectionLead, { color: theme.textSecondary }]}
              >
                {stay.dates ?? "Stay dates unavailable"} · {stay.occupancy}
              </Text>
              {hotelOffers.map((offer) => {
                const selected = offer.id === selectedOffer?.id;
                const internal = offer.kind === "internal-room-flow";
                return <Pressable
                key={offer.id}
                onPress={() => setSelectedOfferId(offer.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[d.hotelOffer, {
                  backgroundColor: theme.surface,
                  borderColor: selected ? hotelAccent : theme.border,
                }]}
              >
                <View style={d.hotelOfferTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        d.hotelOfferProvider,
                        { color: theme.textPrimary },
                      ]}
                    >
                      {internal
                        ? "Kurioticket room options"
                        : result.provider}
                    </Text>
                    <Text
                      style={[
                        d.hotelSectionLead,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {internal
                        ? `${roomOptions.length} indicative planning ${roomOptions.length === 1 ? "choice" : "choices"}`
                        : result.cancellationInfo || "Provider terms apply"}
                    </Text>
                  </View>
                  <View
                    style={[
                      d.selectionControl,
                      selected && {
                        borderWidth: 6,
                        borderColor: hotelAccent,
                      },
                    ]}
                  />
                </View>
                <View style={d.hotelOfferBottom}>
                  <Text
                    style={[d.hotelOfferFacts, { color: theme.textSecondary }]}
                  >
                    {result.amenities.slice(0, 3).join(" · ") ||
                      "Amenities confirmed with the property"}
                  </Text>
                  <View style={d.hotelOfferPrice}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.65}
                      style={[d.hotelNightly, { color: theme.textPrimary }]}
                    >
                      {hasPrice
                        ? (nightlyPrice?.formatted ?? "—")
                        : "Price unavailable"}
                    </Text>
                    <Text
                      style={[d.hotelPerNight, { color: theme.textSecondary }]}
                    >
                      per night
                    </Text>
                  </View>
                </View>
              </Pressable>;
              })}
              {!hotelOffers.length ? (
                <View style={[d.hotelOffer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[d.hotelOfferProvider, { color: theme.textPrimary }]}>{result.provider}</Text>
                  <Text style={[d.hotelSectionLead, { color: theme.textSecondary }]}>Planning inventory · no live checkout</Text>
                </View>
              ) : null}
              <Text style={[d.disclosure, { color: theme.textSecondary }]}>
                {internalRoomFlowAvailable && providerBookable
                  ? "Choose Kurioticket planning rooms or continue securely with the provider."
                  : internalRoomFlowAvailable
                  ? "Room choices are planning inventory; final availability and terms are confirmed before booking."
                  : providerBookable
                    ? `Booking continues securely with ${result.provider}.`
                    : "No actionable provider offer was supplied for this property."}
              </Text>
              <NativeHotelPropertyLocationSection
                hotelName={result.name}
                propertyDetails={property}
                theme={theme}
              />
              <NativeRelatedHotelsSection
                city={property?.city}
                hotels={relatedHotels}
                theme={theme}
                onViewHotel={viewRelatedHotel}
              />
            </>
          ) : null}
          {activeHotelTab === "about" ? (
            <View style={d.hotelPanel}>
              <Text style={[d.hotelHeading, { color: theme.textPrimary }]}>
                About this hotel
              </Text>
              <Text
                style={[d.hotelSectionLead, { color: theme.textSecondary }]}
              >
                {property?.description ||
                  "A property description is not available yet."}
              </Text>
              <Text style={[d.hotelSubheading, { color: theme.textPrimary }]}>
                Property highlights
              </Text>
              {highlights.length ? (
                <View style={d.hotelFactGrid}>
                  {highlights.map((item) => (
                    <View
                      key={item}
                      style={[
                        d.hotelHighlight,
                        {
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Check size={16} color={hotelAccent} />
                      <Text
                        style={[d.hotelGridText, { color: theme.textPrimary }]}
                      >
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text
                  style={[d.hotelSectionLead, { color: theme.textSecondary }]}
                >
                  Verified property highlights are not available yet.
                </Text>
              )}
              <Text style={[d.hotelSubheading, { color: theme.textPrimary }]}>
                All amenities
              </Text>
              {remainingAmenities.length ? (
                <View style={d.hotelFactGrid}>
                  {remainingAmenities.map((item) => (
                    <Text
                      key={item}
                      style={[d.hotelAmenity, { color: theme.textSecondary }]}
                    >
                      • {item}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text
                  style={[d.hotelSectionLead, { color: theme.textSecondary }]}
                >
                  No additional verified amenities are listed.
                </Text>
              )}
              <Text style={[d.hotelSubheading, { color: theme.textPrimary }]}>
                Room &amp; comfort
              </Text>
              <Text
                style={[d.hotelSectionLead, { color: theme.textSecondary }]}
              >
                {[property?.roomSummary, property?.bedSummary]
                  .filter(Boolean)
                  .join(" · ") ||
                  "Room details are confirmed when you choose a room."}
              </Text>
              <Text style={[d.hotelSubheading, { color: theme.textPrimary }]}>
                Hotel information
              </Text>
              <Text
                style={[d.hotelSectionLead, { color: theme.textSecondary }]}
              >
                {[
                  property?.propertyType,
                  classification
                    ? `${classification}-star classification`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") ||
                  "Property type and classification are not available."}
              </Text>
              <Text style={[d.hotelSubheading, { color: theme.textPrimary }]}>
                Accessibility
              </Text>
              <Text
                style={[d.hotelSectionLead, { color: theme.textSecondary }]}
              >
                {property?.accessibility?.join(" · ") ||
                  "Specific accessibility features should be confirmed before booking."}
              </Text>
            </View>
          ) : null}
          {activeHotelTab === "location" ? (
            <View style={d.hotelPanel}>
              <Text style={[d.hotelHeading, { color: theme.textPrimary }]}>
                Location &amp; stay fit
              </Text>
              <Fact icon={MapPin}>{address}</Fact>
              {property?.neighbourhood || result.neighbourhood ? (
                <Text
                  style={[d.hotelSectionLead, { color: theme.textSecondary }]}
                >
                  {property?.neighbourhood || result.neighbourhood}{" "}
                  neighbourhood
                </Text>
              ) : null}
              {meaningfulHotelCenterDistance(result.distanceFromCenter) ? (
                <Text
                  style={[d.hotelSectionLead, { color: theme.textSecondary }]}
                >
                  {meaningfulHotelCenterDistance(result.distanceFromCenter)}
                </Text>
              ) : null}
              {property?.interestTags?.map((tag) => (
                <Text
                  key={tag}
                  style={[d.hotelSectionLead, { color: theme.textSecondary }]}
                >
                  ✓ {tag}
                </Text>
              ))}
              {property?.businessSuitable ? (
                <Text
                  style={[d.hotelSectionLead, { color: theme.textSecondary }]}
                >
                  ✓ Suited to business stays
                </Text>
              ) : null}
              {property?.familySuitable ? (
                <Text
                  style={[d.hotelSectionLead, { color: theme.textSecondary }]}
                >
                  ✓ Suited to family stays
                </Text>
              ) : null}
              {property &&
              Number.isFinite(property.latitude) &&
              Number.isFinite(property.longitude) ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Open hotel location in Maps"
                  onPress={() =>
                    void Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.latitude},${property.longitude}`)}`,
                    )
                  }
                  style={d.mapsButton}
                >
                  <MapPin size={17} color="white" />
                  <Text style={d.mapsButtonText}>Open in Maps</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {activeHotelTab === "reviews" ? (
            <View style={d.hotelPanel}>
              <Text style={[d.hotelHeading, { color: theme.textPrimary }]}>
                Guest reviews
              </Text>
              {hasVerifiedReview ? (
                <View style={d.reviewRow}>
                  <Text style={d.hotelReviewScore}>
                    {result.reviewScore!.toFixed(1)}
                  </Text>
                  <View style={{ gap: 3 }}>
                    <Text
                      style={[d.hotelSubheading, { color: theme.textPrimary }]}
                    >
                      {result.reviewScore! / result.reviewScale! >= 0.9
                        ? "Excellent"
                        : result.reviewScore! / result.reviewScale! >= 0.8
                          ? "Very good"
                          : "Guest rating"}
                    </Text>
                    <Text
                      style={[
                        d.hotelSectionLead,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {result.reviewCount
                        ? `${result.reviewCount.toLocaleString()} reviews`
                        : "Review count unavailable"}
                    </Text>
                    {result.reviewSource ? (
                      <Text style={[d.meta, { color: theme.textSecondary }]}>
                        Source: {result.reviewSource}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text
                  style={[d.hotelSectionLead, { color: theme.textSecondary }]}
                >
                  Verified guest reviews are not connected for this property
                  yet.
                </Text>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View
        style={[
          d.hotelSticky,
          {
            paddingBottom: Math.max(inset.bottom, 10),
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
          },
        ]}
      >
        <View style={d.hotelDockPrice}>
          <View style={d.hotelDockLabel}>
            <Text style={[d.hotelDockEyebrow, { color: theme.textSecondary }]}>
              estimated stay total
            </Text>
            <Info size={14} color={theme.icon} />
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            style={[d.hotelDockTotal, { color: theme.textPrimary }]}
          >
            {hasPrice ? (totalPrice?.formatted ?? "—") : "Price unavailable"}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[d.hotelPerNight, { color: theme.textSecondary }]}
          >
            {hasPrice
              ? `${nightlyPrice?.formatted ?? "—"} per night`
              : "No live price supplied"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          disabled={!canContinue}
          onPress={() => void continueBooking()}
          style={({ pressed }) => [
            d.hotelContinue,
            !canContinue && d.hotelContinueDisabled,
            pressed && canContinue && d.hotelContinuePressed,
          ]}
        >
          <Text style={d.hotelContinueText}>Continue booking</Text>
        </Pressable>
      </View>
      <HotelRoomOptionsModal
        visible={roomsOpen}
        onClose={() => setRoomsOpen(false)}
        options={presentedRoomOptions}
        theme={theme}
        accentColor={hotelAccent}
      />
    </SafeAreaView>
  );
}
const detailIcons: Record<FlightTripDetailIcon, typeof Luggage> = {
  baggage: Luggage,
  seat: Armchair,
  changes: Repeat2,
  cancellation: ShieldX,
};

function DetailsRow({ label, icon, value, legs }: FlightTripDetail) {
  const { theme } = useAppTheme();
  const DetailIcon = detailIcons[icon];
  const accessibilityValue = legs
    ?.map((leg) => `${leg.label}. ${leg.value}`)
    .join(". ") ?? value ?? "";
  return (
    <View accessibilityLabel={`${label}. ${accessibilityValue}`} style={d.detailRow}>
      <View style={d.detailHeading}>
        <DetailIcon accessible={false} color={ui.blue} size={17} strokeWidth={2.2} />
        <Text style={[d.detailLabel, { color: theme.textPrimary }]}>{label}</Text>
      </View>
      {legs ? (
        <LegSpecificDetail legs={legs} />
      ) : (
        <Text style={[d.detailValue, d.detailGenericValue, { color: theme.textSecondary }]}>{value}</Text>
      )}
    </View>
  );
}

function LegSpecificDetail({ legs }: Pick<FlightTripDetail, "legs">) {
  const { theme } = useAppTheme();
  return (
    <View style={d.detailLegs}>
      {legs?.map((leg) => (
        <View key={leg.label} style={d.detailLeg}>
          <Text style={[d.detailLegLabel, { color: theme.textSecondary }]}>{leg.label}</Text>
          <Text style={[d.detailValue, { color: theme.textSecondary }]}>{leg.value}</Text>
        </View>
      ))}
    </View>
  );
}
function BookingProviderCard({
  provider,
  logoUrl,
  kind,
  price,
}: {
  provider: string;
  logoUrl?: string | null;
  kind: string;
  price: string;
}) {
  const { theme } = useAppTheme();
  const compact = useWindowDimensions().width < 360;
  return (
    <View
      accessibilityLabel={`${provider}. Recommended. ${kind}. ${price}`}
      style={[
        d.bookingProviderCard,
        compact && d.bookingProviderCardCompact,
        { backgroundColor: theme.dark ? "#17243A" : theme.surface },
        theme.dark && d.bookingProviderCardDark,
      ]}
    >
      <View style={d.providerIdentity}>
        <View style={[d.providerLogo, theme.dark && { backgroundColor: "#142B55" }]}>
          <ProviderLogo provider={provider} logoUrl={logoUrl} />
        </View>
        <View style={d.providerCopy}>
          <Text numberOfLines={1} style={[d.provider, d.providerName, { color: theme.textPrimary }]}>
            {provider}
          </Text>
          <Text style={[d.green, d.recommended]}>★ Recommended</Text>
          <Text style={[d.meta, d.providerKind, { color: theme.textSecondary }]}>{kind}</Text>
        </View>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={d.priceSmall}>{price}</Text>
    </View>
  );
}
function Offer({
  provider,
  logoUrl,
  kind,
  price,
  selected,
  onSelect,
}: {
  provider: string;
  logoUrl?: string | null;
  kind: string;
  price: string;
  selected: boolean;
  onSelect?: () => void;
}) {
  const { theme } = useAppTheme();
  const compact = useWindowDimensions().width < 360;
  return (
    <View style={[d.offer, compact && d.offerCompact, { backgroundColor: theme.dark ? "#17243A" : theme.surface, borderColor: theme.border }, selected && { borderColor: ui.blue }]}>
      <View style={d.providerIdentity}>
        <View style={[d.providerLogo, theme.dark && { backgroundColor: "#142B55" }]}>
          <ProviderLogo provider={provider} logoUrl={logoUrl} />
        </View>
        <View style={d.providerCopy}>
          <Text style={[d.provider, d.providerName, { color: theme.textPrimary }]}>
            {provider}
          </Text>
          {selected ? <Text style={[d.green, d.recommended]}>★ Recommended</Text> : null}
          <Text style={[d.meta, d.providerKind, { color: theme.textSecondary }]}>{kind}</Text>
        </View>
      </View>
      <View style={[d.offerActions, compact && d.offerActionsCompact]}>
        <Text numberOfLines={1} style={d.priceSmall}>{price}</Text>
        {onSelect ? <Button label="Select" onPress={onSelect} /> : null}
      </View>
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
  flightHeader: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flightHeaderTopRow: {
    minHeight: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  headerAction: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActionPressed: { opacity: 0.55 },
  headerRoute: {
    position: "absolute",
    left: 96,
    right: 96,
    textAlign: "center",
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
  },
  headerActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    columnGap: 4,
  },
  headerMetadataRow: {
    minWidth: "100%",
    paddingHorizontal: 44,
    paddingTop: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  headerMetadata: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  flightBackHeader: {
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backToResults: {
    minHeight: 44,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  backToResultsText: { color: ui.blue, fontSize: 14, lineHeight: 19, fontWeight: "700" },
  flightSummary: { gap: 12, paddingBottom: 2 },
  flightSummaryCopy: { gap: 3 },
  flightSummaryRoute: { fontSize: 25, lineHeight: 31, fontWeight: "900" },
  flightSummaryActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  editSearch: {
    minHeight: 44,
    marginLeft: "auto",
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  editSearchText: { color: ui.blue, fontSize: 13, fontWeight: "800" },
  itineraryList: { gap: 12 },
  itineraryCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 13 },
  itineraryHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  itineraryDirection: { color: ui.blue, fontSize: 11, lineHeight: 15, fontWeight: "900", letterSpacing: 0.7 },
  itineraryDate: { fontSize: 11, lineHeight: 15, fontWeight: "700", textAlign: "right" },
  itineraryRoute: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  itineraryEndpoint: { flex: 1, minWidth: 0, gap: 1 },
  itineraryTime: { fontSize: 20, lineHeight: 25, fontWeight: "900" },
  itineraryCode: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  itineraryAirport: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  itineraryCity: { fontSize: 10, lineHeight: 14 },
  itineraryFact: { fontSize: 9, lineHeight: 13, marginTop: 1 },
  itineraryJourney: { width: 90, alignItems: "center", paddingTop: 4 },
  itineraryDuration: { fontSize: 10, lineHeight: 14, fontWeight: "700" },
  itineraryLineRow: { width: "100%", flexDirection: "row", alignItems: "center", marginVertical: 6 },
  itineraryDot: { width: 4, height: 4, borderRadius: 2 },
  itineraryLine: { flex: 1, height: 1 },
  itineraryStops: { fontSize: 9, lineHeight: 13, fontWeight: "800" },
  itineraryLayovers: { fontSize: 10, lineHeight: 14, textAlign: "center" },
  segmentList: { paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  segmentSummary: { flexDirection: "row", alignItems: "center", gap: 9 },
  segmentCopy: { flex: 1, minWidth: 0, gap: 2 },
  segmentRoute: { fontSize: 11, lineHeight: 15, fontWeight: "800" },
  segmentMeta: { fontSize: 10, lineHeight: 14 },
  segmentDistance: { fontSize: 9, lineHeight: 13, flexShrink: 0 },
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
  bookingProviderSection: { gap: 10, paddingVertical: 2 },
  bookingProviderCard: {
    borderRadius: 13,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    shadowColor: "#07152F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  bookingProviderCardCompact: { flexDirection: "column" },
  bookingProviderCardDark: { shadowOpacity: 0.28, elevation: 2 },
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
  arrivalDate: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  middle: { width: 120, alignItems: "center" },
  line: {
    height: 1,
    width: "100%",
    backgroundColor: ui.muted,
    marginVertical: 7,
  },
  price: { fontSize: 24, fontWeight: "900", color: ui.navy },
  tripDetails: {
    borderRadius: 13,
    padding: 14,
    gap: 12,
    shadowColor: "#07152F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  tripDetailsDark: { shadowOpacity: 0.28, elevation: 2 },
  detailRow: { gap: 6, minWidth: 0 },
  detailHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  detailLabel: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  detailLegs: { gap: 8, paddingLeft: 24 },
  detailLeg: { gap: 1, minWidth: 0 },
  detailLegLabel: { fontSize: 11, lineHeight: 15, fontWeight: "700" },
  detailValue: { fontSize: 12, lineHeight: 17, flexShrink: 1, minWidth: 0 },
  detailGenericValue: { paddingLeft: 24 },
  offer: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 9,
    padding: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  offerCompact: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  providerIdentity: {
    flex: 1,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  providerCopy: { flex: 1, minWidth: 97 },
  providerName: { flexShrink: 0 },
  recommended: { alignSelf: "flex-start", flexShrink: 0 },
  providerKind: { alignSelf: "flex-start", flexShrink: 0 },
  providerLogo: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#EEF3FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  offerActions: {
    flexShrink: 0,
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 9,
  },
  offerActionsCompact: {
    flexDirection: "column",
    alignItems: "flex-end",
    alignSelf: "flex-end",
    gap: 6,
  },
  priceSmall: { fontSize: 18, fontWeight: "900", color: ui.blue, flexShrink: 0, textAlign: "right" },
  disclosure: { fontSize: 10, color: ui.muted, textAlign: "center" },
  sticky: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 88,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ui.border,
    backgroundColor: "white",
    paddingTop: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  stickyTotal: { flexShrink: 1, minWidth: 92, maxWidth: "42%", gap: 1 },
  stickyCta: { flex: 1, minWidth: 0, maxWidth: 250 },
  redirect: { fontSize: 9, lineHeight: 12, color: ui.muted, textAlign: "center", marginTop: 3 },
  hotelBackHeader: { minHeight: 48, paddingHorizontal: 16, justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ui.border, backgroundColor: "white" },
  hotelIdentity: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 13, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  hotelIdentityCopy: { flex: 1, minWidth: 0, gap: 7 },
  hotelBackToResultsText: { fontSize: 14, lineHeight: 19, fontWeight: "700" },
  hotelHeaderActions: { flexDirection: "row", marginRight: -8 },
  hotelHeaderAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hotelFact: { color: "#334155", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  hotelClassificationStars: { color: "#F5A623", fontSize: 15, lineHeight: 19, letterSpacing: 1 },
  hotelGallery: { height: 244, marginHorizontal: 12, marginBottom: 6, flexDirection: "row", gap: 4, borderRadius: 12, overflow: "hidden", backgroundColor: "#E7EBF2" },
  hotelHero: { width: "78%", height: "100%", backgroundColor: "#E7EBF2" },
  hotelThumbs: { flex: 1, gap: 4 },
  hotelThumb: { flex: 1, width: "100%", backgroundColor: "#DCE2EB" },
  hotelImageUnavailable: { alignItems: "center", justifyContent: "center" },
  hotelTabsShell: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 51,
    marginTop: 1,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
    backgroundColor: "white",
  },
  hotelTabsRow: {
    alignSelf: "stretch",
    minHeight: 50,
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
  },
  hotelTab: {
    width: "21.5%",
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  hotelTabWide: { width: "35.5%" },
  hotelTabActive: { borderBottomColor: colors.blue },
  hotelTabText: { color: "#475569", fontSize: 11, fontWeight: "600" },
  hotelSectionLead: { color: "#475569", fontSize: 12, lineHeight: 18 },
  hotelNotice: { paddingVertical: 6, gap: 5 },
  hotelPanel: { paddingTop: 9, paddingBottom: 24, gap: 11 },
  hotelFactGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hotelGridFact: { width: "48%", minHeight: 34, flexDirection: "row", alignItems: "center", gap: 6 },
  hotelGridText: { flex: 1, color: "#334155", fontSize: 11, lineHeight: 15 },
  hotelReviewScore: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 5, backgroundColor: colors.blue, color: "white", paddingHorizontal: 9, paddingVertical: 6, fontSize: 18, fontWeight: "900" },
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
  hotelSummaryCompact: { flexDirection: "column" },
  hotelPriceSummary: { alignItems: "flex-end", flexShrink: 0 },
  hotelPriceSummaryCompact: { alignItems: "flex-start" },
  hotelName: { fontSize: 22, lineHeight: 28, fontWeight: "900", color: ui.navy },
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
  stayCompact: { flexDirection: "column", gap: 8 },
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
  hotelFactRow: { minHeight: 22, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  hotelTabTextCompact: { fontSize: 10 },
  hotelDetailBody: { paddingHorizontal: 16, paddingVertical: 20, gap: 12 },
  hotelHeading: { fontSize: 20, lineHeight: 26, fontWeight: "900" },
  hotelSubheading: { fontSize: 15, lineHeight: 20, fontWeight: "900", marginTop: 6 },
  hotelOffer: { borderWidth: 1.5, borderRadius: 13, padding: 16, gap: 16 },
  hotelOfferTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  hotelOfferProvider: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  selectionControl: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: ui.border },
  hotelOfferBottom: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  hotelOfferFacts: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 16 },
  hotelOfferPrice: { maxWidth: "52%", alignItems: "flex-end" },
  hotelNightly: { fontSize: 22, lineHeight: 27, fontWeight: "900", textAlign: "right" },
  hotelPerNight: { fontSize: 11, lineHeight: 16 },
  hotelHighlight: { width: "48%", minHeight: 48, padding: 9, borderWidth: 1, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  hotelAmenity: { width: "48%", fontSize: 12, lineHeight: 18 },
  mapsButton: { alignSelf: "flex-start", minHeight: 44, borderRadius: 8, paddingHorizontal: 15, backgroundColor: colors.blue, flexDirection: "row", alignItems: "center", gap: 8 },
  mapsButtonText: { color: "white", fontSize: 13, fontWeight: "800" },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  hotelDockPrice: { flex: 1, minWidth: 0, gap: 1 },
  hotelDockLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  hotelDockEyebrow: { fontSize: 10, lineHeight: 14 },
  hotelDockTotal: { fontSize: 22, lineHeight: 27, fontWeight: "900" },
  hotelContinue: { minWidth: 142, minHeight: 48, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  hotelContinuePressed: { backgroundColor: "#003B91" },
  hotelContinueDisabled: { opacity: 0.45 },
  hotelContinueText: { color: "white", fontSize: 14, fontWeight: "900", textAlign: "center" },

});
