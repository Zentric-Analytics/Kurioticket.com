type UnreadCountLoader = () => Promise<{ count: number }>;

export async function fetchHasUnreadNotifications(load: UnreadCountLoader) {
  try {
    const { count } = await load();
    return count > 0;
  } catch {
    // Badge lookup is passive: authentication/network errors must not disrupt results.
    return false;
  }
}
