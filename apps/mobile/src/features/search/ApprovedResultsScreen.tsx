import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { router, useLocalSearchParams } from "expo-router";
import {
  travelApi,
  type FlightResult,
  type HotelResult,
} from "../../api/travelApi";
import {
  buildSearchPlan,
  validBookableHotel,
  validFlight,
} from "../flow/travelSearchModel";
import { FlowIcon } from "../flow/FlowIcon";
import {
  Badge,
  Button,
  DateStrip,
  Empty,
  Pill,
  TopBar,
  clock,
  money,
  s,
  shortDate,
  ui,
} from "./SearchUi";
import { visualFlights, visualHotels } from "./visualFixtures";
import { airports } from "../flow/airportData";
import { useFeatureAvailability } from "../availability/FeatureAvailability";

type Product = "flight" | "hotel";
type Status = "loading" | "ready" | "empty" | "error";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const airportLabel = (code: unknown) => {
  const value = String(code || "").toUpperCase();
  const airport = airports.find((item) => item.code === value);
  return airport ? `${airport.city} (${value})` : value;
};
export function ApprovedResultsScreen({ product }: { product: Product }) {
  const { width } = useWindowDimensions();
  const narrowHeader = width < 360;
  const stackedResultsSummary = width < 390;
  const { availability } = useFeatureAvailability();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const plan = useMemo(
    () => buildSearchPlan(product, params),
    [product, JSON.stringify(params)],
  );
  const [results, setResults] = useState<(FlightResult | HotelResult)[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [sort, setSort] = useState("best");
  const visualTest =
    process.env.EXPO_PUBLIC_VISUAL_TEST === "1" && one(params.visual) === "1";
  const load = useCallback(async () => {
    if (!plan.plan) {
      setStatus("error");
      setMessage(plan.error || "Invalid search");
      return;
    }
    setStatus("loading");
    setMessage("");
    if (visualTest) {
      setResults(product === "flight" ? visualFlights : visualHotels);
      setStatus("ready");
      return;
    }
    try {
      const response =
        product === "flight"
          ? await travelApi.searchFlights(plan.plan.payload)
          : await travelApi.searchHotels(plan.plan.payload);
      const valid =
        product === "flight"
          ? (response.results as FlightResult[]).filter((x) =>
              validFlight(x, plan.plan!),
            )
          : (response.results as HotelResult[]).filter(validBookableHotel);
      setResults(valid);
      setStatus(valid.length ? "ready" : "empty");
      setMessage(response.warnings?.[0] || "");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Search failed");
    }
  }, [product, plan.plan?.key, retry, visualTest]);
  useEffect(() => {
    void load();
  }, [load]);
  const edit = () =>
    router.canGoBack()
      ? router.back()
      : router.replace(product === "flight" ? "/flights" : "/hotels");
  const sorted = useMemo(
    () =>
      [...results].sort((a, b) =>
        sort === "price"
          ? product === "flight"
            ? (a as FlightResult).price - (b as FlightResult).price
            : (a as HotelResult).totalPrice! - (b as HotelResult).totalPrice!
          : product === "flight"
            ? (b as FlightResult).valueScore - (a as FlightResult).valueScore
            : (b as HotelResult).valueScore - (a as HotelResult).valueScore,
      ),
    [results, sort, product],
  );
  const payload = plan.plan?.payload || {};
  const date = String(
    product === "flight"
      ? payload.departureDate
      : payload.checkIn || new Date().toISOString().slice(0, 10),
  );
  const prices = sorted
    .slice(0, 5)
    .map((x) =>
      product === "flight"
        ? (x as FlightResult).price
        : (x as HotelResult).pricePerNight!,
    );
  return (
    <SafeAreaView style={s0.safe} edges={["top"]}>
      <TopBar />
      <View style={[s0.summary, narrowHeader && s0.summaryNarrow]}>
        <View style={s0.summaryCopy}>
          <Text style={s0.route}>
            {product === "flight"
              ? `${airportLabel(payload.origin)}  ⇄  ${airportLabel(payload.destination)}`
              : String(payload.destination || "")}
          </Text>
          <Text style={[s0.sub, s0.summaryMeta]}>
            {product === "flight"
              ? `${shortDate(String(payload.departureDate || ""))} – ${shortDate(String(payload.returnDate || ""))}  ·  ${payload.travelers} Traveler${payload.travelers === 1 ? "" : "s"}  ·  ${String(payload.cabinClass || "").replace(/-/g, " ")}`
              : `${shortDate(String(payload.checkIn || ""))} – ${shortDate(String(payload.checkOut || ""))}  ·  ${payload.rooms || 1} Room, ${payload.guests || 2} Guests`}
          </Text>
        </View>
        <View style={narrowHeader && s0.editNarrow}>
          <Pill label="Edit search" icon="document" onPress={edit} />
        </View>
      </View>
      <DateStrip
        date={date}
        prices={prices}
        onSelect={(v) =>
          router.setParams(
            product === "flight" ? { departureDate: v } : { checkIn: v },
          )
        }
      />
      <ScrollView
        horizontal
        style={s0.filterRail}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s0.filters}
      >
        <Pill
          label="Filters"
          icon="sliders"
          onPress={() =>
            Alert.alert(
              "Filters",
              "Filter controls use the current live result set.",
            )
          }
        />
        {(product === "flight"
          ? ["Stops", "Airlines", "Times"]
          : ["Price", "Guest rating", "Property type"]
        ).map((x) => (
          <Pill
            key={x}
            label={x}
            onPress={() =>
              Alert.alert(
                x,
                "No additional values are available from this search response.",
              )
            }
          />
        ))}
        <Pill
          label={`Sort: ${sort === "price" ? "Price" : product === "flight" ? "Best" : "Recommended"}`}
          active
          onPress={() => setSort((x) => (x === "best" ? "price" : "best"))}
        />
      </ScrollView>
      <ScrollView contentContainerStyle={s0.body}>
        {status === "loading" ? <Loading product={product} /> : null}
        {message ? (
          <Text accessibilityRole="alert" style={s0.notice}>
            {message}
          </Text>
        ) : null}
        {status === "empty" ? (
          <Empty
            title={`No ${product === "flight" ? "flights" : "properties"} found`}
            body="Try changing your dates or removing filters."
            retry={() => setRetry((x) => x + 1)}
            edit={edit}
          />
        ) : null}
        {status === "error" ? (
          <Empty
            title="Search could not be completed"
            body={message || "Check your connection and try again."}
            retry={() => setRetry((x) => x + 1)}
            edit={edit}
          />
        ) : null}
        {status === "ready" ? (
          <View style={[s0.found, stackedResultsSummary && s0.foundNarrow]}>
            <View style={s0.foundCopy}>
              <Text style={s0.foundTitle}>
                {results.length}{" "}
                {product === "flight" ? "flights" : "properties"} found
              </Text>
              <Text style={s0.sub}>
                Prices include taxes and fees when reported by the provider
              </Text>
            </View>
            {product === "hotel" ? (
              <Button
                label="Map view"
                outline
                onPress={() =>
                  Alert.alert(
                    "Map view",
                    "Map inventory is not available from this provider response.",
                  )
                }
              />
            ) : (
              <View
                style={[
                  s0.foundAside,
                  stackedResultsSummary && s0.foundAsideNarrow,
                ]}
              >
                <Text style={s0.change}>ⓘ Price may change</Text>
                <Text style={s0.sub}>Book soon to lock in this price.</Text>
              </View>
            )}
          </View>
        ) : null}
        {sorted.map((x, i) =>
          product === "flight" ? (
            <FlightCard key={x.id} result={x as FlightResult} rank={i} params={params} />
          ) : (
            <HotelCard
              key={x.id}
              result={x as HotelResult}
              rank={i}
              params={params}
            />
          ),
        )}
        {status === "ready" && availability.priceAlerts ? <PriceAlert product={product} /> : null}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}
function FlightCard({ result, rank, params }: { result: FlightResult; rank: number; params: Record<string, string | string[]> }) {
  const [saved, setSaved] = useState(false);
  return (
    <View style={[s0.card, rank === 0 && s0.best]}>
      <View style={s0.cardTop}>
        {rank === 0 ? (
          <View style={s0.badgeRow}>
            <Badge>★ Best overall</Badge>
            <Badge green>Great price</Badge>
          </View>
        ) : rank === 1 ? (
          <Badge green>2nd best</Badge>
        ) : (
          <Badge>
            {result.stops
              ? `${result.stops} stop${result.stops > 1 ? "s" : ""}`
              : "Nonstop"}
          </Badge>
        )}
        <Pressable
          accessibilityLabel={`${saved ? "Remove" : "Save"} ${result.airlineName}`}
          onPress={() => setSaved(!saved)}
        >
          <FlowIcon
            name="heart"
            fill={saved ? ui.blue : "none"}
            color={saved ? ui.blue : ui.muted}
          />
        </Pressable>
      </View>
      <View style={s0.flightMain}>
        {result.airlineLogo ? (
          <Image source={{ uri: result.airlineLogo }} style={s0.airline} />
        ) : (
          <View style={s0.airlineFallback}>
            <Text>{result.airlineName.slice(0, 2)}</Text>
          </View>
        )}
        <View style={s0.departureBlock}>
          <Text style={s0.nameSmall}>{result.airlineName}</Text>
          <Text style={s0.time}>{clock(result.departureTime)}</Text>
          <Text style={s0.sub}>{result.originAirport}</Text>
        </View>
        <View style={s0.timeline}>
          <Text style={s0.sub}>{result.duration}</Text>
          <View style={s0.line} />
          <Text style={s0.nonstop}>
            {result.stops ? `${result.stops} stop` : "Nonstop"}
          </Text>
        </View>
        <View style={s0.arrivalBlock}>
          <Text style={s0.time}>{clock(result.arrivalTime)}</Text>
          <Text style={s0.sub}>{result.destinationAirport}</Text>
        </View>
        <View style={s0.priceBox}>
          <Text style={s0.bigPrice}>
            {money(result.currency, result.price)}
          </Text>
          <Text style={s0.sub}>round trip</Text>
        </View>
      </View>
      <View style={s0.benefits}>
        <Text style={s0.benefit}>
          ▣ {result.baggageInfo || "Baggage details unavailable"}
        </Text>
        <Text style={s0.benefit}>◉ Seat selection unavailable</Text>
        <Text style={s0.benefit}>
          ◉ {result.refundInfo || "Fare rules unavailable"}
        </Text>
        <Button
          label="View details"
          outline={rank !== 0}
          onPress={() =>
            router.push({
              pathname: "/flight-details",
              params: {
                result: JSON.stringify(result),
                ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, one(value) || ""])),
              },
            })
          }
        />
      </View>
    </View>
  );
}
function HotelCard({
  result,
  rank,
  params,
}: {
  result: HotelResult;
  rank: number;
  params: Record<string, string | string[]>;
}) {
  const [saved, setSaved] = useState(false);
  const compact = useWindowDimensions().width < 430;
  const score =
    result.reviewScore == null
      ? result.rating
      : result.reviewScore * (10 / (result.reviewScale || 10));
  return (
    <View style={[s0.hotelCard, compact && s0.hotelCardCompact]}>
      <View style={[s0.hotelImageWrap, compact && s0.hotelImageWrapCompact]}>
        {result.imageUrl ? (
          <Image source={{ uri: result.imageUrl }} style={s0.hotelImage} />
        ) : (
          <View style={s0.hotelImage} />
        )}
        <View style={s0.overlay}>
          <Text style={s0.overlayText}>
            {result.imageUrls?.length
              ? `▧ 1 / ${result.imageUrls.length}`
              : "Image unavailable"}
          </Text>
        </View>
        <View style={s0.hotelBadge}>
          <Badge>
            {rank === 0
              ? "Best overall"
              : rank === 1
                ? "Great price"
                : "Highly rated"}
          </Badge>
        </View>
      </View>
      <View style={[s0.hotelCopy, compact && s0.hotelCopyCompact]}>
        <Pressable onPress={() => setSaved(!saved)} style={s0.heart}>
          <FlowIcon name="heart" fill={saved ? ui.blue : "white"} />
        </Pressable>
        <Text style={s0.hotelName}>{result.name}</Text>
        <Text style={s0.stars}>
          {"★".repeat(result.classificationStars || Math.round(result.rating))}{" "}
          <Text style={s0.sub}>
            {" "}
            · {result.neighbourhood || result.location}
          </Text>
        </Text>
        <Text style={s0.review}>
          <Text style={s0.score}>{score.toFixed(1)}</Text>{" "}
          {score >= 9 ? "Exceptional" : score >= 8 ? "Excellent" : "Good"}
          {result.reviewCount
            ? `  ·  ${result.reviewCount.toLocaleString()} reviews`
            : ""}
        </Text>
        {result.distanceFromCenter ? (
          <Text style={s0.sub}>
            ⌾ {result.distanceFromCenter} from city center
          </Text>
        ) : null}
        <View style={s0.amenities}>
          {result.amenities.slice(0, 3).map((a) => (
            <Text key={a} style={s0.amenity}>
              ● {a}
            </Text>
          ))}
        </View>
        <Text style={s0.providers}>{result.provider}</Text>
        <View style={s0.hotelPrice}>
          <View style={s0.foundCopy}>
            <Text style={s0.bigPrice}>
              {money(result.currency, result.pricePerNight)}
              <Text style={s0.sub}> /night</Text>
            </Text>
            <Text style={s0.sub}>
              {money(result.currency, result.totalPrice)} total
            </Text>
          </View>
          <Button
            label="View deal"
            onPress={() =>
              router.push({
                pathname: "/hotel-details",
                params: {
                  result: JSON.stringify(result),
                  ...Object.fromEntries(
                    Object.entries(params).map(([k, v]) => [k, one(v) || ""]),
                  ),
                },
              })
            }
          />
        </View>
      </View>
    </View>
  );
}
function Loading({ product }: { product: Product }) {
  return (
            <View style={s0.foundAside}>
      {[0, 1, 2].map((x) => (
        <View key={x} style={s0.skeleton} />
      ))}
      <View style={s0.loading}>
        <ActivityIndicator color={ui.blue} />
        <Text style={s0.sub}>
          Searching available {product === "flight" ? "flights" : "stays"}…
        </Text>
      </View>
    </View>
  );
}
function PriceAlert({ product }: { product: Product }) {
  return (
    <View style={s0.alert}>
      <View style={s0.alertIcon}>
        <FlowIcon name="bell" color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s0.foundTitle}>Price alerts</Text>
        <Text style={s0.sub}>
          Track this {product === "flight" ? "route" : "search"} and get
          notified when prices drop.
        </Text>
      </View>
      <Button
        label="Track prices"
        outline
        onPress={() => router.push("/price-alerts")}
      />
    </View>
  );
}
export function BottomNav() {
  const inset = useSafeAreaInsets();
  return (
    <View style={[s0.nav, { paddingBottom: Math.max(inset.bottom, 8) }]}>
      {[
        ["compass", "Explore"],
        ["trip", "Trips"],
        ["search", "Search"],
        ["heart", "Saved"],
        ["person", "Profile"],
      ].map(([icon, label]) => (
        <View key={label} style={s0.navItem}>
          <FlowIcon
            name={icon as never}
            color={label === "Search" ? ui.blue : ui.muted}
          />
          <Text style={[s0.navText, label === "Search" && { color: ui.blue }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
const s0 = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  summary: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryNarrow: { flexDirection: "column", gap: 8 },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryMeta: { marginTop: 3 },
  editNarrow: { alignSelf: "flex-start" },
  filterRail: { height: 64, flexGrow: 0 },
  route: { fontSize: 20, lineHeight: 25, fontWeight: "900", color: ui.navy },
  sub: { fontSize: 12, color: ui.muted, lineHeight: 17 },
  filters: { paddingHorizontal: 18, paddingVertical: 10, gap: 9, alignItems: "center" },
  body: { paddingHorizontal: 18, paddingBottom: 92, gap: 14 },
  notice: {
    backgroundColor: "#F2F6FF",
    color: ui.navy,
    padding: 10,
    borderRadius: 8,
  },
  found: {
    minHeight: 78,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFCFF",
    gap: 12,
  },
  foundNarrow: { alignItems: "flex-start", flexDirection: "column", gap: 8 },
  foundCopy: { flex: 1, minWidth: 0 },
  foundAside: { flexShrink: 1, maxWidth: 160 },
  foundAsideNarrow: { maxWidth: "100%" },
  foundTitle: { fontSize: 16, fontWeight: "800", color: ui.navy },
  change: { color: ui.navy, fontSize: 12 },
  card: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 14,
    padding: 15,
    gap: 15,
    backgroundColor: "white",
  },
  best: { borderColor: ui.blue },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  badgeRow: { flexDirection: "row", gap: 7 },
  flightMain: { flexDirection: "row", alignItems: "center", gap: 6 },
  airline: { width: 38, height: 38, resizeMode: "contain" },
  airlineFallback: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: "#EEF2F8",
    alignItems: "center",
    justifyContent: "center",
  },
  nameSmall: { fontSize: 12, color: ui.navy, fontWeight: "700" },
  departureBlock: { flex: 1.15, minWidth: 0 },
  arrivalBlock: { flex: 0.9, minWidth: 0 },
  time: { fontSize: 17, fontWeight: "900", color: ui.navy },
  timeline: { flex: 1, minWidth: 56, maxWidth: 95, alignItems: "center" },
  line: {
    width: "100%",
    height: 1,
    backgroundColor: ui.muted,
    marginVertical: 7,
  },
  nonstop: { fontSize: 11, color: ui.blue },
  priceBox: { width: 62, flexShrink: 0, alignItems: "flex-end" },
  bigPrice: { fontSize: 22, fontWeight: "900", color: ui.navy },
  benefits: {
    borderTopWidth: 1,
    borderTopColor: "#EDF0F5",
    paddingTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefit: { fontSize: 11, color: ui.muted, flex: 1 },
  hotelCard: {
    height: 234,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 13,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: "white",
  },
  hotelCardCompact: { height: 282 },
  hotelImageWrap: { width: "39%" },
  hotelImageWrapCompact: { width: "38%" },
  hotelImage: { width: "100%", height: "100%", backgroundColor: "#E9EDF3" },
  overlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,.72)",
    padding: 6,
    borderRadius: 5,
  },
  overlayText: { color: "white", fontSize: 10, fontWeight: "700" },
  hotelBadge: { position: "absolute", top: 10, left: 9 },
  hotelCopy: { flex: 1, padding: 12, gap: 5 },
  hotelCopyCompact: { padding: 10 },
  heart: { position: "absolute", right: 8, top: 7, zIndex: 2 },
  hotelName: {
    fontSize: 17,
    fontWeight: "900",
    color: ui.navy,
    paddingRight: 30,
  },
  stars: { color: "#FFB800", fontSize: 14 },
  review: { fontSize: 11, color: ui.navy },
  score: { backgroundColor: ui.blue, color: "white", fontWeight: "900" },
  amenities: { gap: 3 },
  amenity: { color: ui.green, fontSize: 10 },
  providers: { fontSize: 10, color: ui.muted },
  hotelPrice: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeleton: {
    height: 160,
    backgroundColor: "#EEF1F6",
    borderRadius: 14,
    marginBottom: 12,
  },
  loading: {
    position: "absolute",
    top: 130,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
  },
  alert: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 13,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "#FAFCFF",
  },
  alertIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ui.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: ui.border,
    paddingTop: 9,
    backgroundColor: "white",
  },
  navItem: { flex: 1, alignItems: "center", gap: 3 },
  navText: { fontSize: 10, color: ui.muted, fontWeight: "700" },
});
