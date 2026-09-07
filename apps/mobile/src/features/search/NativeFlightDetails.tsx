import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, FilePenLine, Heart } from "lucide-react-native";
import {
  flightDetailsTotalLabel,
  type FlightDetailsFareChoice,
  type FlightDetailsSuccess,
} from "../../../../../src/lib/flights/flightDetailsContract";
import type { FlightLeg, FlightSegment } from "../../../../../src/lib/types";
import { TravelApiError, travelApi, type FlightResult } from "../../api/travelApi";
import { useAppTheme } from "../../theme/AppTheme";
import { readCurrencyPreference } from "../../storage/preferenceStorage";
import { readSession } from "../../storage/sessionStorage";
import { useSavedFlights } from "../../storage/useSavedFlights";
import { flightSavedSignature } from "../../storage/savedMapping";
import { resolveDisplayCurrencyContext, type DisplayPrice, type ExchangeRates } from "../currency/displayCurrency";
import { createFlightDetailFare } from "./flightDetailCurrency";
import { flightShareMessage, shareFlightForAuthenticatedSession } from "./flightDetailInteractions";
import { Button, ui } from "./SearchUi";
import { FlowIcon } from "../flow/FlowIcon";
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { AirlineLogo } from "./AirlineLogo";
import {
  nativeAmenityLines,
  nativeCanUseOfferAirlineLogo,
  nativeCarrierConditionsLinks,
  nativeCompactFareTerms,
  nativeConditionLabel,
  nativeFlightDetailsRoute,
  nativeFlightEditSearchParams,
  nativeFormatDate,
  nativeFormatDistanceKm,
  nativeFormatProviderTimestamp,
  nativeFormatSourceMoney,
  nativeFormatTime,
  nativeSegmentCarrierName,
  nativeStopsLabel,
  nativeTechnicalStopCount,
  titleCase,
} from "./nativeFlightDetailsPresentation";

type Params = Record<string, string | string[] | undefined>;
type Tab = "deals" | "details" | "conditions" | "extras";
type Theme = ReturnType<typeof useAppTheme>["theme"];

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const fareSelection = (current: string | null, fares: FlightDetailsFareChoice[]) =>
  current && fares.some(({ key }) => key === current)
    ? current
    : fares.find(({ selectedOffer }) => selectedOffer)?.key ?? fares[0]?.key ?? null;

function savedFlightOffer(details: FlightDetailsSuccess, choice: FlightDetailsFareChoice): FlightResult {
  const offer = choice.offer;
  return {
    ...offer,
    bookingUrl: "",
    partnerRedirectUrl: "",
    searchPolicy: {
      source: "duffel",
      bookable: choice.handoff.available,
      action: {
        kind: "internal-detail",
        href: `/flights/details/${encodeURIComponent(offer.id)}`,
        enabled: true,
      },
    },
  };
}

export function NativeFlightDetails({ params }: { params: Params }) {
  const id = one(params.id) ?? "";
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [details, setDetails] = useState<FlightDetailsSuccess | null>(null);
  const [state, setState] = useState<"loading" | "error" | "unavailable" | "available">("loading");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("deals");
  const [booking, setBooking] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const rates = useRef<ExchangeRates | null>(null);
  const sharePending = useRef(false);
  const preserveMessageOnReload = useRef(false);
  const fareRail = useRef<ScrollView | null>(null);
  const fareOffsets = useRef<Record<string, number>>({});
  const savedFlights = useSavedFlights();

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    if (!id) {
      setDetails(null);
      setMessage("This flight link is missing its authoritative offer ID. Return to results and choose the flight again.");
      setState("unavailable");
      return () => controller.abort();
    }

    setState((current) => details ? "available" : current === "available" ? "available" : "loading");
    if (preserveMessageOnReload.current) preserveMessageOnReload.current = false;
    else setMessage("");

    travelApi.flightDetails(id, { signal: controller.signal }).then((response) => {
      if (response.status !== "available") {
        setDetails(null);
        setMessage(response.error);
        setState("unavailable");
        return;
      }
      setDetails(response);
      setSelectedKey((current) => fareSelection(current, response.fareChoices));
      setState("available");
    }).catch((error) => {
      if (controller.signal.aborted) return;
      const nextMessage = error instanceof Error ? error.message : "Flight details could not be loaded.";
      if (details) {
        setMessage(nextMessage);
        setState("available");
        return;
      }
      setDetails(null);
      setMessage(nextMessage);
      setState(error instanceof TravelApiError && [404, 409].includes(error.status) ? "unavailable" : "error");
    });
    return () => controller.abort();
  }, [id, revision]);

  useEffect(() => {
    let active = true;
    Promise.all([
      readCurrencyPreference().catch(() => null),
      travelApi.location().catch(() => null),
      rates.current
        ? Promise.resolve(rates.current)
        : travelApi.currencyRates().then(({ rates: currentRates }) => currentRates).catch(() => ({})),
    ]).then(([preferred, location, currentRates]) => {
      if (!active) return;
      if (Object.keys(currentRates).length) rates.current = currentRates;
      const currency = resolveDisplayCurrencyContext({
        preferredCurrency: preferred,
        ipCountryCode: location?.countryCode,
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
      }).resolvedCurrency;
      setDisplayCurrency(currency);
      setExchangeRates(currentRates);
    });
    return () => { active = false; };
  }, [revision]);

  const selected = details?.fareChoices.find(({ key }) => key === selectedKey) ?? null;
  const displayPriceFor = useCallback((amount: number, currency: string) => {
    if (!displayCurrency) return null;
    return createFlightDetailFare(amount, currency, displayCurrency, exchangeRates);
  }, [displayCurrency, exchangeRates]);
  const fare = selected ? displayPriceFor(selected.offer.price, selected.offer.currency) : null;
  const fareReady = Boolean(selected && displayCurrency && fare);

  useEffect(() => {
    if (!selectedKey) return;
    const offset = fareOffsets.current[selectedKey];
    if (offset === undefined) return;
    const cardWidth = 230;
    fareRail.current?.scrollTo({ x: Math.max(0, offset - (width - cardWidth) / 2), animated: true });
  }, [selectedKey, width, details?.fareChoices.length]);

  if (state !== "available" || !details || !selected) {
    return (
      <SafeAreaView edges={["top"]} style={[s.safe, { backgroundColor: theme.background }]}>
        <Back theme={theme} />
        <View style={s.center}>
          <Text accessibilityRole="header" style={[s.title, { color: theme.textPrimary }]}>
            {state === "loading" ? "Checking current flight details…" : state === "unavailable" ? "This flight is no longer available" : "We couldn’t load this flight"}
          </Text>
          {state !== "loading" ? <>
            <Text style={[s.bodyText, { color: theme.textSecondary }]}>{message}</Text>
            {id ? <Button label="Retry" onPress={reload} /> : null}
            <Button label="Back to results" onPress={() => router.back()} />
          </> : null}
        </View>
      </SafeAreaView>
    );
  }

  const offer = selected.offer;
  const provider = selected.handoff.available ? selected.handoff.providerName : "provider";
  const savedOffer = savedFlightOffer(details, selected);
  const editParams = nativeFlightEditSearchParams(details, params);
  const saved = savedFlights.savedFlights.has(flightSavedSignature(savedOffer));

  const handoff = async (offerId: string) => {
    if (booking || !fareReady) return;
    setBooking(true);
    setMessage("");
    try {
      const response = await travelApi.flightRedirect(offerId);
      await Linking.openURL(response.url);
    } catch (error) {
      if (error instanceof TravelApiError && error.status === 409 && error.details?.code === "offer_changed") {
        preserveMessageOnReload.current = true;
        setMessage("The provider updated this offer. Review the refreshed price and terms before continuing.");
        reload();
      } else {
        setMessage(error instanceof Error ? error.message : "Booking is currently unavailable.");
      }
    } finally {
      setBooking(false);
    }
  };

  const share = async () => {
    if (sharePending.current) return;
    sharePending.current = true;
    try {
      const outcome = await shareFlightForAuthenticatedSession({
        readSession,
        share: (shareMessage) => Share.share({ message: shareMessage }),
        message: flightShareMessage(offer, fare?.formatted ?? "price unavailable"),
      });
      if (outcome === "sign-in-required") {
        Alert.alert("Sign in required", "Sign in to share this flight.", [
          { text: "Sign in", onPress: () => router.push("/email-auth") },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    } catch {
      Alert.alert("Unable to share", "Please try again.");
    } finally {
      sharePending.current = false;
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={[s.safe, { backgroundColor: theme.background }]}>
      <Back theme={theme} />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 + inset.bottom }]}>
        {message ? <View accessibilityRole="alert" style={s.notice}><Text style={s.noticeText}>{message}</Text></View> : null}
        <Text accessibilityRole="header" style={[s.route, { color: theme.textPrimary }]}>{nativeFlightDetailsRoute(details)}</Text>
        <Text style={[s.bodyText, { color: theme.textSecondary }]}>{tripTypeLabel(details)} · {travelerSummary(details)}</Text>
        <View style={s.actions}>
          <IconButton label={saved ? "Remove saved flight" : "Save flight"} onPress={() => savedFlights.toggle(savedOffer, editParams)}>
            <Heart size={20} color={saved ? androidFavoriteColors.active : theme.icon} fill={saved ? androidFavoriteColors.active : "transparent"} />
          </IconButton>
          <IconButton label="Share flight" onPress={() => void share()}><FlowIcon name="share" size={20} color={theme.icon} /></IconButton>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit search" onPress={() => router.push({ pathname: "/edit-flight-search", params: editParams })} style={s.edit}>
            <FilePenLine size={17} color={ui.blue} />
            <Text style={s.editText}>Edit search</Text>
          </Pressable>
        </View>

        <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Full itinerary</Text>
        {(offer.legs?.length ? offer.legs : []).map((leg, index) => (
          <Itinerary key={`${leg.departureTime}-${index}`} leg={leg} index={index} offer={offer} theme={theme} />
        ))}

        <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Pick your fare</Text>
        <ScrollView ref={fareRail} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fares}>
          {details.fareChoices.map((choice) => {
            const choiceFare = displayPriceFor(choice.offer.price, choice.offer.currency);
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: choice.key === selected.key }}
                key={choice.key}
                onLayout={(event) => { fareOffsets.current[choice.key] = event.nativeEvent.layout.x; }}
                onPress={() => setSelectedKey(choice.key)}
                style={[s.fareCard, { backgroundColor: theme.surface, borderColor: choice.key === selected.key ? ui.blue : theme.border }]}
              >
                <Text style={[s.fareLabel, { color: theme.textPrimary }]}>{choice.label}</Text>
                <Text style={s.farePrice}>{choiceFare?.formatted ?? "—"}</Text>
                {nativeCompactFareTerms(choice.distinguishingTerms, details.search.tripType).map((row, index) => (
                  <Text key={`${row.index}-${row.rowIndex}-${index}`} style={[s.small, { color: theme.textSecondary }]}>• {row.text}</Text>
                ))}
              </Pressable>
            );
          })}
        </ScrollView>

        <View accessibilityRole="tablist" style={s.tabs}>
          {([['deals', 'Compare deals'], ['details', 'Fare details'], ['conditions', 'Fare conditions'], ['extras', 'Optional extras']] as const).map(([key, label]) => (
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === key }} key={key} onPress={() => setTab(key)} style={[s.tab, tab === key && s.activeTab]}>
              <Text style={[s.tabText, { color: tab === key ? ui.blue : theme.textSecondary }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <FareSurface
          tab={tab}
          choice={selected}
          displayPriceFor={displayPriceFor}
          onDeal={handoff}
          booking={booking}
          fareReady={fareReady}
          theme={theme}
        />
      </ScrollView>

      <View style={[s.sticky, { paddingBottom: Math.max(inset.bottom, 10), backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <View style={s.stickyPrice}>
          <Text style={[s.small, { color: theme.textSecondary }]}>{flightDetailsTotalLabel(details.search.travelers)}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[s.total, { color: theme.textPrimary }]}>{fare?.formatted ?? "—"}</Text>
        </View>
        <Button
          label={booking ? "Checking offer…" : `Continue to ${provider}`}
          disabled={booking || !fareReady || !selected.handoff.available}
          onPress={() => void handoff(offer.id)}
        />
      </View>
    </SafeAreaView>
  );
}

function tripTypeLabel(details: FlightDetailsSuccess) {
  if (details.search.tripType === "one-way") return "One-way";
  if (details.search.tripType === "round-trip") return "Round-trip";
  return `Multi-city · ${details.search.legs.length} flights`;
}

function travelerSummary(details: FlightDetailsSuccess) {
  const parts = [
    details.search.adults ? `${details.search.adults} adult${details.search.adults === 1 ? "" : "s"}` : "",
    details.search.children ? `${details.search.children} child${details.search.children === 1 ? "" : "ren"}` : "",
    details.search.infants ? `${details.search.infants} infant${details.search.infants === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return parts.join(", ") || `${details.search.travelers} traveler${details.search.travelers === 1 ? "" : "s"}`;
}

function Back({ theme }: { theme: Theme }) {
  return (
    <View style={[s.backBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={() => router.back()} style={s.back}>
        <ArrowLeft size={18} color={ui.blue} /><Text style={s.backText}>Back to results</Text>
      </Pressable>
    </View>
  );
}

function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.iconButton}>{children}</Pressable>;
}

function AirportTime({ segment, end, fallbackCode, theme }: { segment?: FlightSegment; end: "origin" | "destination"; fallbackCode: string; theme: Theme }) {
  const details = end === "origin" ? segment?.originDetails : segment?.destinationDetails;
  const timestamp = end === "origin" ? segment?.departureTime : segment?.arrivalTime;
  const code = details?.iataCode || (end === "origin" ? segment?.originAirport : segment?.destinationAirport) || fallbackCode;
  return (
    <View style={s.airportTime}>
      <Text style={[s.airportClock, { color: theme.textPrimary }]}>{timestamp ? nativeFormatTime(timestamp, "en") : "—"}</Text>
      <Text style={[s.airportCode, { color: theme.textPrimary }]}>{code}</Text>
      {details?.name ? <Text style={[s.small, { color: theme.textSecondary }]}>{details.name}</Text> : null}
      {details?.cityName ? <Text style={[s.small, { color: theme.textSecondary }]}>{details.cityName}</Text> : null}
      {details?.terminal ? <Text style={[s.small, { color: theme.textSecondary }]}>Terminal {details.terminal}</Text> : null}
      {details?.timeZone ? <Text style={[s.small, { color: theme.textSecondary }]}>{details.timeZone}</Text> : null}
    </View>
  );
}

function Itinerary({ leg, index, offer, theme }: { leg: FlightLeg; index: number; offer: FlightDetailsFareChoice["offer"]; theme: Theme }) {
  const label = leg.direction === "outbound" ? "Outbound" : leg.direction === "return" ? "Return" : `Flight ${(leg.legIndex ?? index) + 1}`;
  const firstSegment = leg.segments[0];
  const lastSegment = leg.segments.at(-1);
  const technicalStops = nativeTechnicalStopCount(leg);
  return (
    <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={s.direction}>{label} · {nativeFormatDate(leg.departureTime, "en")}</Text>
      <View style={s.legEndpoints}>
        <AirportTime segment={firstSegment} end="origin" fallbackCode={leg.originAirport} theme={theme} />
        <Text style={[s.arrow, { color: theme.textSecondary }]}>→</Text>
        <AirportTime segment={lastSegment} end="destination" fallbackCode={leg.destinationAirport} theme={theme} />
      </View>
      <Text style={[s.bodyText, { color: theme.textSecondary }]}>{leg.duration} · {nativeStopsLabel(leg.stops, technicalStops)}</Text>
      {leg.layovers.map((layover, layoverIndex) => (
        <Text key={`${layover.airport}-${layoverIndex}`} style={[s.small, { color: theme.textSecondary }]}>Connection: {layover.duration} in {layover.airport}</Text>
      ))}
      {leg.segments.map((segment, segmentIndex) => (
        <SegmentDetails key={`${segment.departureTime}-${segmentIndex}`} segment={segment} offer={offer} theme={theme} />
      ))}
    </View>
  );
}

function SegmentDetails({ segment, offer, theme }: { segment: FlightSegment; offer: FlightDetailsFareChoice["offer"]; theme: Theme }) {
  const carrierName = nativeSegmentCarrierName(segment, offer.airlineName);
  const marketingFlight = segment.marketingFlightNumber ?? segment.flightNumber;
  const operatingFlight = segment.operatingFlightNumber;
  return (
    <View style={[s.segment, { borderTopColor: theme.border }]}>
      <View style={s.segmentCarrierRow}>
        <AirlineLogo airlineName={carrierName} logoUrl={nativeCanUseOfferAirlineLogo(segment, offer.airlineName, offer.airlineLogo) ? offer.airlineLogo : null} />
        <View style={s.segmentCarrierCopy}>
          <Text style={[s.bodyText, { color: theme.textPrimary, fontWeight: "800" }]}>{carrierName}{marketingFlight ? ` ${marketingFlight}` : ""}</Text>
          <Text style={[s.small, { color: theme.textSecondary }]}>{nativeFormatTime(segment.departureTime, "en")} {segment.originAirport} → {nativeFormatTime(segment.arrivalTime, "en")} {segment.destinationAirport}</Text>
        </View>
      </View>
      {segment.operatingCarrier ? <Text style={[s.small, { color: theme.textSecondary }]}>Operated by {segment.operatingCarrier.name}{operatingFlight ? ` ${operatingFlight}` : ""}</Text> : null}
      {segment.duration ? <Text style={[s.small, { color: theme.textSecondary }]}>Segment duration: {segment.duration}</Text> : null}
      {segment.distanceKm !== undefined ? <Text style={[s.small, { color: theme.textSecondary }]}>Distance: {nativeFormatDistanceKm(segment.distanceKm, "en")}</Text> : null}
      {segment.aircraft?.name || segment.aircraft?.iataCode ? <Text style={[s.small, { color: theme.textSecondary }]}>Aircraft: {[segment.aircraft?.name, segment.aircraft?.iataCode].filter(Boolean).join(" · ")}</Text> : null}
      {segment.cabinDetails?.map((cabin, cabinIndex) => (
        <Text key={cabinIndex} style={[s.small, { color: theme.textSecondary }]}>
          {[cabin.fareBrandName, cabin.cabinMarketingName ?? cabin.cabinClass, cabin.fareBasisCode].filter(Boolean).join(" · ")}
        </Text>
      ))}
      {segment.technicalStops?.map((stop, stopIndex) => (
        <View key={`${stop.airport.iataCode}-${stopIndex}`} style={s.technicalStop}>
          <Text style={[s.small, { color: theme.textSecondary }]}>Technical stop: {[stop.airport.name, stop.airport.iataCode].filter(Boolean).join(" · ")}{stop.duration ? ` · ${stop.duration}` : ""}</Text>
          {stop.arrivalTime || stop.departureTime ? <Text style={[s.small, { color: theme.textSecondary }]}>Arrival {stop.arrivalTime ? nativeFormatTime(stop.arrivalTime, "en") : "—"} · Departure {stop.departureTime ? nativeFormatTime(stop.departureTime, "en") : "—"}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function FareSurface({
  tab,
  choice,
  displayPriceFor,
  onDeal,
  booking,
  fareReady,
  theme,
}: {
  tab: Tab;
  choice: FlightDetailsFareChoice;
  displayPriceFor: (amount: number, currency: string) => DisplayPrice | null;
  onDeal: (id: string) => Promise<void>;
  booking: boolean;
  fareReady: boolean;
  theme: Theme;
}) {
  const offer = choice.offer;
  const provider = offer.providerDetails;
  const cabinRows = useMemo(() => (offer.legs ?? []).flatMap((leg, legIndex) => leg.segments.flatMap((segment, segmentIndex) =>
    (segment.cabinDetails ?? []).map((cabin) => ({ leg, legIndex, segment, segmentIndex, cabin })))), [offer]);
  const legalLinks = useMemo(() => nativeCarrierConditionsLinks(offer), [offer]);
  const line = (label: string, value: unknown) => value === undefined || value === null || value === "" ? null : (
    <Text style={[s.bodyText, { color: theme.textSecondary }]}><Text style={{ fontWeight: "800", color: theme.textPrimary }}>{label}: </Text>{String(value)}</Text>
  );

  return (
    <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {tab === "deals" ? <>
        {choice.deals.length ? choice.deals.map((deal) => {
          const dealPrice = displayPriceFor(deal.price, deal.currency);
          return (
            <View key={deal.key} style={s.deal}>
              <View style={s.dealCopy}>{line("Provider", deal.providerName)}{line("Price", dealPrice?.formatted ?? "Price unavailable")}</View>
              <Button label={booking ? "Checking…" : "View deal"} disabled={booking || !fareReady || !dealPrice} onPress={() => void onDeal(deal.offerId)} />
            </View>
          );
        }) : <Text style={[s.bodyText, { color: theme.textSecondary }]}>No additional live provider deals were supplied.</Text>}
      </> : null}

      {tab === "details" ? <>
        {cabinRows.length ? cabinRows.map(({ segment, cabin }, index) => (
          <View key={`${segment.departureTime}-${index}`} style={[index > 0 && s.detailGroup]}>
            <Text style={[s.detailHeading, { color: theme.textPrimary }]}>{segment.originAirport} → {segment.destinationAirport}{segment.marketingFlightNumber ?? segment.flightNumber ? ` · ${segment.marketingFlightNumber ?? segment.flightNumber}` : ""}</Text>
            {line("Fare brand", cabin.fareBrandName)}
            {line("Cabin class", cabin.cabinClass ? titleCase(cabin.cabinClass) : undefined)}
            {line("Cabin product", cabin.cabinMarketingName)}
            {line("Fare basis", cabin.fareBasisCode)}
            {nativeAmenityLines(cabin).map((amenity) => <Text key={amenity} style={[s.bodyText, { color: theme.textSecondary }]}>{amenity}</Text>)}
          </View>
        )) : <Text style={[s.bodyText, { color: theme.textSecondary }]}>Additional cabin details were not supplied by the provider.</Text>}
        <View style={s.detailGroup}>
          <Text style={[s.detailHeading, { color: theme.textPrimary }]}>Price breakdown</Text>
          {provider?.price ? <>
            {line("Base fare", provider.price.baseAmount !== undefined && provider.price.baseCurrency ? nativeFormatSourceMoney(provider.price.baseAmount, provider.price.baseCurrency, "en") : undefined)}
            {line("Taxes", provider.price.taxAmount !== undefined && provider.price.taxCurrency ? nativeFormatSourceMoney(provider.price.taxAmount, provider.price.taxCurrency, "en") : undefined)}
            {line("Trip total", nativeFormatSourceMoney(provider.price.totalAmount, provider.price.totalCurrency, "en"))}
          </> : <Text style={[s.bodyText, { color: theme.textSecondary }]}>Price breakdown was not supplied by the provider.</Text>}
          {line("Estimated CO₂", provider?.totalEmissionsKg !== undefined ? `${provider.totalEmissionsKg} kg` : undefined)}
          {line("Provider updated", provider?.updatedAt ? nativeFormatProviderTimestamp(provider.updatedAt, "en") : undefined)}
        </View>
      </> : null}

      {tab === "conditions" ? <>
        {provider?.conditions?.length ? provider.conditions.map((condition, index) => (
          <View key={`${condition.category}-${condition.scope}-${condition.legIndex ?? index}`} style={index > 0 ? s.conditionRow : undefined}>
            <Text style={[s.bodyText, { color: theme.textSecondary }]}>{nativeConditionLabel(condition)}</Text>
            {condition.penaltyAmount !== undefined && condition.penaltyCurrency ? <Text style={[s.small, { color: theme.textSecondary }]}>Penalty: {nativeFormatSourceMoney(condition.penaltyAmount, condition.penaltyCurrency, "en")}</Text> : null}
          </View>
        )) : <Text style={[s.bodyText, { color: theme.textSecondary }]}>Fare conditions were not supplied by the provider.</Text>}
        {provider?.passengerIdentityDocumentsRequired ? <View style={s.passportNotice}><Text style={s.passportNoticeText}>Passport or other supported identity documentation is required for this itinerary.</Text></View> : null}
        {line("Supported documents", provider?.supportedIdentityDocumentTypes?.map(titleCase).join(", "))}
        {line("Offer airline", provider?.offerOwner ? `${provider.offerOwner.name}${provider.offerOwner.iataCode ? ` (${provider.offerOwner.iataCode})` : ""}` : undefined)}
        {line("Provider updated", provider?.updatedAt ? nativeFormatProviderTimestamp(provider.updatedAt, "en") : undefined)}
        {legalLinks.map((link) => (
          <Pressable key={link.url} accessibilityRole="link" accessibilityLabel={`${link.name} conditions of carriage`} onPress={() => void Linking.openURL(link.url)} style={s.link}>
            <Text style={s.editText}>{link.name} conditions of carriage</Text>
          </Pressable>
        ))}
      </> : null}

      {tab === "extras" ? <>
        {provider?.optionalServices?.length ? provider.optionalServices.map((service, index) => (
          <View key={`${service.type}-${service.description}-${index}`} style={s.extra}>
            <Text style={[s.detailHeading, { color: theme.textPrimary }]}>{service.description}</Text>
            {line("Price", `${nativeFormatSourceMoney(service.price, service.currency, "en")}${service.pricedPerTraveler ? " each" : ""}`)}
            {line("Available for", service.travelerCount !== undefined ? `${service.travelerCount} traveler${service.travelerCount === 1 ? "" : "s"}` : undefined)}
            {line(service.pricedPerTraveler ? "Maximum per traveler" : "Maximum quantity", service.maximumQuantity)}
            {line("Journey", service.journeyContext)}
          </View>
        )) : <Text style={[s.bodyText, { color: theme.textSecondary }]}>No optional services were supplied.</Text>}
        {line("Supported loyalty programmes", provider?.supportedLoyaltyProgrammes?.join(", "))}
      </> : null}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  backBar: { minHeight: 52, justifyContent: "center", paddingHorizontal: 16, borderBottomWidth: 1 },
  back: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7 },
  backText: { color: ui.blue, fontWeight: "800" },
  center: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  content: { padding: 18, gap: 14 },
  title: { fontSize: 23, fontWeight: "900" },
  route: { fontSize: 27, fontWeight: "900" },
  bodyText: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  edit: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: ui.blue, borderRadius: 10 },
  editText: { color: ui.blue, fontWeight: "800" },
  sectionTitle: { fontSize: 20, fontWeight: "900", marginTop: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 7 },
  direction: { color: ui.blue, fontWeight: "900", textTransform: "uppercase" },
  legEndpoints: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  airportTime: { flex: 1, gap: 2 },
  airportClock: { fontSize: 20, fontWeight: "900" },
  airportCode: { fontSize: 16, fontWeight: "900" },
  arrow: { paddingTop: 4, fontSize: 20, fontWeight: "800" },
  segment: { borderTopWidth: 1, paddingTop: 10, marginTop: 5, gap: 3 },
  segmentCarrierRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  segmentCarrierCopy: { flex: 1 },
  technicalStop: { marginTop: 4, gap: 2 },
  small: { fontSize: 12, lineHeight: 17 },
  fares: { gap: 10 },
  fareCard: { width: 230, minHeight: 145, borderWidth: 2, borderRadius: 14, padding: 14, gap: 6 },
  fareLabel: { fontSize: 17, fontWeight: "900" },
  farePrice: { color: ui.blue, fontSize: 18, fontWeight: "900" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tab: { minHeight: 44, justifyContent: "center", paddingHorizontal: 9, borderBottomWidth: 2, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: ui.blue },
  tabText: { fontSize: 12, fontWeight: "800" },
  deal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  dealCopy: { flex: 1 },
  detailGroup: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D7DFEA", marginTop: 8, paddingTop: 10 },
  detailHeading: { fontSize: 14, fontWeight: "900", marginBottom: 3 },
  conditionRow: { marginTop: 6 },
  passportNotice: { backgroundColor: "#FFF4D6", padding: 10, borderRadius: 8, marginTop: 6 },
  passportNoticeText: { color: "#694D00", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  extra: { paddingBottom: 8 },
  link: { minHeight: 44, justifyContent: "center" },
  notice: { backgroundColor: "#FFF4D6", padding: 12, borderRadius: 10 },
  noticeText: { color: "#694D00", fontWeight: "700" },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 88, borderTopWidth: 1, paddingHorizontal: 18, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  stickyPrice: { flex: 1, minWidth: 0 },
  total: { fontSize: 22, fontWeight: "900" },
});
