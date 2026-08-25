import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MobileRecentSearch } from "../../api/travelApi";
import { travelApi } from "../../api/travelApi";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { recentSearchNavigation } from "./recentSearchNavigation";
import { recentSearchPresentation } from "./recentSearchPresentation";
import { signInHref } from "../auth/signInIntent";
import { RecentSearchIllustration } from "./RecentSearchIllustration";

export function RecentSearchesScreen() {
  const { theme } = useAppTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { isAuthenticated, authResolved } = useSavedDestinations();
  const [recent, setRecent] = useState<MobileRecentSearch[]>([]);
  const [recentError, setRecentError] = useState("");
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentMutations, setRecentMutations] = useState<ReadonlySet<string>>(new Set());
  const recentLoadSequence = useRef(0);
  const activeRecentLoadSequence = useRef<number | null>(null);
  const reloadRecentAfterMutations = useRef(false);
  const recentMutationCount = useRef(0);
  const loadServer = useCallback(async () => {
    if (!isAuthenticated || recentMutationCount.current) return;
    const sequence = ++recentLoadSequence.current;
    activeRecentLoadSequence.current = sequence;
    setRecentLoading(true);
    setRecentError("");
    try {
      const searches = await travelApi.recentSearches();
      if (sequence !== recentLoadSequence.current || recentMutationCount.current) return;
      setRecent(searches.items);
      setRecentLoaded(true);
    } catch {
      if (sequence === recentLoadSequence.current && !recentMutationCount.current) setRecentError("Unable to synchronize recent searches. Your last synchronized recent searches remain available.");
    } finally {
      if (activeRecentLoadSequence.current === sequence) activeRecentLoadSequence.current = null;
      if (sequence === recentLoadSequence.current) setRecentLoading(false);
    }
  }, [isAuthenticated]);
  useFocusEffect(useCallback(() => { void loadServer(); }, [loadServer]));
  const beginRecentMutation = (key: string) => {
    if (activeRecentLoadSequence.current !== null) reloadRecentAfterMutations.current = true;
    recentLoadSequence.current += 1;
    recentMutationCount.current += 1;
    setRecentLoading(false);
    setRecentError("");
    setRecentMutations((current) => new Set(current).add(key));
  };
  const finishRecentMutation = (key: string) => {
    recentMutationCount.current = Math.max(0, recentMutationCount.current - 1);
    setRecentMutations((current) => { const next = new Set(current); next.delete(key); return next; });
    if (!recentMutationCount.current && reloadRecentAfterMutations.current) {
      reloadRecentAfterMutations.current = false;
      void loadServer();
    }
  };
  const removeRecent = async (item: MobileRecentSearch) => {
    const key = `delete:${item.id}`;
    if (recentMutations.has(key) || recentMutations.has("clear")) return;
    beginRecentMutation(key);
    try {
      await travelApi.deleteRecentSearch(item.id);
      setRecent((current) => current.filter((row) => row.id !== item.id));
    } catch {
      setRecentError("Unable to remove that recent search.");
    } finally {
      finishRecentMutation(key);
    }
  };
  const clearRecent = async () => {
    if (recentMutationCount.current) return;
    beginRecentMutation("clear");
    try {
      await travelApi.clearRecentSearches();
      setRecent([]);
      setRecentLoaded(true);
    } catch {
      setRecentError("Unable to clear recent searches.");
    } finally {
      finishRecentMutation("clear");
    }
  };
  return <SafeAreaView edges={["top", "bottom"]} style={[styles.safe, { backgroundColor: theme.background }]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><FlowIcon name="back" color={theme.icon} size={27} /></Pressable><View style={styles.headerCopy}><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Recent searches</Text><Text style={[styles.description, { color: theme.muted }]}>Recent shows searches you recently performed.</Text></View></View>
    {!authResolved ? null : !isAuthenticated ? <View style={styles.center}><FlowIcon name="clock" color={flowColors.blue} size={42} /><Text style={[styles.guestTitle, { color: theme.text }]}>Sign in to view recent searches</Text><Text style={[styles.guestText, { color: theme.muted }]}>Your recent searches are private to your account.</Text><Pressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => router.push(signInHref("/recent"))} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable></View> : <ScrollView alwaysBounceVertical={false} bounces={false} contentContainerStyle={recentLoaded && !recent.length ? styles.emptyContent : styles.content} overScrollMode="never">
      {recentError ? <Text accessibilityRole="alert" style={styles.syncError}>{recentError}</Text> : null}
      {recent.length ? <><View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: theme.text }]}>Recent</Text><Pressable accessibilityRole="button" accessibilityLabel="Clear recent searches" disabled={recentMutations.size > 0} onPress={() => void clearRecent()} style={styles.clearTouchTarget}><Text style={[styles.clear, recentMutations.size > 0 && styles.disabled]}>Clear all</Text></Pressable></View>{recent.map((item) => {
        const presentation = recentSearchPresentation(item);
        return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Rerun ${item.label}`} onPress={() => router.push(recentSearchNavigation(item))} style={({ pressed }) => [styles.recentRow, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}><View style={[styles.iconTile, { backgroundColor: theme.dark ? "#19376D" : "#F2F6FF" }]}><FlowIcon name={presentation.icon} color={flowColors.blue} size={21} /></View><View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>{presentation.title}</Text><Text numberOfLines={1} style={[styles.metadata, { color: theme.muted }]}>{presentation.metadata}</Text></View><View style={styles.rowActions}><FlowIcon name="chevron" color={theme.icon} size={18} /><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.label}`} disabled={recentMutations.has(`delete:${item.id}`) || recentMutations.has("clear")} onPress={(event) => { event.stopPropagation(); void removeRecent(item); }} style={({ pressed }) => [styles.removeTouchTarget, pressed && styles.pressed]}><FlowIcon name="close" color={theme.icon} size={15} /></Pressable></View></Pressable>;
      })}</> : !recentLoaded ? (recentLoading && !recentError ? <View style={styles.center}><ActivityIndicator accessibilityLabel="Loading recent searches" color={flowColors.blue} /></View> : null) : <><View style={styles.emptyTopSpacer} /><View testID="recent-search-illustration" style={[styles.illustration, { width: Math.min(220, windowWidth - 72), height: Math.min(198, (windowWidth - 72) * .9) }]}><RecentSearchIllustration border={theme.border} surface={theme.surface} muted={theme.muted} /></View><View style={[styles.illustrationGap, windowHeight < 760 && styles.illustrationGapShort]} /><Text style={[styles.emptyTitle, { color: theme.text }]}>Your next search starts here</Text><Text style={[styles.emptyText, { color: theme.muted }]}>Search for flights or hotels and your recent searches will appear here for easy access.</Text><Pressable accessibilityRole="button" accessibilityLabel="Start a search" onPress={() => router.dismissTo("/(tabs)")} style={({ pressed }) => [styles.emptyPrimary, pressed && styles.pressed]}><Text style={styles.primaryText}>Start a search</Text></Pressable><View style={styles.emptyBottomSpacer} /></>}
    </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, header: { minHeight: 76, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }, back: { width: 46, height: 46, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, paddingRight: 12 }, title: { fontSize: 25, lineHeight: 31, fontWeight: "800" }, description: { fontSize: 13, lineHeight: 18, marginTop: 1 }, content: { paddingHorizontal: 18, paddingBottom: 30 }, syncError: { color: "#A4262C", marginTop: 10, marginBottom: 4 }, sectionHeader: { minHeight: 40, marginTop: -12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: "800" }, clearTouchTarget: { minHeight: 44, justifyContent: "center", paddingLeft: 16 }, clear: { color: flowColors.blue, fontSize: 14, fontWeight: "700" }, disabled: { opacity: 0.45 }, recentRow: { minHeight: 80, borderWidth: 1, borderRadius: 14, paddingLeft: 12, paddingRight: 4, marginBottom: 10, flexDirection: "row", alignItems: "center" }, pressed: { opacity: 0.68 }, iconTile: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" }, rowCopy: { flex: 1, minWidth: 0, marginLeft: 12 }, name: { fontSize: 17, lineHeight: 22, fontWeight: "700" }, metadata: { fontSize: 13, lineHeight: 18, fontWeight: "500", marginTop: 3 }, rowActions: { flexDirection: "row", alignItems: "center", marginLeft: 4 }, removeTouchTarget: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, center: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 }, guestTitle: { fontSize: 20, lineHeight: 27, fontWeight: "800", textAlign: "center", marginTop: 15 }, guestText: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 6 }, emptyContent: { flexGrow: 1, alignItems: "center", paddingHorizontal: 24 }, emptyTopSpacer: { flexGrow: .72, minHeight: 28 }, illustration: { alignSelf: "center" }, illustrationGap: { height: 66 }, illustrationGapShort: { height: 55 }, emptyTitle: { maxWidth: 330, fontSize: 23, lineHeight: 30, fontWeight: "800", textAlign: "center" }, emptyText: { width: "86%", maxWidth: 380, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 14 }, emptyPrimary: { width: 208, minHeight: 50, marginTop: 31, borderRadius: 10, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", backgroundColor: flowColors.blue }, emptyBottomSpacer: { flexGrow: 1, minHeight: 24 }, primary: { minHeight: 48, marginTop: 20, borderRadius: 10, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", backgroundColor: flowColors.blue }, primaryText: { color: "white", fontSize: 15, fontWeight: "800" } });
