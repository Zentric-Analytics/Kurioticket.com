import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { getApiBaseUrl } from "../../config/apiUrl";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";

export function ExploreMap({ place = "" }: { place?: string }) {
  const { theme } = useAppTheme();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [settledPlace, setSettledPlace] = useState(place);
  useEffect(() => { const timer = setTimeout(() => setSettledPlace(place), 450); return () => clearTimeout(timer); }, [place]);
  const api = getApiBaseUrl(Platform.OS, __DEV__);
  const base = api.ok ? api.baseUrl : null;
  const uri = base ? `${base.replace(/\/$/, "")}/api/mobile/v1/explore/map-embed?q=${encodeURIComponent(settledPlace.slice(0, 160))}` : null;
  useEffect(() => {
    setFailed(false);
    setLoading(true);
    timeout.current = setTimeout(() => { setFailed(true); setLoading(false); }, 20000);
    return () => { if (timeout.current) clearTimeout(timeout.current); };
  }, [uri, attempt]);
  const complete = () => { if (timeout.current) clearTimeout(timeout.current); setLoading(false); };
  const fail = () => { complete(); setFailed(true); };
  return <View style={[s.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    {uri && !failed ? <WebView
      key={`${uri}:${attempt}`} source={{ uri }} style={s.map} scrollEnabled={false}
      accessibilityLabel={place ? `Map of ${place}` : "Explore world map"}

      onLoad={complete}
      onError={fail}
      onHttpError={fail}
    /> : <View style={s.feedback}><Text style={[s.label, { color: theme.textSecondary }]}>Map preview unavailable</Text><Pressable accessibilityRole="button" onPress={() => { setAttempt(value => value + 1); }} style={s.retry}><Text style={s.retryLabel}>Try again</Text></Pressable></View>}
    {loading && !failed && <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.feedback, { backgroundColor: theme.surface }]}><ActivityIndicator color={theme.icon} /><Text style={[s.label, { color: theme.textSecondary }]}>Loading map…</Text></View>}
  </View>;
}
const s = StyleSheet.create({
  container: { height: 280, marginHorizontal: 18, marginVertical: 12, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  map: { flex: 1 }, feedback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  label: { fontFamily: appFonts.regular, fontSize: 14 }, retry: { minHeight: 44, paddingHorizontal: 18, justifyContent: "center" }, retryLabel: { fontFamily: appFonts.semibold, color: "#0754F7", fontSize: 14 },
});
