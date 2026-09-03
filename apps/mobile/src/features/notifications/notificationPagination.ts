import type { MobileNotification } from "../../api/travelApi";

export type NotificationPaginationState = {
  items: MobileNotification[];
  nextCursor: string | null;
  contentStatus: "loading" | "success" | "error";
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
  | { type: "first-failure"; requestId: number }
  | { type: "more-start"; requestId: number }
  | { type: "more-success"; requestId: number; items: MobileNotification[]; nextCursor: string | null }
  | { type: "more-failure"; requestId: number; message: string }
  | { type: "mark-read"; id: string; readAt: string }
  | { type: "mark-all"; readAt: string }
  | { type: "delete"; id: string }
  | { type: "message"; message: string };

export const initialNotificationPaginationState: NotificationPaginationState = { items: [], nextCursor: null, contentStatus: "loading", loading: true, refreshing: false, loadingMore: false, error: "", loadMoreError: "", requestId: 0 };

export type NotificationContentState = "loading" | "error" | "empty" | "list";

export function notificationContentState(state: NotificationPaginationState): NotificationContentState {
  if (state.contentStatus === "loading") return "loading";
  if (state.contentStatus === "error") return "error";
  return state.items.length ? "list" : "empty";
}

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
    case "first-start": return { ...state, requestId: action.requestId, contentStatus: state.items.length ? "success" : "loading", loading: !action.refresh && state.items.length === 0, refreshing: action.refresh, loadingMore: false, error: "", loadMoreError: "" };
    case "first-success": return { ...state, items: mergeNotifications([], action.items), nextCursor: action.nextCursor, contentStatus: "success", loading: false, refreshing: false, error: "", loadMoreError: "" };
    case "first-failure": return state.items.length
      ? { ...state, contentStatus: "success", loading: false, refreshing: false, error: "Couldn't refresh notifications. Try again." }
      : { ...state, contentStatus: "error", loading: false, refreshing: false, error: "" };
    case "more-start": return { ...state, requestId: action.requestId, loadingMore: true, loadMoreError: "" };
    case "more-success": return { ...state, items: mergeNotifications(state.items, action.items), nextCursor: action.nextCursor, loadingMore: false, loadMoreError: "" };
    case "more-failure": return { ...state, loadingMore: false, loadMoreError: action.message };
    case "mark-read": return { ...state, items: state.items.map((item) => item.id === action.id ? { ...item, readAt: action.readAt } : item) };
    case "mark-all": return { ...state, items: state.items.map((item) => ({ ...item, readAt: item.readAt ?? action.readAt })) };
    case "delete": return { ...state, items: state.items.filter((item) => item.id !== action.id) };
    case "message": return { ...state, error: action.message };
  }
}
