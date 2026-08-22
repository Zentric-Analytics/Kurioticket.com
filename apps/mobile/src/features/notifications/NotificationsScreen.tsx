import { useCallback, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { travelApi, TravelApiError, type MobileNotification } from "../../api/travelApi";
import { readSession } from "../../storage/sessionStorage";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors, flowStyles } from "../flow/flowStyles";
import { canLoadMore, initialNotificationPaginationState, notificationPaginationReducer } from "./notificationPagination";
import { useAppTheme } from "../../theme/AppTheme";

export function NotificationsScreen() {
  const { theme } = useAppTheme();
  const [state, dispatch] = useReducer(notificationPaginationReducer, initialNotificationPaginationState);
  const [pendingAll, setPendingAll] = useState(false);
  const requestSequence = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadFirstPage = useCallback(async (refresh = false) => {
    const requestId = ++requestSequence.current;
    loadingMoreRef.current = false;
    dispatch({ type: "first-start", requestId, refresh });
    try {
      const page = await travelApi.notifications();
      dispatch({ type: "first-success", requestId, items: page.items, nextCursor: page.nextCursor });
    } catch (cause) {
      if ((cause instanceof TravelApiError && cause.status === 401) || !await readSession().catch(() => null)) { router.replace({ pathname: "/(tabs)/profile/sign-in", params: { returnTo: "/notifications" } }); return; }
      dispatch({ type: "first-failure", requestId, message: cause instanceof TravelApiError ? cause.message : "Unable to load notifications." });
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadFirstPage(); }, [loadFirstPage]));

  const loadMore = useCallback(async () => {
    if (!canLoadMore(state) || loadingMoreRef.current || !state.nextCursor) return;
    loadingMoreRef.current = true;
    const cursor = state.nextCursor;
    const requestId = ++requestSequence.current;
    dispatch({ type: "more-start", requestId });
    try {
      const page = await travelApi.notifications(cursor);
      dispatch({ type: "more-success", requestId, items: page.items, nextCursor: page.nextCursor });
    } catch (cause) {
      dispatch({ type: "more-failure", requestId, message: cause instanceof TravelApiError ? cause.message : "Unable to load older notifications." });
    } finally {
      if (requestSequence.current === requestId) loadingMoreRef.current = false;
    }
  }, [state]);

  const open = async (item: MobileNotification) => {
    if (!item.readAt) {
      dispatch({ type: "mark-read", id: item.id, readAt: new Date().toISOString() });
      await travelApi.markNotificationRead(item.id).catch(() => dispatch({ type: "message", message: "Unable to mark notification as read." }));
    }
    if (item.actionPath) router.push(item.actionPath);
  };
  const markAll = async () => {
    if (pendingAll) return;
    setPendingAll(true);
    try { await travelApi.markAllNotificationsRead(); dispatch({ type: "mark-all", readAt: new Date().toISOString() }); }
    catch { dispatch({ type: "message", message: "Unable to mark all notifications as read." }); }
    finally { setPendingAll(false); }
  };
  const unread = state.items.some((item) => !item.readAt);

  return <SafeAreaView style={[flowStyles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
    <View style={[styles.header, { borderBottomColor: theme.border }]}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" color={theme.icon} /></Pressable><Text accessibilityRole="header" style={[flowStyles.title, { color: theme.text }]}>Notifications</Text>{unread ? <Pressable accessibilityRole="button" accessibilityLabel="Mark all notifications as read" disabled={pendingAll} onPress={() => void markAll()} style={styles.markAll}><Text style={styles.link}>Mark all read</Text></Pressable> : <View style={styles.markAll} />}</View>
    {state.loading && !state.items.length ? <View style={styles.center}><ActivityIndicator color={flowColors.blue} /><Text style={flowStyles.meta}>Loading notifications…</Text></View> : null}
    {state.error ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>{state.error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry loading notifications" onPress={() => void loadFirstPage()}><Text style={styles.link}>Try again</Text></Pressable></View> : null}
    {!state.loading || state.items.length ? <ScrollView alwaysBounceVertical={false} bounces={false} overScrollMode="never" refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void loadFirstPage(true)} />} contentContainerStyle={styles.list}>
      {state.items.length ? state.items.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.readAt ? "Read" : "Unread"} ${item.title}. ${item.body}`} onPress={() => void open(item)} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, !item.readAt && { backgroundColor: theme.dark ? "#142A45" : "#F3F7FF", borderColor: theme.dark ? "#395D91" : "#BED2FA" }]}><View style={styles.icon}><FlowIcon name="bell" color={item.readAt ? flowColors.muted : flowColors.blue} size={20} /></View><View style={styles.copy}><Text style={[styles.title, { color: theme.text }, !item.readAt && styles.unreadTitle]}>{item.title}</Text><Text style={flowStyles.meta}>{item.body}</Text><Text style={styles.time}>{formatTime(item.createdAt)}</Text></View>{!item.readAt ? <View accessibilityLabel="Unread" style={styles.dot} /> : null}</Pressable>) : <View style={styles.center}><FlowIcon name="bell" color={flowColors.blue} size={42} /><Text style={flowStyles.value}>You’re all caught up</Text><Text style={[flowStyles.meta, styles.emptyCopy]}>Important account and travel updates will appear here.</Text></View>}
      {state.loadMoreError ? <View style={styles.loadMoreFeedback}><Text accessibilityRole="alert" style={styles.error}>{state.loadMoreError}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry loading older notifications" onPress={() => void loadMore()}><Text style={styles.link}>Try again</Text></Pressable></View> : null}
      {state.nextCursor && !state.loadMoreError ? <Pressable accessibilityRole="button" accessibilityLabel="Load more notifications" disabled={state.loadingMore} onPress={() => void loadMore()} style={styles.loadMore}>{state.loadingMore ? <ActivityIndicator color={flowColors.blue} /> : <Text style={styles.link}>Load more</Text>}</Pressable> : null}
    </ScrollView> : null}
  </SafeAreaView>;
}
function formatTime(value: string) { const date = new Date(value); const elapsed = Date.now() - date.getTime(); if (elapsed < 60_000) return "Just now"; if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`; if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`; return date.toLocaleDateString(); }
const styles = StyleSheet.create({ header: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, borderBottomColor: flowColors.border, borderBottomWidth: 1 }, markAll: { minWidth: 92, minHeight: 44, alignItems: "center", justifyContent: "center", marginLeft: "auto" }, link: { color: flowColors.blue, fontWeight: "800" }, list: { padding: 14, gap: 10, flexGrow: 1 }, card: { minHeight: 92, flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: flowColors.border, backgroundColor: "white" }, unread: { backgroundColor: "#F3F7FF", borderColor: "#BED2FA" }, icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF4FF" }, copy: { flex: 1, gap: 4 }, title: { color: flowColors.navy, fontWeight: "600", fontSize: 16 }, unreadTitle: { fontWeight: "800" }, time: { color: flowColors.muted, fontSize: 12, marginTop: 3 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: flowColors.blue, marginTop: 7 }, center: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }, emptyCopy: { textAlign: "center" }, feedback: { padding: 14, flexDirection: "row", gap: 12 }, loadMoreFeedback: { minHeight: 48, alignItems: "center", justifyContent: "center", gap: 8 }, loadMore: { minHeight: 48, alignItems: "center", justifyContent: "center" }, error: { color: "#A4262C", flex: 1 } });
