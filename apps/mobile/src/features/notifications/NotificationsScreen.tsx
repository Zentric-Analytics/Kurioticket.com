import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Animated, PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { travelApi, TravelApiError, type MobileNotification } from "../../api/travelApi";
import { readSession } from "../../storage/sessionStorage";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors, flowStyles } from "../flow/flowStyles";
import { canLoadMore, initialNotificationPaginationState, notificationContentState, notificationPaginationReducer } from "./notificationPagination";
import { useAppTheme } from "../../theme/AppTheme";
import { signInHref } from "../auth/signInIntent";
import { notificationDestination } from "./notificationAction";
import { notifyUnreadCountChanged } from "./notificationUnreadRefresh";
import { PageContentState } from "../../components/PageContentState";
import { notificationSwipeDirection, notificationSwipePosition, NOTIFICATION_DELETE_ACTION_WIDTH, type NotificationSwipeDirection, shouldRevealNotificationDelete } from "./notificationSwipe";

export function NotificationsScreen() {
  const { theme } = useAppTheme();
  const [state, dispatch] = useReducer(notificationPaginationReducer, initialNotificationPaginationState);
  const [pendingAll, setPendingAll] = useState(false);
  const [openNotificationId, setOpenNotificationId] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const horizontalSwipeId = useRef<string | null>(null);
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
      if ((cause instanceof TravelApiError && cause.status === 401) || !await readSession().catch(() => null)) { router.replace(signInHref("/notifications")); return; }
      dispatch({ type: "first-failure", requestId });
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
    } catch {
      dispatch({ type: "more-failure", requestId, message: "Couldn't load older notifications. Try again." });
    } finally {
      if (requestSequence.current === requestId) loadingMoreRef.current = false;
    }
  }, [state]);

  const open = async (item: MobileNotification) => {
    if (!item.readAt) {
      try {
        const result = await travelApi.markNotificationRead(item.id);
        dispatch({ type: "mark-read", id: item.id, readAt: result.notification.readAt ?? new Date().toISOString() });
        notifyUnreadCountChanged();
      } catch {
        dispatch({ type: "message", message: "Unable to mark notification as read." });
        return;
      }
    }
    const destination = notificationDestination(item);
    if (destination) router.push(destination);
  };
  const markAll = async () => {
    if (pendingAll) return;
    setPendingAll(true);
    try { await travelApi.markAllNotificationsRead(); dispatch({ type: "mark-all", readAt: new Date().toISOString() }); notifyUnreadCountChanged(); }
    catch { dispatch({ type: "message", message: "Unable to mark all notifications as read." }); }
    finally { setPendingAll(false); }
  };
  const remove = async (item: MobileNotification) => {
    try {
      await travelApi.deleteNotification(item.id);
      dispatch({ type: "delete", id: item.id });
      if (!item.readAt) notifyUnreadCountChanged();
    } catch {
      dispatch({ type: "message", message: "Unable to delete notification." });
      throw new Error("delete_failed");
    }
  };
  const unread = state.items.some((item) => !item.readAt);
  const contentState = notificationContentState(state);
  const lockHorizontalSwipe = useCallback((id: string) => {
    horizontalSwipeId.current = id;
    setScrollEnabled(false);
  }, []);
  const releaseHorizontalSwipe = useCallback((id: string) => {
    if (horizontalSwipeId.current !== id) return;
    horizontalSwipeId.current = null;
    setScrollEnabled(true);
  }, []);

  return <SafeAreaView style={[flowStyles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
    <View style={[styles.header, { borderBottomColor: theme.border }]}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" color={theme.icon} /></Pressable><Text accessibilityRole="header" style={[flowStyles.title, { color: theme.text }]}>Notifications</Text>{unread ? <Pressable accessibilityRole="button" accessibilityLabel="Mark all notifications as read" disabled={pendingAll} onPress={() => void markAll()} style={styles.markAll}><Text style={styles.link}>Mark all read</Text></Pressable> : <View style={styles.markAll} />}</View>
    {contentState === "loading" ? <PageContentState state="loading" pageName="notifications" /> : null}
    {contentState === "error" ? <PageContentState state="error" pageName="notifications" onRetry={() => void loadFirstPage()} /> : null}
    {contentState === "empty" ? <ScrollView alwaysBounceVertical={false} bounces={false} overScrollMode="never" refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void loadFirstPage(true)} />} contentContainerStyle={styles.list}><View style={styles.center}><FlowIcon name="bell" color={flowColors.blue} size={42} /><Text style={flowStyles.value}>You’re all caught up</Text><Text style={[flowStyles.meta, styles.emptyCopy]}>Important account and travel updates will appear here.</Text></View></ScrollView> : null}
    {contentState === "list" ? <ScrollView scrollEnabled={scrollEnabled} alwaysBounceVertical={false} bounces={false} overScrollMode="never" onScrollBeginDrag={() => setOpenNotificationId(null)} refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void loadFirstPage(true)} />} contentContainerStyle={styles.list}>
      {state.error ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>{state.error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry refreshing notifications" onPress={() => void loadFirstPage(true)}><Text style={styles.link}>Try again</Text></Pressable></View> : null}
      {state.items.map((item) => <SwipeableNotificationRow key={item.id} item={item} dark={theme.dark} surface={theme.surface} border={theme.border} text={theme.text} isOpen={openNotificationId === item.id} onHorizontalLock={() => lockHorizontalSwipe(item.id)} onHorizontalRelease={() => releaseHorizontalSwipe(item.id)} onSwipeStart={() => { if (openNotificationId !== item.id) setOpenNotificationId(null); }} onSetOpen={(open) => setOpenNotificationId(open ? item.id : null)} onOpen={open} onDelete={remove} />)}
      {state.loadMoreError ? <View style={styles.loadMoreFeedback}><Text accessibilityRole="alert" style={styles.error}>{state.loadMoreError}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry loading older notifications" onPress={() => void loadMore()}><Text style={styles.link}>Try again</Text></Pressable></View> : null}
      {state.nextCursor && !state.loadMoreError ? <Pressable accessibilityRole="button" accessibilityLabel="Load more notifications" disabled={state.loadingMore} onPress={() => void loadMore()} style={styles.loadMore}>{state.loadingMore ? <ActivityIndicator color={flowColors.blue} /> : <Text style={styles.link}>Load more</Text>}</Pressable> : null}
    </ScrollView> : null}
  </SafeAreaView>;
}
function SwipeableNotificationRow({ item, dark, surface, border, text, isOpen, onHorizontalLock, onHorizontalRelease, onSwipeStart, onSetOpen, onOpen, onDelete }: { item: MobileNotification; dark: boolean; surface: string; border: string; text: string; isOpen: boolean; onHorizontalLock: () => void; onHorizontalRelease: () => void; onSwipeStart: () => void; onSetOpen: (open: boolean) => void; onOpen: (item: MobileNotification) => Promise<void>; onDelete: (item: MobileNotification) => Promise<void> }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const position = useRef(0);
  const gestureStart = useRef(0);
  const gestureDirection = useRef<NotificationSwipeDirection>("undecided");
  const onHorizontalLockRef = useRef(onHorizontalLock);
  const onHorizontalReleaseRef = useRef(onHorizontalRelease);
  const onSwipeStartRef = useRef(onSwipeStart);
  const onSetOpenRef = useRef(onSetOpen);
  onSwipeStartRef.current = onSwipeStart;
  onSetOpenRef.current = onSetOpen;
  onHorizontalLockRef.current = onHorizontalLock;
  onHorizontalReleaseRef.current = onHorizontalRelease;
  const [deleting, setDeleting] = useState(false);
  const settle = useCallback((open: boolean) => Animated.spring(translateX, { toValue: open ? -NOTIFICATION_DELETE_ACTION_WIDTH : 0, useNativeDriver: true, bounciness: 0 }).start(), [translateX]);
  useEffect(() => {
    const listener = translateX.addListener(({ value }) => { position.current = value; });
    return () => translateX.removeListener(listener);
  }, [translateX]);
  useEffect(() => { settle(isOpen); }, [isOpen, settle]);
  useEffect(() => () => onHorizontalReleaseRef.current(), []);
  const shouldCaptureSwipe = useCallback((dx: number, dy: number) => {
    const nextDirection = notificationSwipeDirection(gestureDirection.current, dx, dy, position.current);
    if (nextDirection !== gestureDirection.current) {
      gestureDirection.current = nextDirection;
      if (nextDirection === "horizontal") onHorizontalLockRef.current();
    }
    return nextDirection === "horizontal";
  }, []);
  const finishHorizontalSwipe = useCallback(() => {
    gestureDirection.current = "undecided";
    onHorizontalReleaseRef.current();
  }, []);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => {
      if (gestureDirection.current !== "horizontal") gestureDirection.current = "undecided";
      return false;
    },
    onMoveShouldSetPanResponderCapture: (_, gesture) => shouldCaptureSwipe(gesture.dx, gesture.dy),
    onMoveShouldSetPanResponder: (_, gesture) => shouldCaptureSwipe(gesture.dx, gesture.dy),
    onPanResponderGrant: () => {
      gestureDirection.current = "horizontal";
      onHorizontalLockRef.current();
      gestureStart.current = position.current;
      translateX.stopAnimation((value) => { position.current = value; gestureStart.current = value; });
      onSwipeStartRef.current();
    },
    onPanResponderMove: (_, gesture) => {
      if (gestureDirection.current === "horizontal") translateX.setValue(notificationSwipePosition(gestureStart.current, gesture.dx));
    },
    onPanResponderRelease: (_, gesture) => {
      const open = shouldRevealNotificationDelete(notificationSwipePosition(gestureStart.current, gesture.dx));
      finishHorizontalSwipe();
      onSetOpenRef.current(open);
      settle(open);
    },
    onPanResponderTerminationRequest: () => gestureDirection.current !== "horizontal",
    onPanResponderReject: finishHorizontalSwipe,
    onPanResponderTerminate: () => { finishHorizontalSwipe(); onSetOpenRef.current(false); settle(false); },
  }), [finishHorizontalSwipe, settle, shouldCaptureSwipe, translateX]);
  const deleteItem = async () => {
    if (deleting) return;
    setDeleting(true);
    try { await onDelete(item); onHorizontalReleaseRef.current(); onSetOpen(false); }
    catch { onHorizontalReleaseRef.current(); onSetOpen(false); settle(false); setDeleting(false); }
  };
  return <View style={styles.swipeRow}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`} disabled={deleting} onPress={() => void deleteItem()} style={styles.deleteAction}>
      {deleting ? <ActivityIndicator color="white" /> : <><FlowIcon name="trash" color="white" size={21} /><Text style={styles.deleteLabel}>Delete</Text></>}
    </Pressable>
    <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.readAt ? "Read" : "Unread"} ${item.title}. ${item.body}`} onPress={() => void onOpen(item)} style={[styles.card, { backgroundColor: surface, borderColor: border }, !item.readAt && { backgroundColor: dark ? "#142A45" : "#F3F7FF", borderColor: dark ? "#395D91" : "#BED2FA" }]}><View style={styles.icon}><FlowIcon name="bell" color={item.readAt ? flowColors.muted : flowColors.blue} size={20} /></View><View style={styles.copy}><Text style={[styles.title, { color: text }, !item.readAt && styles.unreadTitle]}>{item.title}</Text><Text style={flowStyles.meta}>{item.body}</Text><Text style={styles.time}>{formatTime(item.createdAt)}</Text></View>{!item.readAt ? <View accessibilityLabel="Unread" style={styles.dot} /> : null}</Pressable>
    </Animated.View>
  </View>;
}
function formatTime(value: string) { const date = new Date(value); const elapsed = Date.now() - date.getTime(); if (elapsed < 60_000) return "Just now"; if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`; if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`; return date.toLocaleDateString(); }
const styles = StyleSheet.create({ header: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, borderBottomColor: flowColors.border, borderBottomWidth: 1 }, markAll: { minWidth: 92, minHeight: 44, alignItems: "center", justifyContent: "center", marginLeft: "auto" }, link: { color: flowColors.blue, fontWeight: "800" }, retryButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }, list: { padding: 14, gap: 10, flexGrow: 1 }, swipeRow: { borderRadius: 14, overflow: "hidden", backgroundColor: "#C62828" }, deleteAction: { position: "absolute", right: 0, top: 0, bottom: 0, width: NOTIFICATION_DELETE_ACTION_WIDTH, alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#C62828" }, deleteLabel: { color: "white", fontSize: 12, fontWeight: "800" }, card: { minHeight: 92, flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: flowColors.border, backgroundColor: "white" }, unread: { backgroundColor: "#F3F7FF", borderColor: "#BED2FA" }, icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF4FF" }, copy: { flex: 1, gap: 4 }, title: { color: flowColors.navy, fontWeight: "600", fontSize: 16 }, unreadTitle: { fontWeight: "800" }, time: { color: flowColors.muted, fontSize: 12, marginTop: 3 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: flowColors.blue, marginTop: 7 }, center: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }, emptyCopy: { textAlign: "center" }, feedback: { padding: 14, flexDirection: "row", gap: 12 }, loadMoreFeedback: { minHeight: 48, alignItems: "center", justifyContent: "center", gap: 8 }, loadMore: { minHeight: 48, alignItems: "center", justifyContent: "center" }, error: { color: "#A4262C", flex: 1 } });