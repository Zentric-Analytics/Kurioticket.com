const listeners = new Set<() => void>();

export function notifyUnreadCountChanged() { listeners.forEach((listener) => listener()); }
export function subscribeUnreadCountChanged(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
