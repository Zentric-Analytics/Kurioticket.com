import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { travelApi } from "../../api/travelApi";
import { fetchHasUnreadNotifications } from "./notificationUnreadModel";

export function useUnreadNotifications(enabled = true) {
  const [hasUnread, setHasUnread] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        setHasUnread(false);
        return;
      }
      let active = true;
      setHasUnread(false);
      void fetchHasUnreadNotifications(travelApi.notificationUnreadCount).then((value) => {
        if (active) setHasUnread(value);
      });
      return () => {
        active = false;
      };
    }, [enabled]),
  );

  return hasUnread;
}
