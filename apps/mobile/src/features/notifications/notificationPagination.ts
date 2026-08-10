import type { MobileNotification } from "../../api/travelApi";

export type NotificationPaginationState = {
  items: MobileNotification[];
  nextCursor: string | null;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string;
  loadMoreError: string;
  requestId: number;
};

export type NotificationPaginationAction =
  | { type: "first-start"; requestId: number; refresh: boolean }
  | { type: "first-success"; requestId: number; items: MobileNotification[]; nextCursor: string | null }
  | { type: "first-failure"; requestId: number; message: string }
  | { type: "more-start"; requestId: number }
  | { type: "more-success"; requestId: number; items: MobileNotification[]; nextCursor: string | null }
  | { type: "more-failure"; requestId: number; message: string }
  | { type: "mark-read"; id: string; readAt: string }
  | { type: "mark-all"; readAt: string }
  | { type: "message"; message: string };

export const initialNotificationPaginationState: NotificationPaginationState = { items: [], nextCursor: null, loading: true, refreshing: false, loadingMore: false, error: "", loadMoreError: "", requestId: 0 };

export function mergeNotifications(current: MobileNotification[], incoming: MobileNotification[]) {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) merged.set(item.id, item);
  return [...merged.values()];
}

export function canLoadMore(state: NotificationPaginationState) {
  return Boolean(state.nextCursor) && !state.loading && !state.refreshing && !state.loadingMore;
}

export function notificationPaginationReducer(state: NotificationPaginationState, action: NotificationPaginationAction): NotificationPaginationState {
  if ("requestId" in action && action.type !== "first-start" && action.type !== "more-start" && action.requestId !== state.requestId) return state;
  switch (action.type) {
    case "first-start": return { ...state, requestId: action.requestId, loading: !action.refresh && state.items.length === 0, refreshing: action.refresh, loadingMore: false, error: "", loadMoreError: "" };
    case "first-success": return { ...state, items: mergeNotifications([], action.items), nextCursor: action.nextCursor, loading: false, refreshing: false, error: "", loadMoreError: "" };
    case "first-failure": return { ...state, loading: false, refreshing: false, error: action.message };
    case "more-start": return { ...state, requestId: action.requestId, loadingMore: true, loadMoreError: "" };
    case "more-success": return { ...state, items: mergeNotifications(state.items, action.items), nextCursor: action.nextCursor, loadingMore: false, loadMoreError: "" };
    case "more-failure": return { ...state, loadingMore: false, loadMoreError: action.message };
    case "mark-read": return { ...state, items: state.items.map((item) => item.id === action.id ? { ...item, readAt: action.readAt } : item) };
    case "mark-all": return { ...state, items: state.items.map((item) => ({ ...item, readAt: item.readAt ?? action.readAt })) };
    case "message": return { ...state, error: action.message };
  }
}
