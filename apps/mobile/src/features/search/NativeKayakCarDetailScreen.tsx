import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { ArrowLeft, BriefcaseBusiness, CarFront, Clock3, DoorOpen, ExternalLink, Heart, MapPin, Share2, Users } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { travelApi, type CarResult } from "../../api/travelApi";
import { getApiBaseUrl } from "../../config/apiUrl";
import { appFonts } from "../../theme/typography";
import { colors } from "../../theme/tokens";
import { useAppTheme } from "../../theme/AppTheme";
import { formatMarketCurrency } from "../currency/displayCurrency";
import { buildSearchPlan, safeCanonicalCarResult } from "../flow/travelSearchModel";
import { Button, money } from "./SearchUi";
import { useSavedCar } from "./carSavedState";
import { carResultsDismissCount } from "./carDetailReturnNavigation";
import { comparisonCarOffers, primaryValidCarOffer } from "./carDetailState";
import { presentCarOfferCurrency } from "./carDisplayCurrency";
import { useCarDisplayCurrency } from "./useCarDisplayCurrency";
import { nativeCarDetailDate, nativeCarDirectionsUrl, nativeCarLocationEmbedUrl, nativeCarRentalDays } from "./nativeCarDetailsModel";
import { nativeCarTrustedMapCoordinates } from "./nativeCarMapReferences";
import { NativeAppleCarMap } from "./NativeAppleCarMap";
import { NativeCarFullMapModal } from "./NativeCarFullMapModal";
import { isKayakSandboxCar, nativeCarPrimarySpecLabels } from "./nativeCarProviderPresentation";
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { DetailGlassSurface } from "./DetailGlassSurface";
import { carDetailHeaderProtectionGeometry } from "./carDetailHeaderProtection";

type Params = Record<string, string | string[]>;
const CAR_DETAIL_LIGHT_CANVAS = "#F5F7FB";
type Status = "loading" | "ready" | "unavailable";
type Theme = ReturnType<typeof useAppTheme>["theme"];
type CarDetailTab = "compare" | "pickup" | "location";

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const parseResult = (value?: string) => {
  try { return value ? JSON.parse(value) as CarResult : undefined; }
  catch { return undefined; }
};
const resolveImage = (value?: string) => {
  if (!value) return undefined;
  if (/^https:\/\//i.test(value)) return value;
  const base = getApiBaseUrl();
  return base.ok && /^\/(?!\/)/.test(value) ? new URL(value, `${base.baseUrl}/`).toString() : undefined;
};
const providerValue = (value?: string) => {
  const trimmed = value?.trim() || "";
  return trimmed === "Supplier not supplied" || trimmed === "KAYAK sandbox" ? "" : trimmed;
};

export function NativeKayakCarDetailScreen() {
  const params = useLocalSearchParams<Params>();
  const plan = useMemo(() => buildSearchPlan("car", params), [JSON.stringify(params)]);
  const supplied = parseResult(one(params.result));
  const initial = supplied && isKayakSandboxCar(supplied) && safeCanonicalCarResult(supplied) ? supplied : undefined;
  const [result, setResult] = useState<CarResult | undefined>(initial);
  const [status, setStatus] = useState<Status>(initial ? "ready" : "loading");

  useEffect(() => {
    if (initial) {
      setResult(initial);
      setStatus("ready");
      return;
    }
    const resultId = one(params.resultId);
    if (!plan.plan || !resultId) {
      setStatus("unavailable");
      return;
    }
    let active = true;
    void travelApi.searchCars(plan.plan.payload)
      .then((response) => {
        if (!active) return;
        const found = response.results.find((item) => item.id === resultId && isKayakSandboxCar(item) && safeCanonicalCarResult(item));
        setResult(found);
        setStatus(found ? "ready" : "unavailable");
      })
      .catch(() => active && setStatus("unavailable"));
    return () => { active = false; };
  }, [initial?.id, plan.plan?.key, one(params.resultId)]);

  if (status === "loading") return <KayakCarDetailLoading />;
  if (!result) return <KayakCarUnavailable />;
  return <KayakCarDetailContent result={result} params={params} />;
}

function KayakCarDetailContent({ result, params }: { result: CarResult; params: Params }) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  const navigation = useNavigation();
  const width = useWindowDimensions().width;
  const heroControlSafeZoneHeight = inset.top + 12 + 44 + 14;
  const heroVehicleStageHeight = Math.min(224, Math.max(176, width * 0.5));
  const heroMediaHeight = heroControlSafeZoneHeight + heroVehicleStageHeight;
  const { protectedHeight: carHeaderProtectedHeight, threshold: carHeaderProtectionThreshold } = carDetailHeaderProtectionGeometry(inset.top, heroMediaHeight);
  const carStickyTabsTop = inset.top + 72;
  const saved = useSavedCar(result, params);
  const { displayCurrency, rates } = useCarDisplayCurrency();
  const [activeTab, setActiveTab] = useState<CarDetailTab>("compare");
  const activeCarTabRef = useRef<CarDetailTab>("compare");
  const carDetailScrollRef = useRef<ScrollView>(null);
  const currentCarScrollOffset = useRef(0);
  const restoringCarTabScrollRef = useRef(false);
  const carTabsStickyStartRef = useRef<number | null>(null);
  const carTabsPinnedRef = useRef(false);
  const [carTabsPinned, setCarTabsPinned] = useState(false);
  const carHeaderProtectedRef = useRef(false);
  const [carHeaderProtected, setCarHeaderProtected] = useState(false);
  const carTabScrollOffsets = useRef<Record<CarDetailTab, number | null>>({ compare: 0, pickup: null, location: null });
  const providerOffers = useMemo(() => comparisonCarOffers(result.offers), [result.offers]);
  const offers = useMemo(() => providerOffers.map((candidate) => presentCarOfferCurrency(candidate, displayCurrency, rates)), [providerOffers, displayCurrency, rates]);
  const providerPrimaryOffer = useMemo(() => primaryValidCarOffer(result.offers), [result.offers]);
  const primaryOffer = useMemo(() => providerPrimaryOffer ? presentCarOfferCurrency(providerPrimaryOffer, displayCurrency, rates) : undefined, [providerPrimaryOffer, displayCurrency, rates]);
  const [selectedOfferId, setSelectedOfferId] = useState<string | undefined>(() => primaryOffer?.id);

  useEffect(() => {
    if (selectedOfferId && offers.some((candidate) => candidate.id === selectedOfferId)) return;
    setSelectedOfferId(primaryOffer?.id ?? offers[0]?.id);
  }, [offers, primaryOffer?.id, selectedOfferId]);

  const offer = offers.find((candidate) => candidate.id === selectedOfferId) ?? primaryOffer;
  const specs = nativeCarPrimarySpecLabels(result);
  const categoryLabel = result.categoryLabel.trim() === "Category not supplied" ? "" : result.categoryLabel;
  const pickupDate = String(one(params.pickupDate) || "");
  const dropoffDate = String(one(params.dropoffDate) || "");
  const pickupTime = String(one(params.pickupTime) || "");
  const dropoffTime = String(one(params.dropoffTime) || "");
  const days = nativeCarRentalDays(pickupDate, dropoffDate);
  const carResultsStack = one(params.carResultsStack) === "1";
  const search = {
    pickupLocation: String(one(params.pickupLocation) || result.pickupLocation),
    dropoffLocation: String(one(params.dropoffLocation) || result.returnLocation),
    pickupDate,
    pickupTime,
    dropoffDate,
    dropoffTime,
    driverAge: String(one(params.driverAge) || ""),
  };
  const returnToCarResults = () => {
    if (carResultsStack) {
      const dismissCount = carResultsDismissCount(navigation.getState());
      if (dismissCount) {
        router.dismiss(dismissCount);
        return;
      }
    }
    router.replace({ pathname: "/car-results", params: search });
  };
  const light = !theme.dark;
  const carCanvasColor = theme.dark ? theme.background : CAR_DETAIL_LIGHT_CANVAS;

  const syncCarHeaderProtection = useCallback((offset: number) => {
    const nextProtected = offset >= carHeaderProtectionThreshold;
    if (nextProtected === carHeaderProtectedRef.current) return;
    carHeaderProtectedRef.current = nextProtected;
    setCarHeaderProtected(nextProtected);
  }, [carHeaderProtectionThreshold]);

  const syncCarTabsPinned = useCallback((offset: number) => {
    const stickyStart = carTabsStickyStartRef.current;
    const nextPinned = stickyStart !== null && offset >= stickyStart;
    if (nextPinned === carTabsPinnedRef.current) return;
    carTabsPinnedRef.current = nextPinned;
    setCarTabsPinned(nextPinned);
  }, []);

  const selectCarTab = useCallback((tab: CarDetailTab) => {
    if (tab === activeCarTabRef.current) return;
    const targetOffset = carTabScrollOffsets.current[tab] ?? currentCarScrollOffset.current;
    restoringCarTabScrollRef.current = true;
    activeCarTabRef.current = tab;
    setActiveTab(tab);
    requestAnimationFrame(() => {
      carDetailScrollRef.current?.scrollTo({ y: targetOffset, animated: false });
      currentCarScrollOffset.current = targetOffset;
      syncCarTabsPinned(targetOffset);
      syncCarHeaderProtection(targetOffset);
      requestAnimationFrame(() => { restoringCarTabScrollRef.current = false; });
    });
  }, [syncCarHeaderProtection, syncCarTabsPinned]);

  useEffect(() => {
    restoringCarTabScrollRef.current = true;
    activeCarTabRef.current = "compare";
    setActiveTab("compare");
    currentCarScrollOffset.current = 0;
    carTabsStickyStartRef.current = null;
    carTabsPinnedRef.current = false;
    setCarTabsPinned(false);
    carHeaderProtectedRef.current = false;
    setCarHeaderProtected(false);
    carTabScrollOffsets.current = { compare: 0, pickup: null, location: null };
    requestAnimationFrame(() => {
      carDetailScrollRef.current?.scrollTo({ y: 0, animated: false });
      requestAnimationFrame(() => { restoringCarTabScrollRef.current = false; });
    });
  }, [result.id]);

  return <SafeAreaView style={[s.safe, { backgroundColor: carCanvasColor }]} edges={[]}>
    <View testID="car-details-protected-header" pointerEvents="none" style={[s.protectedHeader, { height: carHeaderProtectedHeight, backgroundColor: carHeaderProtected ? carCanvasColor : "transparent" }]} />
    <ScrollView
      ref={carDetailScrollRef}
      stickyHeaderIndices={[1]}
      contentInsetAdjustmentBehavior="never"
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      style={{ backgroundColor: carCanvasColor }}
      contentContainerStyle={{ paddingBottom: 120 + inset.bottom }}
      onScroll={({ nativeEvent }) => {
        const offset = nativeEvent.contentOffset.y;
        currentCarScrollOffset.current = offset;
        syncCarTabsPinned(offset);
        syncCarHeaderProtection(offset);
        if (!restoringCarTabScrollRef.current) carTabScrollOffsets.current[activeCarTabRef.current] = offset;
      }}
      scrollEventThrottle={16}
    >
      <View style={[s.hero, { backgroundColor: carCanvasColor, borderColor: theme.border }]}>
        <View style={[s.imageBox,{height:heroMediaHeight,backgroundColor:theme.surface}]}><View style={[s.mediaStage,{marginTop:heroControlSafeZoneHeight}]}>
          {resolveImage(result.imageUrl)
            ? <Image source={{ uri: resolveImage(result.imageUrl) }} accessibilityLabel={result.imageAlt} resizeMode="contain" style={s.image} />
            : <View style={s.unavailable}><CarFront size={48} color={theme.textSecondary} /><Text style={{ color: theme.textSecondary }}>Vehicle image unavailable</Text></View>}
        </View></View>
        <View style={s.identityBlock}>
          <Text accessibilityRole="header" style={[s.title, { color: light ? "#020617" : theme.textPrimary }]}>{result.modelName}{result.orSimilar ? <Text style={[s.orSimilar, { color: theme.textSecondary }]}> {"or\u00A0similar"}</Text> : null}</Text>
          {categoryLabel ? <Text style={s.category}>{categoryLabel.toUpperCase()}</Text> : null}
        </View>
        <View style={s.specs}>
          {specs.passengers ? <Spec Icon={Users} text={specs.passengers} theme={theme} /> : null}
          {specs.bags ? <Spec Icon={BriefcaseBusiness} text={specs.bags} theme={theme} /> : null}
          {specs.doors ? <Spec Icon={DoorOpen} text={specs.doors} theme={theme} /> : null}
          {specs.transmission ? <Spec Icon={CarFront} text={specs.transmission} theme={theme} /> : null}
        </View>
      </View>

      <View
        onLayout={({ nativeEvent }) => {
          carTabsStickyStartRef.current = nativeEvent.layout.y;
          syncCarTabsPinned(currentCarScrollOffset.current);
        }}
        style={[s.carsTabsShell, {
          paddingTop: carStickyTabsTop,
          marginTop: 1 - carStickyTabsTop,
          backgroundColor: carTabsPinned ? carCanvasColor : "transparent",
          borderBottomColor: theme.border,
        }]}
      >
        <View accessibilityRole="tablist" style={[s.carsTabsRow, { backgroundColor: carCanvasColor }]}>
          {(["compare", "pickup", "location"] as const).map((tab) => {
            const selected = activeTab === tab;
            return <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => selectCarTab(tab)} style={[s.carTab, tab === "compare" ? s.carTabCompare : tab === "pickup" ? s.carTabPickup : s.carTabLocation]}>
              <Text numberOfLines={1} style={[s.tabText, { fontSize: width >= 390 ? 13 : 12, color: selected ? "#075EE8" : light ? "#475569" : theme.textSecondary }]}>{tab === "compare" ? "Compare deals" : tab === "pickup" ? "Pickup and return" : "Location"}</Text>
              <View style={[s.underline, { backgroundColor: selected ? "#075EE8" : "transparent" }]} />
            </Pressable>;
          })}
        </View>
      </View>

      <View style={[s.page, { backgroundColor: carCanvasColor }]}>
        {activeTab === "compare" && offers.length ? <KayakCompare result={result} offers={offers} selectedOfferId={offer?.id} onSelectOffer={setSelectedOfferId} days={days} pickupDate={pickupDate} dropoffDate={dropoffDate} theme={theme} /> : null}
        {activeTab === "pickup" ? <PickupReturn result={result} pickupDate={pickupDate} dropoffDate={dropoffDate} pickupTime={pickupTime} dropoffTime={dropoffTime} theme={theme} /> : null}
        {activeTab === "location" ? <Location result={result} search={search} pickupDate={pickupDate} dropoffDate={dropoffDate} pickupTime={pickupTime} dropoffTime={dropoffTime} theme={theme} /> : null}
      </View>
    </ScrollView>

    <Pressable accessibilityRole="button" accessibilityLabel="Back to Cars results" onPress={returnToCarResults} style={[s.heroBack, { top: inset.top + 12 }]}>
      <DetailGlassSurface dark={theme.dark} variant="carsOptical" style={s.heroBackGlass} />
      <ArrowLeft size={25} strokeWidth={2.2} color={light ? "#0F172A" : theme.icon} />
    </Pressable>
    <View style={[s.heroActions, { top: inset.top + 12 }]}>
      <DetailGlassSurface dark={theme.dark} variant="carsOptical" style={s.heroActionsGlass} />
      <Pressable accessibilityRole="button" accessibilityLabel={saved.saved ? "Remove car from saved" : "Save car"} accessibilityState={{ selected: saved.saved }} onPress={saved.toggle} style={s.heroAction}><Heart size={22} strokeWidth={androidFavoriteColors.strokeWidth} color={saved.saved ? androidFavoriteColors.savedStroke : light ? androidFavoriteColors.unsavedStroke : theme.icon} fill={saved.saved ? androidFavoriteColors.savedFill : androidFavoriteColors.unsavedFill} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Share car" onPress={() => void Share.share({ message: `${result.modelName} — ${result.categoryLabel}` })} style={s.heroAction}><Share2 size={21} strokeWidth={androidFavoriteColors.strokeWidth} color={light ? androidFavoriteColors.shareStroke : theme.icon} /></Pressable>
    </View>

    {offer ? <View style={[s.dock, { paddingBottom: 12 + inset.bottom, backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <View style={s.dockContent}>
        <View style={s.dockPrice}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[s.dockTotal, { color: theme.textPrimary }]}>{formatMarketCurrency(offer.totalPrice, offer.currency)}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[s.dockEyebrow, { color: theme.textSecondary }]}>Estimated rental total</Text>
        </View>
        <View style={[s.dockAction, Platform.OS === "android" && s.dockActionAndroid]}>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={s.continue}>
            <Text style={s.continueText}>Continue deal</Text>
          </Pressable>
        </View>
      </View>
    </View> : null}
  </SafeAreaView>;
}

function Spec({ Icon, text, theme }: { Icon: typeof Users; text: string; theme: Theme }) {
  return <View style={s.spec}><Icon size={16} color={theme.dark ? theme.icon : "#475569"} /><Text style={[s.specText, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{text}</Text></View>;
}

function KayakCompare({ result, offers, selectedOfferId, onSelectOffer, days, pickupDate, dropoffDate, theme }: { result: CarResult; offers: CarResult["offers"]; selectedOfferId?: string; onSelectOffer: (id: string) => void; days: number; pickupDate: string; dropoffDate: string; theme: Theme }) {
  return <View style={[s.compare, { borderBottomColor: theme.border }]}>
    <Text style={[s.compareHeading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>Compare deals</Text>
    <Text style={[s.stay, { color: theme.dark ? theme.textSecondary : "#475569" }]}>{nativeCarDetailDate(pickupDate)} – {nativeCarDetailDate(dropoffDate)} · {days} rental day{days === 1 ? "" : "s"}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel="Deal options" style={s.dealList}>
      {offers.map((offer) => {
        const selected = offer.id === selectedOfferId;
        const provider = providerValue(offer.bookingProviderName) || providerValue(offer.rentalCompanyName) || providerValue(result.rentalCompanyName);
        const supplier = providerValue(offer.rentalCompanyName) || providerValue(result.rentalCompanyName);
        return <Pressable key={offer.id} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${money(offer.currency, offer.pricePerDay)} per day deal`} onPress={() => onSelectOffer(offer.id)} style={({ pressed }) => [s.compareCard, { backgroundColor: theme.surface, borderColor: selected ? "#075EE8" : theme.border }, pressed && s.compareCardPressed]}>
          <View style={s.compareTop}>
            <View style={s.providerIdentity}>{provider ? <Text numberOfLines={1} style={[s.providerName, { color: theme.textPrimary }]}>{provider}</Text> : null}</View>
            <View style={[s.radio, !selected && { borderColor: theme.dark ? theme.icon : "#94A3B8" }]}>{selected ? <View style={s.radioDot} /> : null}</View>
          </View>
          <View style={s.compareBottom}>
            {supplier ? <View style={s.benefits}>
              <View style={s.benefit}><CarFront size={14} color={theme.dark ? theme.icon : "#475569"} /><Text numberOfLines={1} style={[s.benefitText, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{supplier}</Text></View>
            </View> : <View style={s.benefits} />}
            <View style={s.comparePrice}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={[s.daily, { color: theme.textPrimary }]}>{money(offer.currency, offer.pricePerDay)}</Text><Text style={s.perDay}>per day</Text></View>
          </View>
        </Pressable>;
      })}
    </View>
  </View>;
}

function TimelineEntry({ label, location, date, time, theme }: { label: string; location: string; date: string; time: string; theme: Theme }) {
  return <View style={s.timelineEntry}><View style={s.timelineRail}><View style={s.timelineDot} /></View><View style={s.timelineCopy}><Text style={[s.timelineHeading, { color: theme.textPrimary }]}>{label}</Text><View style={s.infoRow}><View style={s.infoIconSlot}><MapPin size={16} color="#004BB8" /></View><Text style={[s.infoText, s.timelineLocation, { color: theme.textPrimary }]}>{location}</Text></View><View style={s.infoRow}><View style={s.infoIconSlot}><Clock3 size={16} color={theme.dark ? theme.icon : "#64748B"} /></View><Text style={[s.infoText, s.timelineDate, { color: theme.textSecondary }]}>{nativeCarDetailDate(date)}{time ? ` · ${time}` : ""}</Text></View></View></View>;
}

function LocationTimelineEntry({ label, location, date, time, theme }: { label: string; location: string; date: string; time: string; theme: Theme }) {
  return <View style={s.locationTimelineEntry}><View style={s.timelineRail}><View style={s.timelineDot} /></View><View style={s.locationTimelineCopy}><Text style={[s.timelineHeading, { color: theme.textPrimary }]}>{label}</Text><Text style={[s.timelineLocation, { color: theme.textPrimary }]}>{location}</Text><Text style={[s.timelineDate, { color: theme.textSecondary }]}>{nativeCarDetailDate(date)}{time ? ` · ${time}` : ""}</Text></View></View>;
}

function PickupReturn({ result, pickupDate, dropoffDate, pickupTime, dropoffTime, theme }: { result: CarResult; pickupDate: string; dropoffDate: string; pickupTime: string; dropoffTime: string; theme: Theme }) {
  return <View style={[s.pickupSection, { backgroundColor: theme.dark ? theme.background : CAR_DETAIL_LIGHT_CANVAS, borderColor: theme.border }]}>
    <Text style={[s.pickupHeading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>Pickup and return</Text>
    <View style={s.timeline}>
      <TimelineEntry label="Pick-up" location={result.pickupLocation} date={pickupDate} time={pickupTime} theme={theme} />
      <TimelineEntry label="Return" location={result.returnLocation} date={dropoffDate} time={dropoffTime} theme={theme} />
    </View>
  </View>;
}

function Location({ result, search, pickupDate, dropoffDate, pickupTime, dropoffTime, theme }: { result: CarResult; search: Record<string, string>; pickupDate: string; dropoffDate: string; pickupTime: string; dropoffTime: string; theme: Theme }) {
  const [mapPreviewFailed, setMapPreviewFailed] = useState(false);
  const [fullMapOpen, setFullMapOpen] = useState(false);
  const searchedPickupLocation = search.pickupLocation.trim();
  const searchedReturnLocation = search.dropoffLocation.trim();
  const pickupLocation = searchedPickupLocation || result.pickupLocation;
  const returnLocation = searchedReturnLocation || result.returnLocation;
  const trustedMapCoordinates = nativeCarTrustedMapCoordinates(pickupLocation);
  const api = getApiBaseUrl(Platform.OS, __DEV__);
  const embed = api.ok ? nativeCarLocationEmbedUrl(api.baseUrl, result.id, search) : null;
  const directions = nativeCarDirectionsUrl(pickupLocation);

  return <View style={[s.location, { borderBottomColor: theme.border }]}>
    <Text style={[s.locationHeading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>Location</Text>
    <View style={s.identity}>
      <View style={s.pinWell}><MapPin size={18} color="#075EE8" /></View>
      <View style={s.identityCopy}><Text style={[s.locationPrimary, { color: theme.dark ? theme.textPrimary : "#1E293B" }]}>{pickupLocation}</Text></View>
    </View>
    <View style={[s.mapCard, { borderColor: theme.border }]}>
      <View style={s.mapViewport}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open full map for ${pickupLocation}`} accessibilityHint="Opens an interactive map inside Kurioticket" onPress={() => setFullMapOpen(true)} style={s.mapPreview}>
          <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={s.mapPreviewContent}>
            {Platform.OS === "ios"
              ? trustedMapCoordinates ? <NativeAppleCarMap {...trustedMapCoordinates} locationLabel={pickupLocation} /> : <View style={s.unavailable}><MapPin size={24} color={theme.icon} /><Text style={{ color: theme.textSecondary }}>Map preview unavailable</Text></View>
              : embed && !mapPreviewFailed ? <WebView source={{ uri: embed }} scrollEnabled={false} onError={() => setMapPreviewFailed(true)} onHttpError={() => setMapPreviewFailed(true)} style={s.mapPreviewContent} /> : <View style={s.unavailable}><MapPin size={24} color={theme.icon} /><Text style={{ color: theme.textSecondary }}>Map preview unavailable</Text></View>}
          </View>
        </Pressable>
      </View>
      {Platform.OS !== "ios" && directions ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(directions)} style={[s.directions, { borderTopColor: theme.border }]}><Text style={s.directionsText}>Get directions</Text><ExternalLink size={16} color="#075EE8" /></Pressable> : null}
    </View>
    <NativeCarFullMapModal visible={fullMapOpen} pickupLocation={pickupLocation} trustedMapCoordinates={trustedMapCoordinates} embedUrl={embed} theme={theme} onClose={() => setFullMapOpen(false)} />
    <View style={[s.locationTimeline, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <LocationTimelineEntry label="Pick-up" location={pickupLocation} date={pickupDate} time={pickupTime} theme={theme} />
      <LocationTimelineEntry label="Return" location={returnLocation} date={dropoffDate} time={dropoffTime} theme={theme} />
    </View>
  </View>;
}

function KayakCarDetailLoading() {
  const { theme } = useAppTheme();
  return <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}><View style={s.loading}><View style={[s.loadingLine, { backgroundColor: theme.border }]} /><View style={[s.loadingHero, { backgroundColor: theme.border }]} /></View></SafeAreaView>;
}

function KayakCarUnavailable() {
  const { theme } = useAppTheme();
  return <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}><View style={s.unavailable}><CarFront size={44} color="#075EE8" /><Text style={[s.heading, { color: theme.textPrimary }]}>This car is no longer available</Text><Text style={{ color: theme.textSecondary }}>Return to the results and refresh your search.</Text><Button label="Back to car results" onPress={() => router.back()} /><Button label="Edit search" outline onPress={() => router.replace("/cars")} /></View></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  protectedHeader: { position: "absolute", left: 0, right: 0, top: 0, zIndex: 10, elevation: 11 },
  heroBack: { position: "absolute", left: 20, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", zIndex: 20, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 7, elevation: 7 },
  heroBackGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 22 },
  heroActions: { position: "absolute", right: 20, width: 96, height: 44, borderRadius: 22, flexDirection: "row", zIndex: 20, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 7, elevation: 7 },
  heroActionsGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 22 },
  heroAction: { width: 48, height: 44, alignItems: "center", justifyContent: "center" },
  hero: { paddingBottom: 16, borderBottomWidth: 1 },
  identityBlock: { paddingHorizontal: 16, paddingTop: 14 },
  category: { marginTop: 3, fontSize: 10, lineHeight: 14, fontWeight: "700", fontFamily: appFonts.bold, textTransform: "uppercase", letterSpacing: 1.4, color: "#075EE8" },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "800", fontFamily: appFonts.extraBold, letterSpacing: -0.5 },
  orSimilar: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold, letterSpacing: 0 },
  imageBox: { width: "100%", overflow: "hidden" },
  mediaStage: { flex: 1, paddingBottom: 12 },
  image: { width: "100%", height: "100%" },
  unavailable: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  specs: { flexDirection: "row", flexWrap: "wrap", rowGap: 10, justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16 },
  spec: { width: "42%", minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  specText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600", fontFamily: appFonts.semibold },
  carsTabsShell: { width: "100%", alignSelf: "stretch", minHeight: 48, borderBottomWidth: 1 },
  carsTabsRow: { width: "100%", alignSelf: "stretch", minHeight: 48, flexDirection: "row", flexWrap: "nowrap", alignItems: "stretch" },
  carTab: { flexGrow: 0, flexShrink: 0, minWidth: 0, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  carTabCompare: { width: "32%" },
  carTabPickup: { width: "43%" },
  carTabLocation: { width: "25%" },
  tabText: { fontWeight: "600", fontFamily: appFonts.semibold },
  underline: { position: "absolute", left: 8, right: 8, bottom: 0, height: 2 },
  page: { paddingHorizontal: 16 },
  compare: { paddingTop: 12, paddingBottom: 28, borderBottomWidth: 1 },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: "800", fontFamily: appFonts.extraBold, letterSpacing: -0.5 },
  compareHeading: { fontSize: 12, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: -0.2 },
  stay: { marginTop: 4, fontSize: 11, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
  dealList: { marginTop: 20, gap: 10 },
  compareCard: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 12, overflow: "hidden" },
  compareCardPressed: { opacity: 0.88 },
  compareTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  providerIdentity: { flex: 1, minWidth: 0 },
  providerName: { fontSize: 13, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: "#075EE8", alignItems: "center", justifyContent: "center" },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#075EE8" },
  compareBottom: { marginTop: 12, flexDirection: "row", alignItems: "flex-end", gap: 10 },
  benefits: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", alignItems: "center", alignContent: "flex-start", columnGap: 10, rowGap: 7 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 1, minWidth: 0 },
  benefitText: { maxWidth: 150, fontSize: 10.5, lineHeight: 15, fontWeight: "600", fontFamily: appFonts.semibold },
  comparePrice: { flexShrink: 1, minWidth: 72, maxWidth: "42%", alignItems: "flex-end" },
  daily: { maxWidth: "100%", fontSize: 19, lineHeight: 22, fontWeight: "600", fontFamily: appFonts.semibold, letterSpacing: -0.25, textAlign: "right", fontVariant: ["tabular-nums"] },
  perDay: { fontSize: 10, lineHeight: 13, fontWeight: "500", fontFamily: appFonts.medium, color: "#075EE8", textAlign: "right" },
  pickupSection: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 20, borderTopWidth: 1, borderBottomWidth: 1 },
  pickupHeading: { fontSize: 12, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: -0.2 },
  timeline: { marginTop: 16, gap: 20 },
  timelineEntry: { flexDirection: "row" },
  timelineRail: { width: 14, borderLeftWidth: 2, borderLeftColor: "#BFDBFE", alignItems: "center" },
  timelineDot: { position: "absolute", left: -7, top: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: "#004BB8" },
  timelineCopy: { flex: 1, paddingLeft: 20 },
  timelineHeading: { fontSize: 15, lineHeight: 22, fontWeight: "700", fontFamily: appFonts.bold },
  infoRow: { marginTop: 4, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoIconSlot: { width: 16, height: 20, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1, minWidth: 0 },
  timelineLocation: { fontSize: 14, lineHeight: 20, fontWeight: "500", fontFamily: appFonts.medium },
  timelineDate: { fontSize: 13, lineHeight: 20, fontWeight: "400", fontFamily: appFonts.regular },
  location: { paddingTop: 12, paddingBottom: 28, borderBottomWidth: 1 },
  locationHeading: { fontSize: 12, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: -0.2 },
  identity: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  identityCopy: { flex: 1, minWidth: 0 },
  pinWell: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  locationPrimary: { fontSize: 13, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  mapCard: { marginTop: 16, borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  mapViewport: { height: 200, width: "100%" },
  mapPreview: { flex: 1 },
  mapPreviewContent: { flex: 1 },
  directions: { minHeight: 44, borderTopWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  directionsText: { fontSize: 14, fontWeight: "700", fontFamily: appFonts.bold, color: "#075EE8" },
  locationTimeline: { marginTop: 16, borderWidth: 1, borderRadius: 14, padding: 16, gap: 24, overflow: "hidden" },
  locationTimelineEntry: { flexDirection: "row" },
  locationTimelineCopy: { flex: 1, paddingLeft: 12 },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, shadowColor: "#0F172A", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 12 },
  dockContent: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  dockPrice: { flex: 1, minWidth: 0, gap: 1 },
  dockTotal: { maxWidth: "100%", fontSize: 19, lineHeight: 22, fontWeight: "600", fontFamily: appFonts.semibold, letterSpacing: -0.25, textAlign: "left", fontVariant: ["tabular-nums"] },
  dockEyebrow: { flexShrink: 1, minWidth: 0, fontSize: 11, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  dockAction: { flex: 0.78, minWidth: 140, maxWidth: 180 },
  dockActionAndroid: { flex: 0.76, minWidth: 132, maxWidth: 176 },
  continue: { width: "100%", minHeight: 48, borderRadius: 8, backgroundColor: colors.blue, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  continueText: { fontSize: 12, lineHeight: 16, fontWeight: "700", fontFamily: appFonts.bold, color: "white", textAlign: "center" },
  pressed: { opacity: 0.82 },
  loading: { padding: 16, gap: 12 },
  loadingLine: { height: 36, borderRadius: 8 },
  loadingHero: { height: 340, borderRadius: 11 },
});
