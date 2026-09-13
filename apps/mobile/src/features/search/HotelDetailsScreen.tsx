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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { ArrowLeft, Heart, Info, Users } from "lucide-react-native";
import { travelApi, type HotelResult, type MobileHotelDetailsResponse } from "../../api/travelApi";
import { useAppTheme } from "../../theme/AppTheme";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import { readCurrencyPreference } from "../../storage/preferenceStorage";
import { useCanonicalSaved } from "../../storage/useCanonicalSaved";
import { FlowIcon } from "../flow/FlowIcon";
import { HOTEL_LIMITS } from "../flow/hotelSearchModel";
import {
  resolveDisplayCurrencyContext,
  type DisplayCurrencyResolution,
  type ExchangeRates,
} from "../currency/displayCurrency";
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { visualHotels } from "./visualFixtures";
import {
  canonicalHotelAddress,
  HotelRoomOptionsModal,
  hotelStaySummary,
  NativeHotelGallery,
} from "./NativeHotelDetails";
import {
  nativeHotelOffers,
  nativeHotelProviderUrl,
  reconcileNativeHotelOfferSelection,
  type NativeHotelOffer,
} from "./nativeHotelDetailsModel";
import {
  canReuseHotelDisplayPrices,
  createHotelDisplayPrices,
  createHotelRoomDisplayPrice,
  type HotelDisplayPriceSnapshot,
} from "./hotelDetailCurrency";
import { prepareNativeRelatedHotels, type NativeRelatedHotel } from "./nativeHotelRelatedHotelsModel";
import { NativeHotelReviewsSection, nativeHotelReviewPresentation } from "./NativeHotelReviewsSection";
import { HotelOfferAmenityList } from "./HotelCardAmenityList";
import { hotelResultsDismissCount } from "./hotelDetailReturnNavigation";
import { HotelStayEditor } from "./HotelStayEditor";
import { NativeHotelBookingDetails } from "./NativeHotelBookingDetails";

type HotelDetailTab = "details" | "reviews" | "deals";
type HotelDetailsStatus = "loading" | "ready" | "error";

const parse = <T,>(value?: string | string[]) => {
  try {
    return JSON.parse(Array.isArray(value) ? value[0] : value || "") as T;
  } catch {
    return undefined;
  }
};

const positiveCount = (
  value: string | string[] | undefined,
  fallback: number,
  maximum: number,
) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  const parsed = Number(raw);
  return parsed >= 1 && parsed <= maximum ? parsed : fallback;
};

export function HotelDetailsScreen() {
  const { theme } = useAppTheme();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const visualTest =
    process.env.EXPO_PUBLIC_VISUAL_TEST === "1" && params.visual === "1";
  const result =
    parse<HotelResult>(params.result) ??
    (visualTest ? visualHotels[0] : undefined);

  if (!result) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
        <View style={s.missing}>
          <Text style={[s.missingTitle, { color: theme.textPrimary }]}>This offer is no longer available</Text>
          <Text style={[s.missingText, { color: theme.textSecondary }]}>Return to results and refresh the search.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={s.missingButton}>
            <Text style={s.missingButtonText}>Back to results</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <HotelDetail result={result} params={params} />;
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
  const hotelStickyTabsTop = inset.top + 72;
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
  const [activeHotelTab, setActiveHotelTab] = useState<HotelDetailTab>("details");
  const activeHotelTabRef = useRef<HotelDetailTab>("details");
  const hotelDetailScrollRef = useRef<ScrollView>(null);
  const currentHotelScrollOffset = useRef(0);
  const restoringHotelTabScrollRef = useRef(false);
  const hotelTabsStickyStartRef = useRef<number | null>(null);
  const hotelTabsPinnedRef = useRef(false);
  const [hotelTabsPinned, setHotelTabsPinned] = useState(false);
  const hotelTabScrollOffsets = useRef<Record<HotelDetailTab, number | null>>({
    details: 0,
    reviews: null,
    deals: null,
  });
  const [detailsState, setDetailsState] = useState<{
    key: string;
    status: HotelDetailsStatus;
    response: MobileHotelDetailsResponse | null;
  } | null>(null);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<NativeHotelOffer["id"] | null>(null);
  const guestCount = positiveCount(params.guests, 2, HOTEL_LIMITS.guests.max);
  const roomCount = positiveCount(params.rooms, 1, HOTEL_LIMITS.rooms.max);
  const hotelResultsStack =
    (Array.isArray(params.hotelResultsStack)
      ? params.hotelResultsStack[0]
      : params.hotelResultsStack) === "1";
  const relatedHotelsStack =
    (Array.isArray(params.relatedHotelsStack)
      ? params.relatedHotelsStack[0]
      : params.relatedHotelsStack) === "1";

  useEffect(() => {
    setSelectedOfferId(null);
    setRoomsOpen(false);
  }, [result.id]);

  const checkIn = String(params.checkIn || "");
  const checkOut = String(params.checkOut || "");
  const enrichmentKey = `${result.id}\u0000${checkIn}\u0000${checkOut}\u0000${guestCount}\u0000${roomCount}`;
  const details = detailsState?.key === enrichmentKey ? detailsState.response : null;
  const detailsStatus: HotelDetailsStatus = detailsState?.key === enrichmentKey
    ? detailsState.status
    : "loading";

  useEffect(() => {
    const controller = new AbortController();
    let eligible = true;
    setDetailsState({ key: enrichmentKey, status: "loading", response: null });
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
        if (!eligible) return;
        if (response.hotel?.id !== result.id) {
          setDetailsState({ key: enrichmentKey, status: "error", response: null });
          return;
        }
        setDetailsState({ key: enrichmentKey, status: "ready", response });
      })
      .catch(() => {
        if (eligible && !controller.signal.aborted) {
          setDetailsState({ key: enrichmentKey, status: "error", response: null });
        }
      });
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
  const hotelReview = nativeHotelReviewPresentation(result);
  const hotelReviewScore = hotelReview?.score.split(" / ")[0] ?? null;
  const redirectUrl = nativeHotelProviderUrl(
    result.partnerRedirectUrl,
    result.bookingUrl,
  );
  const providerBookable = result.searchPolicy.bookable && Boolean(redirectUrl);
  const internalRoomFlowAvailable = roomOptions.length > 0;
  const hotelOffers = nativeHotelOffers(internalRoomFlowAvailable, providerBookable);
  const offerKey = hotelOffers.map(({ id }) => id).join("\u0000");

  useEffect(() => {
    setSelectedOfferId((current) =>
      reconcileNativeHotelOfferSelection(current, hotelOffers),
    );
  }, [offerKey]);

  const selectedOffer =
    hotelOffers.find(({ id }) => id === selectedOfferId) ?? hotelOffers[0] ?? null;
  const canContinue = selectedOffer !== null;
  const hasPrice = result.pricePerNight != null && result.totalPrice != null;
  const passedDisplayPrices = parse<HotelDisplayPriceSnapshot>(
    params.hotelDisplayPrices,
  );
  const passedDisplayCurrencyContext = parse<DisplayCurrencyResolution>(
    params.displayCurrencyContext,
  );
  const providerDisplayPrices = hasPrice
    ? createHotelDisplayPrices(
        result.pricePerNight!,
        result.totalPrice!,
        result.currency,
        result.currency,
        {},
      )
    : null;
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
      : providerDisplayPrices;
  const hotelPriceStateKey = `${result.id}\u0000${result.currency}\u0000${result.pricePerNight ?? ""}\u0000${result.totalPrice ?? ""}`;
  const [displayPriceState, setDisplayPriceState] = useState<{
    key: string;
    prices: HotelDisplayPriceSnapshot | null;
  }>({ key: hotelPriceStateKey, prices: initiallyValidDisplayPrices });
  const displayPrices =
    displayPriceState.key === hotelPriceStateKey
      ? displayPriceState.prices
      : initiallyValidDisplayPrices;
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
            setDisplayPriceState({
              key: hotelPriceStateKey,
              prices: passedDisplayPrices!,
            });
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
          if (
            canReuseHotelDisplayPrices({
              snapshot: passedDisplayPrices,
              providerNightly: result.pricePerNight!,
              providerTotal: result.totalPrice!,
              providerCurrency: result.currency,
              displayCurrency: passedDisplayCurrencyContext?.resolvedCurrency,
              preferredCurrency,
            })
          ) return;
          const resolution = resolveDisplayCurrencyContext({
            preferredCurrency,
            ipCountryCode: location?.countryCode,
            locale: Intl.DateTimeFormat().resolvedOptions().locale,
          });
          setDisplayPriceState({
            key: hotelPriceStateKey,
            prices: createHotelDisplayPrices(
              result.pricePerNight!,
              result.totalPrice!,
              result.currency,
              resolution.resolvedCurrency,
              rates,
            ),
          });
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
      hotelPriceStateKey,
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
    const consistentContext =
      snapshot?.nightly?.currency &&
      snapshot.nightly.currency === snapshot.total?.currency &&
      snapshot.nightly.currency === passedDisplayCurrencyContext?.resolvedCurrency;
    router.push({
      pathname: "/hotel-details",
      params: {
        result: JSON.stringify(item.result),
        destination: String(
          params.destination || property?.city || result.location,
        ),
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
    if (
      selectedOffer?.kind !== "provider-handoff" ||
      !providerBookable ||
      !redirectUrl
    ) return;
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
    if (relatedHotelsStack) {
      router.back();
      return;
    }
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

  const titleColor = theme.dark ? theme.textPrimary : "#020617";
  const metaColor = theme.dark ? theme.textSecondary : "#475569";
  const iconColor = theme.dark ? theme.icon : "#0F172A";

  const syncHotelTabsPinned = useCallback((offset: number) => {
    const stickyStart = hotelTabsStickyStartRef.current;
    const nextPinned = stickyStart !== null && offset >= stickyStart;
    if (nextPinned === hotelTabsPinnedRef.current) return;
    hotelTabsPinnedRef.current = nextPinned;
    setHotelTabsPinned(nextPinned);
  }, []);

  const selectHotelTab = useCallback((tab: HotelDetailTab) => {
    if (tab === activeHotelTabRef.current) return;
    const targetOffset =
      hotelTabScrollOffsets.current[tab] ?? currentHotelScrollOffset.current;
    restoringHotelTabScrollRef.current = true;
    activeHotelTabRef.current = tab;
    setActiveHotelTab(tab);
    requestAnimationFrame(() => {
      hotelDetailScrollRef.current?.scrollTo({ y: targetOffset, animated: false });
      currentHotelScrollOffset.current = targetOffset;
      syncHotelTabsPinned(targetOffset);
      requestAnimationFrame(() => {
        restoringHotelTabScrollRef.current = false;
      });
    });
  }, [syncHotelTabsPinned]);

  useEffect(() => {
    restoringHotelTabScrollRef.current = true;
    activeHotelTabRef.current = "details";
    setActiveHotelTab("details");
    currentHotelScrollOffset.current = 0;
    hotelTabsStickyStartRef.current = null;
    hotelTabsPinnedRef.current = false;
    setHotelTabsPinned(false);
    hotelTabScrollOffsets.current = { details: 0, reviews: null, deals: null };
    requestAnimationFrame(() => {
      hotelDetailScrollRef.current?.scrollTo({ y: 0, animated: false });
      requestAnimationFrame(() => {
        restoringHotelTabScrollRef.current = false;
      });
    });
  }, [result.id]);

  return (
    <SafeAreaView
      style={[s.safe, { backgroundColor: hotelCanvasColor }]}
      edges={[]}
    >
      <ScrollView
        ref={hotelDetailScrollRef}
        stickyHeaderIndices={[2]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const offset = event.nativeEvent.contentOffset.y;
          if (!restoringHotelTabScrollRef.current) {
            hotelTabScrollOffsets.current[activeHotelTabRef.current] = offset;
          }
          currentHotelScrollOffset.current = offset;
          syncHotelTabsPinned(offset);
        }}
        scrollEventThrottle={16}
      >
        <NativeHotelGallery
          images={images}
          name={result.name}
          width={width}
        />

        <View style={s.identitySection}>
          <View style={s.titleRow}>
            <View style={s.titleCopy}>
              <Text style={[s.hotelTitle, { color: titleColor }]}>{result.name}</Text>
              {classification ? (
                <Text
                  accessible
                  accessibilityLabel={`${classification} star hotel`}
                  style={s.classificationStars}
                >
                  {"★".repeat(classification)}
                </Text>
              ) : null}
              {address ? <Text style={[s.hotelMeta, { color: metaColor }]}>{address}</Text> : null}
            </View>
            {hotelReviewScore ? (
              <View style={s.reviewScore}>
                <Text style={s.reviewScoreText}>{hotelReviewScore}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          onLayout={(event) => {
            if (hotelTabsStickyStartRef.current === null) {
              hotelTabsStickyStartRef.current = event.nativeEvent.layout.y;
            }
          }}
          style={[
            s.tabsSticky,
            { backgroundColor: hotelCanvasColor },
            hotelTabsPinned && [
              s.tabsStickyPinned,
              { paddingTop: hotelStickyTabsTop },
            ],
          ]}
        >
          <View style={s.tabsRow}>
            {(["details", "reviews", "deals"] as HotelDetailTab[]).map((tab) => {
              const active = tab === activeHotelTab;
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => selectHotelTab(tab)}
                  style={s.tab}
                >
                  <Text
                    style={[
                      s.tabText,
                      { color: active ? hotelAccent : metaColor },
                      active && s.tabTextActive,
                    ]}
                  >
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </Text>
                  {active ? <View style={[s.tabIndicator, { backgroundColor: hotelAccent }]} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <HotelStayEditor
          stay={stay}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guestCount}
          rooms={roomCount}
          theme={theme}
        />

        <View style={s.detailBody}>
          {activeHotelTab === "details" ? (
            <NativeHotelBookingDetails
              result={result}
              property={property}
              detailsStatus={detailsStatus}
              classification={classification}
              relatedHotels={relatedHotels}
              theme={theme}
              onViewHotel={viewRelatedHotel}
            />
          ) : null}
          {activeHotelTab === "reviews" ? (
            <NativeHotelReviewsSection result={result} />
          ) : null}
          {activeHotelTab === "deals" ? (
            <View style={s.dealsTab}>
              <HotelOfferAmenityList
                amenities={result.amenities}
                amenityLabels={result.amenities.map((amenity) => nativeHotelAmenityLabel({ label: amenity, iconKey: "other" }))}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to hotel results"
        onPress={returnToHotelResults}
        style={[s.heroBack, { top: inset.top + 12 }]}
      >
        <ArrowLeft size={25} strokeWidth={2.2} color="#0F172A" />
      </Pressable>

      <View style={[s.heroActions, { top: inset.top + 12 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove hotel from saved" : "Save hotel"}
          onPress={() => canonical.toggle({ type: "hotel", payload: { result } })}
          style={s.heroAction}
        >
          <Heart
            size={23}
            strokeWidth={2.1}
            color={saved ? androidFavoriteColors.active : "#0F172A"}
            fill={saved ? androidFavoriteColors.active : "none"}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share hotel"
          onPress={shareHotel}
          style={s.heroAction}
        >
          <FlowIcon name="share" size={23} color="#0F172A" />
        </Pressable>
      </View>

      <View style={[s.bookingBar, { backgroundColor: hotelCanvasColor, borderTopColor: theme.border }]}> 
        <View style={s.bookingPrice}>
          <View style={s.totalLabelRow}>
            <Text style={[s.totalLabel, { color: metaColor }]}>estimated stay total</Text>
            <Info accessible={false} size={14} color={metaColor} />
          </View>
          <Text style={[s.totalValue, { color: titleColor }]}>{totalPrice?.formatted ?? "Price unavailable"}</Text>
          {nightlyPrice ? <Text style={[s.nightlyValue, { color: metaColor }]}>{nightlyPrice.formatted} per night</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue booking"
          accessibilityState={{ disabled: !canContinue }}
          disabled={!canContinue}
          onPress={() => void continueBooking()}
          style={({ pressed }) => [
            s.continueButton,
            !canContinue && s.continueButtonDisabled,
            pressed && canContinue && s.continueButtonPressed,
          ]}
        >
          <Text style={s.continueButtonText}>Continue booking</Text>
        </Pressable>
      </View>

      <HotelRoomOptionsModal
        visible={roomsOpen}
        onClose={() => setRoomsOpen(false)}
        options={presentedRoomOptions}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  missing: { flex: 1, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  missingTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700", fontFamily: appFonts.bold, textAlign: "center" },
  missingText: { marginTop: 6, fontSize: 14, lineHeight: 20, fontFamily: appFonts.regular, textAlign: "center" },
  missingButton: { marginTop: 18, minHeight: 46, borderRadius: 12, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  missingButtonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 21, fontWeight: "600", fontFamily: appFonts.semibold },
  identitySection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  titleCopy: { flex: 1, minWidth: 0 },
  hotelTitle: { fontSize: 24, lineHeight: 30, fontWeight: "700", fontFamily: appFonts.bold },
  classificationStars: { marginTop: 4, color: "#F59E0B", fontSize: 13, lineHeight: 18, letterSpacing: 1.04, fontFamily: appFonts.regular },
  hotelMeta: { marginTop: 4, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  reviewScore: { minWidth: 38, height: 38, borderRadius: 8, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  reviewScoreText: { color: "#FFFFFF", fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold },
  tabsSticky: { zIndex: 5 },
  tabsStickyPinned: { shadowColor: "#000000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  tabsRow: { minHeight: 48, flexDirection: "row", alignItems: "stretch", paddingHorizontal: 16 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  tabText: { fontSize: 14, lineHeight: 20, fontWeight: "500", fontFamily: appFonts.medium },
  tabTextActive: { fontWeight: "700", fontFamily: appFonts.bold },
  tabIndicator: { position: "absolute", left: 10, right: 10, bottom: 0, height: 2, borderRadius: 1 },
  detailBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 124 },
  dealsTab: { paddingVertical: 4 },
  heroBack: { position: "absolute", left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", zIndex: 20, shadowColor: "#000000", shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  heroActions: { position: "absolute", right: 20, flexDirection: "row", gap: 10, zIndex: 20 },
  heroAction: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000000", shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  bookingBar: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 96, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  bookingPrice: { flex: 1, minWidth: 0 },
  totalLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  totalLabel: { fontSize: 12, lineHeight: 16, fontWeight: "400", fontFamily: appFonts.regular },
  totalValue: { marginTop: 1, fontSize: 17, lineHeight: 22, fontWeight: "700", fontFamily: appFonts.bold },
  nightlyValue: { marginTop: 1, fontSize: 12, lineHeight: 16, fontWeight: "400", fontFamily: appFonts.regular },
  continueButton: { minWidth: 146, minHeight: 50, borderRadius: 12, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  continueButtonDisabled: { opacity: 0.45 },
  continueButtonPressed: { opacity: 0.78 },
  continueButtonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 21, fontWeight: "700", fontFamily: appFonts.bold },
});
