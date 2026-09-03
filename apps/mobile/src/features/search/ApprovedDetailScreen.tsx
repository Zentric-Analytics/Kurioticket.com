import { useCallback, useRef, useState } from "react";
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
import { Armchair, ArrowLeft, FilePenLine, Heart, Luggage, Repeat2, ShieldX } from "lucide-react-native";
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
  const inset = useSafeAreaInsets();
  const canonical = useCanonicalSaved();
  const saved = canonical.items.some(item => item.type === "hotel" && ((item.payload as Record<string, unknown> | undefined)?.result as { id?: string } | undefined)?.id === result.id);
  const compact = useWindowDimensions().width < 430;
  const images = result.imageUrls?.length
    ? result.imageUrls
    : result.imageUrl
      ? [result.imageUrl]
      : [];
  const [selectedRoom, setSelectedRoom] = useState(true);
  const [activeHotelTab, setActiveHotelTab] = useState<"compare" | "about" | "location" | "reviews">("compare");
  const redirectUrl = result.partnerRedirectUrl || result.bookingUrl;
  const bookable = result.searchPolicy.bookable && Boolean(redirectUrl);
  const hasPrice = result.pricePerNight != null && result.totalPrice != null;
  const discovery = result.inventoryKind === "discovery";
  const guestCount = positiveCount(params.guests, 2, HOTEL_LIMITS.guests.max);
  const roomCount = positiveCount(params.rooms, 1, HOTEL_LIMITS.rooms.max);
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
  const shareHotel = () => void Share.share({
    message: `${result.name} — ${result.location}`,
  });
  const reviewValue = result.reviewScore ?? result.rating;
  const classification = result.classificationStars || Math.round(result.rating);
  const profile = result.catalogueProfile;
  const returnToHotelResults = () => router.replace({
    pathname: "/hotel-results",
    params: {
      destination: String(params.destination || result.location),
      checkIn: String(params.checkIn || ""),
      checkOut: String(params.checkOut || ""),
      guests: String(guestCount),
      rooms: String(roomCount),
    },
  });
  return (
    <SafeAreaView style={[d.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={[d.hotelBackHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to hotel results" onPress={returnToHotelResults} style={d.backToResults}>
          <ArrowLeft size={17} strokeWidth={2} color={ui.blue}/><Text style={d.backToResultsText}>Back to hotel results</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + inset.bottom }}>
        <View style={d.hotelIdentity}>
          <View style={d.hotelIdentityCopy}>
            <Text accessibilityRole="header" style={[d.hotelName, { color: theme.textPrimary }]}>{result.name}</Text>
            {nights ? <Text style={[d.hotelFact, { color: theme.textSecondary }]}>▣ {shortDate(String(params.checkIn || ""))} – {shortDate(String(params.checkOut || ""))} · {nights} nights</Text> : null}
            <Text style={[d.hotelFact, { color: theme.textSecondary }]}>♙ {guestCount} guests, {roomCount} room{roomCount === 1 ? "" : "s"}</Text>
            <Text style={[d.hotelFact, { color: theme.textSecondary }]}>⌾ {result.location}</Text>
            {classification > 0 ? <Text accessibilityLabel={`${classification} star hotel`} style={d.stars}>{"★".repeat(classification)}</Text> : null}
          </View>
          <View style={d.hotelHeaderActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={saved ? `Remove ${result.name} hotel from saved` : `Save ${result.name} hotel`} accessibilityState={{ selected: saved }} onPress={() => void canonical.toggleHotel(result, params)} style={d.hotelHeaderAction}>
              <Heart size={21} color={saved ? androidFavoriteColors.active : theme.icon} fill={saved ? androidFavoriteColors.active : "transparent"}/>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Share ${result.name}`} onPress={shareHotel} style={d.hotelHeaderAction}>
              <FlowIcon name="share" size={20} color={theme.icon}/>
            </Pressable>
          </View>
        </View>
        <View style={d.hotelGallery}>
          {images[0] ? (
            <Image source={{ uri: images[0] }} resizeMode="cover" style={d.hotelHero} accessibilityLabel={`${result.name} photo 1`} />
          ) : (
            <View style={[d.hotelHero, d.hotelImageUnavailable, {backgroundColor:theme.surface}]}><Text style={[d.meta,{color:theme.textSecondary}]}>Property image unavailable</Text></View>
          )}
          <View style={d.hotelThumbs}>
            {[images[1], images[2]].map((x, i) =>
              x ? (
                <Image key={x} source={{ uri: x }} resizeMode="cover" style={d.hotelThumb} accessibilityLabel={`${result.name} photo ${i + 2}`} />
              ) : (
                <View key={i} style={[d.hotelThumb, d.hotelImageUnavailable]} />
              ),
            )}
          </View>
          <Text style={d.count}>1 / {images.length || 1}</Text>
          {images.length > 3 ? (
            <Text style={d.more}>+{images.length - 3}</Text>
          ) : null}
        </View>
        <View accessibilityRole="tablist" style={[d.hotelTabs, { borderBottomColor: theme.border }]}>
          {(["compare", "about", "location", "reviews"] as const).map((tab) => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{selected:activeHotelTab===tab}} onPress={()=>setActiveHotelTab(tab)} style={[d.hotelTab,activeHotelTab===tab&&d.hotelTabActive]}><Text style={[d.hotelTabText,{color:theme.textSecondary},activeHotelTab===tab&&d.hotelTabTextActive]}>{tab === "compare" ? "Compare prices" : tab[0].toUpperCase()+tab.slice(1)}</Text></Pressable>)}
        </View>
        <View style={[d.detailBody, compact && d.detailBodyCompact]}>
          {activeHotelTab === "compare" ? <>
          <Text style={[d.h2,{color:theme.textPrimary}]}>Compare prices</Text>
          <Text style={[d.hotelSectionLead,{color:theme.textSecondary}]}>{nights ? `${shortDate(String(params.checkIn || ""))} – ${shortDate(String(params.checkOut || ""))} · ${nights} nights` : "Stay dates unavailable"} · {guestCount} guests, {roomCount} room{roomCount === 1 ? "" : "s"}</Text>
          {discovery ? <View style={[d.hotelNotice,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={[d.h2,{color:theme.textPrimary}]}>Live room options unavailable</Text><Text style={[d.meta,{color:theme.textSecondary}]}>This source-backed property is shown for destination planning. No live room, price, or availability was supplied.</Text></View> : <Pressable
            onPress={() => setSelectedRoom(true)}
            style={[d.room,{backgroundColor:theme.surface,borderColor:theme.border}, selectedRoom && { borderColor: ui.blue }]}
          >
            {result.imageUrl ? (
              <Image source={{ uri: result.imageUrl }} style={[d.roomImage, compact && d.roomImageCompact]} />
            ) : null}
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <Text style={[d.provider,{color:theme.textPrimary}]}>{result.roomType || "Room option"}</Text>
              <Text style={[d.meta,{color:theme.textSecondary}]}>
                {result.cancellationInfo || "Cancellation terms unavailable"}
              </Text>
              <Text style={d.green}>
                {result.amenities.slice(0, 2).join(" · ")}
              </Text>
            </View>
            <View style={{ width: compact ? 106 : 126, flexShrink: 0, alignItems: "flex-end" }}>
              <Text style={[d.price,{color:theme.textPrimary}]}>
                {money(result.currency, result.pricePerNight)}
              </Text>
              <Text style={[d.meta,{color:theme.textSecondary}]}>
                {money(result.currency, result.totalPrice)} total
              </Text>
              <Button label="Select room" outline={!selectedRoom} />
            </View>
          </Pressable>}
          <View style={[d.section,{backgroundColor:theme.surface,borderColor:theme.border}]}>
            <Text style={[d.h2,{color:theme.textPrimary}]}>{discovery ? "Inventory source" : "Choose where to book"}</Text>
            <Text style={[d.meta,{color:theme.textSecondary}]}>
              Total price including taxes and fees when reported
            </Text>
            <Offer
              provider={result.provider}
              kind={
                bookable
                  ? result.cancellationInfo
                  : "Planning inventory · no live checkout"
              }
              price={hasPrice ? money(result.currency, result.totalPrice) : "Price unavailable"}
              selected={!discovery}
            />
            <Text style={[d.disclosure,{color:theme.textSecondary}]}>
              Only the provider offer returned by the current inventory source
              is shown.
            </Text>
          </View>
          </> : null}
          {activeHotelTab === "about" ? <View style={[d.hotelPanel,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={[d.h2,{color:theme.textPrimary}]}>About this property</Text>{profile?.propertyType ? <Text style={[d.hotelSectionLead,{color:theme.textSecondary}]}>{profile.propertyType}</Text> : null}{result.amenities.length ? <><Text style={[d.provider,{color:theme.textPrimary}]}>Amenities</Text><View style={d.hotelFactGrid}>{result.amenities.map(a=><View key={a} style={d.hotelGridFact}><FlowIcon name="check" size={16} color={ui.green}/><Text style={[d.hotelGridText,{color:theme.textPrimary}]}>{a}</Text></View>)}</View></> : <Text style={[d.meta,{color:theme.textSecondary}]}>Verified property information is not available yet.</Text>}{profile?.accessibilityFeatures?.length ? <><Text style={[d.provider,{color:theme.textPrimary}]}>Accessibility</Text>{profile.accessibilityFeatures.map(a=><Text key={a} style={[d.hotelSectionLead,{color:theme.textSecondary}]}>• {a}</Text>)}</> : null}</View> : null}
          {activeHotelTab === "location" ? <View style={[d.hotelPanel,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={[d.h2,{color:theme.textPrimary}]}>Location & stay fit</Text><Text style={[d.hotelSectionLead,{color:theme.textSecondary}]}>{result.location}</Text>{result.neighbourhood ? <Text style={[d.hotelSectionLead,{color:theme.textSecondary}]}>{result.neighbourhood} neighborhood</Text> : null}{result.distanceFromCenter ? <Text style={[d.meta,{color:theme.textSecondary}]}>{result.distanceFromCenter} from city center</Text> : null}{profile?.travellerFeatures?.map(f=><Text key={f} style={[d.hotelSectionLead,{color:theme.textSecondary}]}>✓ {f}</Text>)}</View> : null}
          {activeHotelTab === "reviews" ? <View style={[d.hotelPanel,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={[d.h2,{color:theme.textPrimary}]}>Guest reviews</Text>{reviewValue > 0 ? <><Text style={d.hotelReviewScore}>{reviewValue.toFixed(1)}</Text><Text style={[d.hotelSectionLead,{color:theme.textSecondary}]}>{result.reviewCount ? `${result.reviewCount.toLocaleString()} reviews` : "Review count unavailable"}</Text>{result.reviewSource ? <Text style={[d.meta,{color:theme.textSecondary}]}>Source: {result.reviewSource}</Text> : null}</> : <Text style={[d.meta,{color:theme.textSecondary}]}>Verified guest reviews are not available for this property yet.</Text>}</View> : null}
        </View>
      </ScrollView>
      <View
        style={[d.hotelSticky, { paddingBottom: Math.max(inset.bottom, 10), backgroundColor: theme.surface, borderTopColor: theme.border }]}
      >
        <View style={d.stickyTotal}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[d.price,{color:theme.textPrimary}]}>
            {hasPrice ? <>{money(result.currency, result.totalPrice)}{" "}<Text style={[d.meta,{color:theme.textSecondary}]}>total</Text></> : "Price unavailable"}
          </Text>
          <Text style={[d.meta,{color:theme.textSecondary}]}>
            {nights ? `${nights} nights, ` : ""}{guestCount} guests
          </Text>
          <Text style={d.blue}>Price breakdown ⌄</Text>
        </View>
        <View style={d.stickyCta}>
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
  hotelHeaderActions: { flexDirection: "row", marginRight: -8 },
  hotelHeaderAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hotelFact: { color: "#334155", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  hotelGallery: { height: 244, marginHorizontal: 12, marginBottom: 6, flexDirection: "row", gap: 4, borderRadius: 12, overflow: "hidden", backgroundColor: "#E7EBF2" },
  hotelHero: { width: "78%", height: "100%", backgroundColor: "#E7EBF2" },
  hotelThumbs: { flex: 1, gap: 4 },
  hotelThumb: { flex: 1, width: "100%", backgroundColor: "#DCE2EB" },
  hotelImageUnavailable: { alignItems: "center", justifyContent: "center" },
  hotelTabs: { minHeight: 51, marginTop: 1, paddingHorizontal: 8, flexDirection: "row", alignItems: "stretch", borderBottomWidth: 1, borderBottomColor: ui.border, backgroundColor: "white" },
  hotelTab: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  hotelTabActive: { borderBottomColor: ui.blue },
  hotelTabText: { color: "#475569", fontSize: 11, fontWeight: "600" },
  hotelTabTextActive: { color: ui.blue, fontWeight: "800" },
  hotelSectionLead: { color: "#475569", fontSize: 12, lineHeight: 18 },
  hotelNotice: { paddingVertical: 6, gap: 5 },
  hotelPanel: { paddingTop: 9, paddingBottom: 24, gap: 11 },
  hotelFactGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hotelGridFact: { width: "48%", minHeight: 34, flexDirection: "row", alignItems: "center", gap: 6 },
  hotelGridText: { flex: 1, color: "#334155", fontSize: 11, lineHeight: 15 },
  hotelReviewScore: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 5, backgroundColor: ui.blue, color: "white", paddingHorizontal: 9, paddingVertical: 6, fontSize: 18, fontWeight: "900" },
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
});
