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
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { travelApi, type HotelResult } from "../../api/travelApi";
import { FlowIcon } from "../flow/FlowIcon";
import { Armchair, ArrowLeft, Award, Bed, CalendarDays, FilePenLine, Heart, Info, Laptop, Luggage, MapPin, Repeat2, ShieldX, Sparkles, Users, UtensilsCrossed, Wifi, Wine, type LucideIcon } from "lucide-react-native";
import { Button, TopBar, clock, money, shortDate, ui } from "./SearchUi";
import { visualHotels } from "./visualFixtures";
import { useAppTheme } from "../../theme/AppTheme";
import { ProviderLogo } from "./ProviderLogo";
import { readCurrencyPreference } from "../../storage/preferenceStorage";
import { readSession } from "../../storage/sessionStorage";
import {
  resolveDisplayCurrencyContext,
  type DisplayCurrencyResolution,
  type DisplayPrice,
  type ExchangeRates,
} from "../currency/displayCurrency";
import { canReuseHotelDisplayPrices, createHotelDisplayPrices, type HotelDisplayPriceSnapshot } from "./hotelDetailCurrency";
import { createHotelRoomDisplayPrice } from "./hotelDetailCurrency";
import { useCanonicalSaved } from "../../storage/useCanonicalSaved";
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { HOTEL_LIMITS } from "../flow/hotelSearchModel";
import { homepageAirports } from "../home/homepageAirports";
import type { MobileHotelDetailsResponse } from "../../api/travelApi";
import { canonicalHotelAddress, HotelRoomOptionsModal, hotelStaySummary, NativeHotelGallery } from "./NativeHotelDetails";
import { nativeHotelOffers, nativeHotelProviderUrl, reconcileNativeHotelOfferSelection, type NativeHotelOffer } from "./nativeHotelDetailsModel";
import { colors } from "../../theme/tokens";
import { NativeHotelPropertyLocationSection, NativeRelatedHotelsSection } from "./NativeHotelDecisionSections";
import { prepareNativeRelatedHotels, type NativeRelatedHotel } from "./nativeHotelRelatedHotelsModel";
import { HotelOfferAmenityList } from "./HotelCardAmenityList";
import { nativeHotelAmenityLabel } from "./hotelAmenityLabel";
import { appFonts } from "../../theme/typography";
import { buildHotelAmenityPresentation, type HotelAmenityPresentationItem } from "../../../../../src/components/results/hotelAmenityPresentation";
import { NativeHotelLocationSection } from "./NativeHotelLocationSection";
import { NativeHotelReviewsSection } from "./NativeHotelReviewsSection";
import { NativeFlightDetails } from "./NativeFlightDetails";
import type { FlightTripDetail, FlightTripDetailIcon } from "./flightTripDetails";
import { hotelResultsDismissCount } from "./hotelDetailReturnNavigation";

function hotelAboutIconFor(item: HotelAmenityPresentationItem): LucideIcon {
  if (item.iconKey === "wifi") return Wifi;
  if (item.iconKey === "restaurant") return UtensilsCrossed;
  if (item.iconKey === "workspace") return Laptop;
  if (/bar|lounge/i.test(item.label)) return Wine;
  if (/bed|room/i.test(item.label)) return Bed;
  return Sparkles;
}

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
    parse<HotelResult>(params.result) ??
    (visualTest
      ? product === "hotel"
        ? visualHotels[0]
        : undefined
      : undefined);
  if (product === "flight" && params.id) return <NativeFlightDetails params={params} />;
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
  return <HotelDetail result={value as HotelResult} params={params} />;
}
function HotelDetail({
  result,
  params,
}: {
  result: HotelResult;
  params: Record<string, string | string[]>;
}) {
  const navigation = useNavigation();
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
  const hotelResultsStack =
    (Array.isArray(params.hotelResultsStack)
      ? params.hotelResultsStack[0]
      : params.hotelResultsStack) === "1";
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
        ...(hotelResultsStack ? { hotelResultsStack: "1" } : {}),
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
  const returnToHotelResults = () => {
    if (hotelResultsStack) {
      const dismissCount = hotelResultsDismissCount(navigation.getState());
      if (dismissCount) {
        router.dismiss(dismissCount);
        return;
      }
    }
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
  };
  const amenityItems = buildHotelAmenityPresentation(
    result.amenities,
    result.amenities.length,
  ).map((item) => ({ ...item, label: nativeHotelAmenityLabel(item) }));
  const highlights = amenityItems.slice(0, 6);
  const remainingAmenities = amenityItems.slice(6);
  const hotelIdentityTitleColor = theme.dark ? theme.textPrimary : "#020617";
  const hotelIdentityMetaColor = theme.dark ? theme.textSecondary : "#334155";
  const hotelIdentityIconColor = theme.dark ? theme.icon : "#334155";
  const hotelIdentityClassificationIconColor = theme.dark ? theme.icon : "#64748B";
  const hotelIdentityActionColor = theme.dark ? theme.icon : "#0F172A";
  const Fact = ({
    icon: Icon,
    children,
  }: {
    icon: typeof CalendarDays;
    children: string;
  }) => (
    <View style={d.hotelFactRow}>
      <Icon accessible={false} size={16} color={hotelIdentityIconColor} />
      <Text style={[d.hotelFact, { color: hotelIdentityMetaColor }]}>
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
          { backgroundColor: hotelCanvasColor },
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
        style={{ backgroundColor: hotelCanvasColor }}
        contentContainerStyle={{ paddingBottom: 126 + inset.bottom }}
      >
        <View style={d.hotelIdentity}>
          <View style={d.hotelIdentityTopRow}>
            <View style={d.hotelIdentityCopy}>
              <Text
                accessibilityRole="header"
                style={[d.hotelName, width <= 430 && d.hotelNamePhoneFit, { color: hotelIdentityTitleColor }]}
              >
                {result.name}
              </Text>
              <View style={d.hotelIdentityMeta}>
                {stay.dates ? <Fact icon={CalendarDays}>{stay.dates}</Fact> : null}
                <Fact icon={Users}>{stay.occupancy}</Fact>
                <Fact icon={MapPin}>{address}</Fact>
                {classification ? (
                  <View
                    accessible
                    accessibilityLabel={`${classification} star hotel`}
                    style={d.hotelFactRow}
                  >
                    <Award accessible={false} size={16} color={hotelIdentityClassificationIconColor} />
                    <Text accessible={false} style={d.hotelClassificationStars}>
                      {"★".repeat(classification)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={d.hotelHeaderActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={saved ? `Remove ${result.name} hotel from saved` : `Save ${result.name} hotel`}
                accessibilityState={{ selected: saved }}
                onPress={() => void canonical.toggleHotel(result, params)}
                style={[d.hotelHeaderAction, d.hotelHeaderActionSave]}
              >
                <Heart size={20} strokeWidth={2} color={saved ? androidFavoriteColors.savedStroke : androidFavoriteColors.unsavedStroke} fill={saved ? androidFavoriteColors.savedFill : androidFavoriteColors.unsavedFill} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Share ${result.name}`} onPress={shareHotel} style={[d.hotelHeaderAction, d.hotelHeaderActionShare]}>
                <FlowIcon name="share" size={20} color={hotelIdentityActionColor} />
              </Pressable>
            </View>
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
            { backgroundColor: hotelCanvasColor },
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
                      fontWeight: "700",
                      fontFamily: appFonts.bold,
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
              <View style={d.hotelCompareSection}>
                <Text style={[d.hotelCompareHeading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>Compare prices</Text>
                <Text style={[d.hotelCompareLead, { color: theme.dark ? theme.textSecondary : "#475569" }]}>
                  {stay.dateText ?? "Stay dates unavailable"} · {stay.occupancy}
                </Text>
                <View style={d.hotelCompareOffers}>
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
                  gap: 0,
                }]}
              >
                <View style={d.hotelOfferTop}>
                  {internal ? (
                    <Image
                      accessible
                      accessibilityLabel="Kurioticket"
                      accessibilityIgnoresInvertColors
                      source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
                      resizeMode="contain"
                      style={d.hotelOfferBrandLogo}
                    />
                  ) : (
                    <Text
                      style={[
                        d.hotelOfferProvider,
                        { color: theme.textPrimary },
                      ]}
                    >
                      {result.provider}
                    </Text>
                  )}
                  <View
                    style={[
                      d.selectionControl,
                      {
                        backgroundColor: theme.surface,
                        borderColor: selected ? hotelAccent : theme.textSecondary,
                      },
                    ]}
                  >
                    {selected ? (
                      <View style={[d.selectionControlDot, { backgroundColor: hotelAccent }]} />
                    ) : null}
                  </View>
                </View>
                <View style={d.hotelOfferPriceRow}>
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
                </View>
                <View style={d.hotelOfferBottom}>
                  <HotelOfferAmenityList
                    amenities={result.amenities}
                    color={theme.textSecondary}
                    compact={width < 350}
                  />
                  <Text numberOfLines={1} style={[d.hotelPerNight, { color: hotelAccent }]}>per night</Text>
                </View>
              </Pressable>;
              })}
                {!hotelOffers.length ? (
                <View style={[d.hotelOffer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[d.hotelOfferProvider, { color: theme.textPrimary }]}>{result.provider}</Text>
                  <Text style={[d.hotelSectionLead, { color: theme.textSecondary }]}>Planning inventory · no live checkout</Text>
                </View>
                ) : null}
                </View>
              </View>
              <NativeHotelPropertyLocationSection
                hotelId={result.id}
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
            <View style={d.hotelAboutPanel}>
              <Text style={[d.hotelAboutHeading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>
                About this hotel
              </Text>
              <Text
                style={[d.hotelAboutDescription, { color: theme.dark ? theme.textSecondary : "#475569" }]}
              >
                {property?.description ||
                  "A property description is not available yet."}
              </Text>
              <Text style={[d.hotelAboutSubheading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>
                Property highlights
              </Text>
              {highlights.length ? (
                <View style={d.hotelAboutHighlightGrid}>
                  {highlights.map((item) => {
                    const Icon = hotelAboutIconFor(item);
                    return (
                    <View
                      key={item.key}
                      style={[
                        d.hotelAboutHighlight,
                        {
                          backgroundColor: theme.dark ? theme.surface : "#F8FAFC",
                          borderColor: theme.dark ? theme.border : "#E2E8F0",
                        },
                      ]}
                    >
                      <Icon accessible={false} size={18} color={theme.dark ? hotelAccent : colors.blue} />
                      <Text
                        style={[d.hotelAboutHighlightText, { color: theme.dark ? theme.textPrimary : "#1E293B" }]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  );})}
                </View>
              ) : (
                <Text
                  style={[d.hotelAboutFallback, { color: theme.textSecondary }]}
                >
                  Property highlights are not available yet.
                </Text>
              )}
              <Text style={[d.hotelAboutSubheading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>
                All amenities
              </Text>
              {remainingAmenities.length ? (
                <View style={d.hotelAboutList}>
                  {remainingAmenities.map((item) => (
                    <View key={item.key} style={d.hotelAboutListItem}>
                      <View accessible={false} style={[d.hotelAboutBullet, { backgroundColor: hotelAccent }]} />
                      <Text style={[d.hotelAboutListText, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text
                  style={[d.hotelAboutFallback, { color: theme.textSecondary }]}
                >
                  All available amenities are shown in Property highlights.
                </Text>
              )}
              <Text style={[d.hotelAboutSubheading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>
                Room &amp; comfort
              </Text>
              <View style={d.hotelAboutInfoList}>
                {[property?.roomSummary, property?.bedSummary].filter((value): value is string => Boolean(value)).map((value) => (
                  <View key={value} style={d.hotelAboutInfoRow}><Bed accessible={false} size={18} color={theme.icon} /><Text style={[d.hotelAboutInfoText, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{value}</Text></View>
                ))}
                {!property?.roomSummary && !property?.bedSummary ? <Text style={[d.hotelAboutInfoText, { color: theme.textSecondary }]}>Room details are confirmed when you choose a room.</Text> : null}
              </View>
              <Text style={[d.hotelAboutSubheading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>
                Hotel information
              </Text>
              <View style={d.hotelAboutInfoList}>
                {property?.propertyType ? <View style={d.hotelAboutInfoRow}><Award accessible={false} size={18} color={theme.icon} /><Text style={[d.hotelAboutInfoText, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{property.propertyType}</Text></View> : null}
                <View style={d.hotelAboutInfoRow}><Award accessible={false} size={18} color={theme.icon} /><Text style={[d.hotelAboutInfoText, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{classification ? `${classification}-star classification` : "Hotel classification is not available."}</Text></View>
              </View>
              <Text style={[d.hotelAboutSubheading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>
                Accessibility
              </Text>
              {property?.accessibility?.length ? <View style={d.hotelAboutAccessibilityList}>{property.accessibility.map((detail) => <View key={detail} style={d.hotelAboutAccessibilityItem}><Text accessible={false} style={[d.hotelAboutAccessibilityBullet, { color: theme.dark ? hotelAccent : colors.blue }]}>•</Text><Text style={[d.hotelAboutAccessibilityText, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{detail}</Text></View>)}</View> : <Text style={[d.hotelAboutDescription, { color: theme.textSecondary }]}>Specific accessibility features should be confirmed before booking.</Text>}
            </View>
          ) : null}
          {activeHotelTab === "location" ? (
            <NativeHotelLocationSection
              hotelId={result.id}
              hotelName={result.name}
              propertyDetails={property}
              theme={theme}
            />
          ) : null}
          {activeHotelTab === "reviews" ? (
            <NativeHotelReviewsSection result={result} />
          ) : null}
        </View>
      </ScrollView>
      <View
        style={[
          d.hotelSticky,
          {
            paddingBottom: 12 + inset.bottom,
            backgroundColor: hotelCanvasColor,
          },
        ]}
      >
        <View style={d.hotelDockContent}>
          <View style={d.hotelDockPrice}>
            <View style={d.hotelDockLabel}>
              <Text style={[d.hotelDockEyebrow, { color: theme.textSecondary }]}>
                estimated stay total
              </Text>
              <Info accessible={false} size={12} color={theme.textSecondary} />
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.83}
              style={[d.hotelDockTotal, { color: theme.textPrimary }]}
            >
              {hasPrice ? (totalPrice?.formatted ?? "—") : "Price unavailable"}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={[d.hotelDockPerNight, { color: theme.textSecondary }]}
            >
              {hasPrice
                ? `${nightlyPrice?.formatted ?? "—"} per night`
                : "No live price supplied"}
            </Text>
          </View>
          <View style={d.hotelDockAction}>
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
        </View>
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
  hotelBackHeader: { minHeight: 48, paddingHorizontal: 16, justifyContent: "center", backgroundColor: "white" },
  hotelIdentity: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  hotelIdentityTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  hotelIdentityCopy: { flex: 1, minWidth: 0 },
  hotelIdentityMeta: { marginTop: 8, gap: 4 },
  hotelBackToResultsText: { fontSize: 14, lineHeight: 19, fontWeight: "700" },
  hotelHeaderActions: { flexDirection: "row", flexShrink: 0, gap: 0 },
  hotelHeaderAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hotelHeaderActionSave: { alignItems: "flex-end", paddingRight: 4 },
  hotelHeaderActionShare: { alignItems: "flex-start", paddingLeft: 4 },
  hotelFact: { color: "#334155", fontSize: 12, lineHeight: 18, fontWeight: "500", fontFamily: appFonts.medium },
  hotelClassificationStars: { color: "#F59E0B", fontSize: 15, lineHeight: 20, letterSpacing: 1.2, fontWeight: "400", fontFamily: appFonts.regular },
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
  hotelName: { minWidth: 0, fontSize: 20, lineHeight: 26, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: -0.4, color: ui.navy },
  hotelNamePhoneFit: { letterSpacing: -0.55 },
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
  },
  hotelFactRow: { minHeight: 20, flexDirection: "row", alignItems: "flex-start", gap: 6 },
  hotelTabTextCompact: { fontSize: 10 },
  hotelDetailBody: { paddingHorizontal: 16, paddingVertical: 20, gap: 12 },
  hotelCompareSection: { paddingVertical: 8 },
  hotelCompareHeading: { fontSize: 18, lineHeight: 24, fontWeight: "600", fontFamily: appFonts.semibold, letterSpacing: -0.25 },
  hotelCompareLead: { marginTop: 4, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  hotelCompareOffers: { marginTop: 20, gap: 12 },
  hotelHeading: { fontSize: 20, lineHeight: 26, fontWeight: "900" },
  hotelSubheading: { fontSize: 15, lineHeight: 20, fontWeight: "900", marginTop: 6 },
  hotelOffer: { borderWidth: 1.5, borderRadius: 13, padding: 16, gap: 16 },
  hotelOfferTop: { minWidth: 0, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  hotelOfferBrandLogo: { width: 108, height: 24, flexShrink: 0 },
  hotelOfferProvider: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  selectionControl: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  selectionControlDot: { width: 6, height: 6, borderRadius: 3 },
  hotelOfferBottom: { marginTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  hotelOfferPriceRow: { minWidth: 0, marginTop: 12, alignItems: "flex-end" },
  hotelNightly: { fontSize: 18, lineHeight: 22, fontWeight: "700", fontFamily: appFonts.bold, textAlign: "right" },
  hotelPerNight: { flexShrink: 0, fontSize: 10, lineHeight: 14, fontWeight: "500", fontFamily: appFonts.medium, textAlign: "right" },
  hotelAboutPanel: {},
  hotelAboutHeading: { fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: -0.25 },
  hotelAboutDescription: { marginTop: 12, fontSize: 13, lineHeight: 22, fontWeight: "400", fontFamily: appFonts.regular },
  hotelAboutSubheading: { marginTop: 28, fontSize: 15, lineHeight: 22, fontWeight: "600", fontFamily: appFonts.semibold },
  hotelAboutFallback: { marginTop: 8, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  hotelAboutHighlightGrid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 10 },
  hotelAboutHighlight: { width: "48%", minHeight: 56, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  hotelAboutHighlightText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, fontWeight: "500", fontFamily: appFonts.medium },
  hotelAboutList: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", columnGap: 24, rowGap: 12 },
  hotelAboutListItem: { width: "45%", flexDirection: "row", alignItems: "flex-start", gap: 8 },
  hotelAboutBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  hotelAboutListText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  hotelAboutInfoList: { marginTop: 12, gap: 12 },
  hotelAboutInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  hotelAboutInfoText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  hotelAboutAccessibilityList: { marginTop: 12, gap: 8 },
  hotelAboutAccessibilityItem: { flexDirection: "row", alignItems: "flex-start" },
  hotelAboutAccessibilityBullet: { width: 20, fontSize: 14, lineHeight: 24 },
  hotelAboutAccessibilityText: { flex: 1, fontSize: 13, lineHeight: 22, fontWeight: "400", fontFamily: appFonts.regular },
  mapsButton: { alignSelf: "flex-start", minHeight: 44, borderRadius: 8, paddingHorizontal: 15, backgroundColor: colors.blue, flexDirection: "row", alignItems: "center", gap: 8 },
  mapsButtonText: { color: "white", fontSize: 13, fontWeight: "800" },
  hotelDockContent: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  hotelDockPrice: { flex: 1, minWidth: 0, gap: 1 },
  hotelDockLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  hotelDockEyebrow: { fontSize: 11, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  hotelDockTotal: { fontSize: 24, lineHeight: 30, fontWeight: "800", fontFamily: appFonts.extraBold, textAlign: "left" },
  hotelDockPerNight: { fontSize: 11, lineHeight: 16, fontWeight: "400", fontFamily: appFonts.regular, textAlign: "left" },
  hotelDockAction: { flex: 0.9, minWidth: 132 },
  hotelContinue: { width: "100%", minHeight: 48, borderRadius: 8, backgroundColor: colors.blue, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  hotelContinuePressed: { backgroundColor: "#003B91" },
  hotelContinueDisabled: { opacity: 0.5 },
  hotelContinueText: { color: "white", fontSize: 12, lineHeight: 16, fontWeight: "700", fontFamily: appFonts.bold, textAlign: "center" },

});
