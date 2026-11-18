"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { isWebsiteOnlinePresenceRoute } from "@/lib/onlinePresence";
import { startWebsiteOnlinePresence } from "@/lib/websiteOnlinePresenceClient";

export function WebsiteOnlinePresence() {
  const pathname = usePathname();
  const { status, data: session } = useSession();
  const tracker = useRef<ReturnType<typeof startWebsiteOnlinePresence> | null>(null);
  const identity = status === "unauthenticated"
    ? "guest"
    : status === "authenticated" && session?.user?.accountSessionId
      ? `account:${session.user.accountSessionId}`
      : null;
  const allowed = isWebsiteOnlinePresenceRoute(pathname, status === "authenticated" && identity !== null);

  useEffect(() => {
    if (!allowed) return;
    const current = startWebsiteOnlinePresence(window);
    tracker.current = current;
    return () => {
      tracker.current = null;
      current.dispose();
    };
  }, [allowed]);

  useEffect(() => {
    if (allowed) tracker.current?.setIdentity(identity);
  }, [allowed, identity]);

  return null;
}
