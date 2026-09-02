import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { travelApi, type PackageSearchResponse } from "../../api/travelApi";
import { createPackageSearch, includedProducts, packageApiPayload, packageRouteParams, validatePackageSearch, type PackageSearch } from "./packageSearchModel";
import { buildRecentSearch, recordRecentSearchBestEffort } from "../recent/recentSearch";
import { ScreenHeader } from "./FlowPrimitives";
import { useFlowTheme } from "./flowStyles";

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const number = (value: string | undefined, fallback: number) => /^\d+$/.test(value ?? "") ? Number(value) : fallback;
function resultLabel(value: unknown, product: "flight" | "hotel" | "car") {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (product === "flight") return [item.airlineName, item.flightNumber].filter((part) => typeof part === "string" && part).join(" · ") || "Flight option";
  if (product === "hotel") return typeof item.name === "string" && item.name ? item.name : "Hotel option";
  return [item.rentalCompanyName, item.modelName].filter((part) => typeof part === "string" && part).join(" · ") || "Car option";
}
function readSearch(params: Record<string, string | string[] | undefined>): PackageSearch {
  const base = createPackageSearch();
  return {
    ...base,
    mode: (one(params.mode) as PackageSearch["mode"]) || base.mode,
    origin: one(params.origin) ?? "", originCode: one(params.originCode) ?? "",
    destination: one(params.destination) ?? "", destinationCode: one(params.destinationCode) ?? "",
    startDate: one(params.startDate) ?? "", endDate: one(params.endDate) ?? "",
    adults: number(one(params.adults), 1), children: number(one(params.children), 0), infants: number(one(params.infants), 0), rooms: number(one(params.rooms), 1),
    cabin: (one(params.cabin) as PackageSearch["cabin"]) || "economy",
    carPickupLocation: one(params.carPickupLocation) ?? "", carPickupDate: one(params.carPickupDate) ?? "", carReturnDate: one(params.carReturnDate) ?? "",
    carPickupTime: one(params.carPickupTime) ?? "10:00", carReturnTime: one(params.carReturnTime) ?? "10:00", carDriverAge: number(one(params.carDriverAge), 30),
  };
}

export function PackageResultsScreen() {
  const ft = useFlowTheme();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const search = useMemo(() => readSearch(params), [JSON.stringify(params)]);
  const [response, setResponse] = useState<PackageSearchResponse>();
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  useEffect(() => {
    if (!validatePackageSearch(search)) { router.replace({ pathname: "/packages", params: { destination: search.destination } }); return; }
    const controller = new AbortController();
    setError("");
    void travelApi.searchPackages(packageApiPayload(search), { signal: controller.signal, requestId: `mobile-package-${Date.now().toString(36)}` }).then(value => { setResponse(value); void recordRecentSearchBestEffort(buildRecentSearch("package", search)); }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Package search failed.");
    });
    return () => controller.abort();
  }, [search]);
  const included = includedProducts(search.mode);
  const saveSearch = async () => {
    setSavedMessage("");
    try {
      await travelApi.createSavedItem({ type: "search", searchType: "package", label: `Package to ${search.destination}`, destination: search.destination, checkIn: search.startDate, checkOut: search.endDate, query: packageRouteParams(search) });
      setSavedMessage("Package search saved.");
    } catch (reason) {
      setSavedMessage(reason instanceof Error ? reason.message : "Sign in to save this package search.");
    }
  };
  return <SafeAreaView style={ft.styles.safe}><ScreenHeader title="Package results" back /><ScrollView contentContainerStyle={styles.content}>
    <Text style={ft.styles.meta}>{search.origin ? `${search.origin} → ` : ""}{search.destination} · {search.startDate} — {search.endDate}</Text>
    {!response && !error ? <ActivityIndicator accessibilityLabel="Searching package components" /> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: ft.colors.red }}>{error}</Text> : null}
    {response ? <>
      {response.status === "partial" ? <Text accessibilityRole="alert" style={{ color: ft.colors.secondaryText }}>Some package components are temporarily unavailable. Available results are preserved below.</Text> : null}
      {(["flight", "hotel", "car"] as const).filter((product) => included[product]).map((product) => {
        const component = response.components[product];
        return <View key={product} style={[ft.styles.card, styles.card]}><Text accessibilityRole="header" style={ft.styles.sectionTitle}>{product[0].toUpperCase()}{product.slice(1)}</Text><Text style={ft.styles.value}>{component?.status === "unavailable" ? "Temporarily unavailable" : `${component?.results.length ?? 0} canonical results`}</Text>{component?.results.slice(0, 3).map((result, index) => <Text key={`${product}-${index}`} style={ft.styles.meta}>{resultLabel(result, product)}</Text>)}<Text style={ft.styles.meta}>{component?.source ?? "No provider response"}</Text></View>;
      })}
      <Text style={ft.styles.meta}>{response.packageOffers.length ? `${response.packageOffers.length} provider-backed bundle offers` : "Bundle offers are shown only when supplied by a real package provider. No bundle provider is currently connected."}</Text>
    </> : null}
    <Pressable accessibilityRole="button" onPress={() => void saveSearch()} style={[styles.button, { borderColor: ft.colors.blue, borderWidth: 1 }]}><Text style={[styles.buttonText, { color: ft.colors.blue }]}>Save package search</Text></Pressable>
    {savedMessage ? <Text accessibilityRole="alert" style={ft.styles.meta}>{savedMessage}</Text> : null}
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.button, { backgroundColor: ft.colors.blue }]}><Text style={styles.buttonText}>Modify package search</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ content: { padding: 16, gap: 14 }, card: { padding: 16, gap: 6 }, button: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontWeight: "800" } });
