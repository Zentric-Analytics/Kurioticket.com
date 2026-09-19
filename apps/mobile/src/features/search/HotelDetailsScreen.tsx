import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { ArrowLeft, Heart, Users } from "lucide-react-native";
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
import { hotelResultsDismissCount } from "./hotelDetailReturnNavigation";
import { HotelStayEditor } from "./HotelStayEditor";
import { NativeHotelBookingDetails } from "./NativeHotelBookingDetails";
import { NativeHotelRatesSection } from "./NativeHotelRatesSection";
import { HotelDetailsLoadingState } from "./HotelDetailsLoadingState";

type HotelDetailTab = "details" | "reviews" | "deals";
type HotelDetailsStatus = "loading" | "ready" | "error";

const hotelDetailTabLabels: Record<HotelDetailTab, string> = {
  details: "Overview",
  reviews: "Reviews",
  deals: "Rates",
};

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
  const [activeHotelTab, setActiveHotelTab] = useState<HotelDetailTab>("deals");
  const activeHotelTabRef = useRef<HotelDetailTab>("deals");
  const hotelDetailScrollRef = useRef<ScrollView>(null);
  const currentHotelScrollOffset = useRef(0);
  const restoringHotelTabScrollRef = useRef(false);
  const hotelTabsStickyStartRef = useRef<number | null>(null);
  const hotelTabsPinnedRef = useRef(false);
  const [hotelTabsPinned, setHotelTabsPinned] = useState(false);
  const hotelTabScrollOffsets = useRef<Record<HotelDetailTab, number | null>>({
    details: null,
    reviews: null,
    deals: 0,
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

  const reserveOffer = async (offerId: NativeHotelOffer["id"]) => {
    const offer = hotelOffers.find(({ id }) => id === offerId);
    if (!offer) return;
    setSelectedOfferId(offer.id);
    if (offer.kind === "internal-room-flow") {
      setRoomsOpen(true);
      return;
    }
    if (offer.kind !== "provider-handoff" || !providerBookable || !redirectUrl) return;
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
    activeHotelTabRef.current = "deals";
    setActiveHotelTab("deals");
    currentHotelScrollOffset.current = 0;
    hotelTabsStickyStartRef.current = null;
    hotelTabsPinnedRef.current = false;
    setHotelTabsPinned(false);
    hotelTabScrollOffsets.current = { details: null, reviews: null, deals: 0 };
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
        contentInsetAdjustmentBehavior="never"
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        style={{ backgroundColor: hotelCanvasColor }}
        contentContainerStyle={{ paddingBottom: 24 + inset.bottom }}
        onScroll={({ nativeEvent }) => {
          const offset = nativeEvent.contentOffset.y;
          currentHotelScrollOffset.current = offset;
          syncHotelTabsPinned(offset);
          if (!restoringHotelTabScrollRef.current) {
            hotelTabScrollOffsets.current[activeHotelTabRef.current] = offset;
          }
        }}
        scrollEventThrottle={16}
      >
        <View style={s.heroShell}>
          <NativeHotelGallery
            name={result.name}
            initialImages={images}
            theme={theme}
            accentColor={hotelAccent}
          />
        </View>

        <View style={s.identity}>
          <Text
            accessibilityRole="header"
            style={[s.hotelName, width <= 430 && s.hotelNamePhoneFit, { color: titleColor }]}
          >
            {result.name}
          </Text>
          {classification ? (
            <Text accessibilityLabel={`${classification} star hotel`} style={s.stars}>
              {"★".repeat(classification)}
            </Text>
          ) : null}
          {hotelReview && hotelReviewScore ? (
            <View style={s.reviewSummary}>
              <Users accessible={false} size={18} color={iconColor} />
              <Text style={[s.reviewText, { color: titleColor }]}> 
                <Text style={s.reviewPrimary}>{hotelReview.label} {hotelReviewScore}</Text>
                <Text style={[s.reviewSecondary, { color: metaColor }]}> · {hotelReview.count}</Text>
              </Text>
            </View>
          ) : null}
        </View>

        <View
          onLayout={({ nativeEvent }) => {
            hotelTabsStickyStartRef.current = nativeEvent.layout.y;
            syncHotelTabsPinned(currentHotelScrollOffset.current);
          }}
          style={[
            s.tabsShell,
            {
              paddingTop: hotelStickyTabsTop,
              marginTop: 1 - hotelStickyTabsTop,
              backgroundColor: hotelTabsPinned ? hotelCanvasColor : "transparent",
            },
          ]}
        >
          <View
            accessibilityRole="tablist"
            style={[s.tabsRow, { backgroundColor: hotelCanvasColor }]}
          >
            {(["deals", "details", "reviews"] as const).map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeHotelTab === tab }}
                onPress={() => selectHotelTab(tab)}
                style={[
                  s.tab,
                  activeHotelTab === tab && { borderBottomColor: hotelAccent },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    s.tabText,
                    width < 350 && s.tabTextCompact,
                    { color: theme.dark ? theme.textPrimary : "#1A1A1A" },
                    activeHotelTab === tab && { color: hotelAccent },
                  ]}
                >
                  {hotelDetailTabLabels[tab]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {activeHotelTab === "details" ? (
          <HotelStayEditor
            result={result}
            destination={String(params.destination || property?.city || result.location)}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guestCount}
            rooms={roomCount}
          />
        ) : null}

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
            <NativeHotelRatesSection
              offers={hotelOffers}
              selectedOfferId={selectedOffer?.id ?? null}
              onSelectOffer={(offerId) => void reserveOffer(offerId)}
              roomOptions={presentedRoomOptions}
              providerName={result.provider}
              roomType={result.roomType}
              cancellationInfo={result.cancellationInfo}
              nightlyPrice={nightlyPrice ?? null}
              hasPrice={hasPrice}
              detailsStatus={detailsStatus}
              theme={theme}
              accentColor={hotelAccent}
            />
          ) : null}
        </View>
      </ScrollView>

      {detailsStatus === "loading" ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            s.detailsLoadingOverlay,
            { backgroundColor: hotelCanvasColor },
          ]}
        >
          <HotelDetailsLoadingState hotelName={result.name} width={width} theme={theme} />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to hotel results"
        onPress={returnToHotelResults}
        style={[
          s.heroBack,
          {
            top: inset.top + 12,
            zIndex: detailsStatus === "loading" ? 40 : 20,
          },
        ]}
      >
        <ArrowLeft size={25} strokeWidth={2.2} color="#0F172A" />
      </Pressable>
      <View style={[s.heroActions, { top: inset.top + 12 }]}> 
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${result.name} hotel from saved` : `Save ${result.name} hotel`}
          accessibilityState={{ selected: saved }}
          onPress={() => void canonical.toggleHotel(result, params)}
          style={s.heroAction}
        >
          <View pointerEvents="none" style={s.heroHeartIcon}>
            <Heart
              size={22}
              strokeWidth={androidFavoriteColors.strokeWidth}
              color={saved ? androidFavoriteColors.savedStroke : androidFavoriteColors.unsavedStroke}
              fill={saved ? androidFavoriteColors.savedFill : androidFavoriteColors.unsavedFill}
            />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${result.name}`}
          onPress={shareHotel}
          style={s.heroAction}
        >
          <View pointerEvents="none" style={s.heroShareIcon}>
            <FlowIcon name="share" size={22} strokeWidth={androidFavoriteColors.strokeWidth} color={androidFavoriteColors.shareStroke} />
          </View>
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 30 },
  missingTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold, textAlign: "center" },
  missingText: { fontSize: 13, lineHeight: 20, fontFamily: appFonts.regular, textAlign: "center" },
  missingButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 8, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  missingButtonText: { color: "white", fontSize: 14, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
  detailsLoadingOverlay: { zIndex: 30, overflow: "hidden" },
  heroShell: { position: "relative", width: "100%" },
  heroBack: { position: "absolute", left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", zIndex: 20, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 10 },
  heroActions: { position: "absolute", right: 20, width: 96, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", flexDirection: "row", overflow: "hidden", zIndex: 20, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 10 },
  heroAction: { width: 48, height: 44, alignItems: "center", justifyContent: "center" },
  heroHeartIcon: { transform: [{ translateX: 6 }] },
  heroShareIcon: { transform: [{ translateX: -6 }] },
  identity: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  hotelName: { minWidth: 0, fontSize: 24, lineHeight: 30, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: -0.5 },
  hotelNamePhoneFit: { letterSpacing: -0.6 },
  stars: { marginTop: 4, color: "#F59E0B", fontSize: 20, lineHeight: 24, letterSpacing: 1.4, fontWeight: "400", fontFamily: appFonts.regular },
  reviewSummary: { marginTop: 5, minHeight: 22, flexDirection: "row", alignItems: "center", gap: 8 },
  reviewText: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20 },
  reviewPrimary: { fontWeight: "700", fontFamily: appFonts.bold },
  reviewSecondary: { fontWeight: "400", fontFamily: appFonts.regular },
  tabsShell: { width: "100%", alignSelf: "stretch", minHeight: 45, paddingHorizontal: 8, zIndex: 10 },
  tabsRow: { alignSelf: "stretch", minHeight: 44, flexDirection: "row", flexWrap: "nowrap", alignItems: "stretch" },
  tab: { width: "33.333%", flexGrow: 0, flexShrink: 0, minWidth: 0, minHeight: 44, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold },
  tabTextCompact: { fontSize: 12 },
  detailBody: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 6 },
});
