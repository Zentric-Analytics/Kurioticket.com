"use client";

import { useEffect, useRef } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";

const inactivityTimeoutMs = 30 * 60 * 1000;
const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InactivityLogout />
      {children}
    </SessionProvider>
  );
}

function InactivityLogout() {
  const { status } = useSession();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      clearInactivityTimer(timeoutRef);
      return;
    }

    function resetTimer() {
      clearInactivityTimer(timeoutRef);
      timeoutRef.current = setTimeout(() => {
        void signOut({ callbackUrl: "/auth/signin?reason=inactive" });
      }, inactivityTimeoutMs);
    }

    resetTimer();

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }

    return () => {
      clearInactivityTimer(timeoutRef);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, resetTimer);
      }
    };
  }, [status]);

  return null;
}

function clearInactivityTimer(timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}
