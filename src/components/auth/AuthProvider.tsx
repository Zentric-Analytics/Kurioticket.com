"use client";

import { useCallback, useEffect, useRef } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";

const inactivityTimeoutMs = 15 * 60 * 1000;
const activityStorageKey = "kurioticket:last-authenticated-activity";
const logoutStorageKey = "kurioticket:authenticated-idle-logout";
const activityBroadcastThrottleMs = 1000;
const activityEvents = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InactivitySignOut />
      {children}
    </SessionProvider>
  );
}

function InactivitySignOut() {
  const { status } = useSession();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(0);
  const lastActivityBroadcastRef = useRef(0);
  const isSigningOutRef = useRef(false);

  const clearInactivityTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const signOutForInactivity = useCallback(async () => {
    if (isSigningOutRef.current) {
      return;
    }

    isSigningOutRef.current = true;
    clearInactivityTimer();
    writeStorageValue(logoutStorageKey, String(Date.now()));

    try {
      await signOut({ redirect: false, callbackUrl: "/" });
    } finally {
      window.location.assign("/");
    }
  }, [clearInactivityTimer]);

  const scheduleInactivityTimer = useCallback(() => {
    clearInactivityTimer();

    if (isSigningOutRef.current) {
      return;
    }

    const lastActivityAt = Math.max(
      lastActivityRef.current,
      readStorageNumber(activityStorageKey) ?? 0,
    );
    lastActivityRef.current = lastActivityAt;

    const elapsedMs = Date.now() - lastActivityAt;
    const remainingMs = inactivityTimeoutMs - elapsedMs;

    if (remainingMs <= 0) {
      void signOutForInactivity();
      return;
    }

    timeoutRef.current = setTimeout(() => {
      void signOutForInactivity();
    }, remainingMs);
  }, [clearInactivityTimer, signOutForInactivity]);

  const recordActivity = useCallback(() => {
    if (isSigningOutRef.current) {
      return;
    }

    const now = Date.now();
    lastActivityRef.current = now;

    if (now - lastActivityBroadcastRef.current >= activityBroadcastThrottleMs) {
      lastActivityBroadcastRef.current = now;
      writeStorageValue(activityStorageKey, String(now));
    }

    scheduleInactivityTimer();
  }, [scheduleInactivityTimer]);

  useEffect(() => {
    if (status !== "authenticated") {
      clearInactivityTimer();
      isSigningOutRef.current = false;
      return;
    }

    recordActivity();

    function handleStorage(event: StorageEvent) {
      if (event.key === logoutStorageKey && event.newValue) {
        void signOutForInactivity();
        return;
      }

      if (event.key !== activityStorageKey || !event.newValue) {
        return;
      }

      const lastActivityAt = Number(event.newValue);

      if (!Number.isFinite(lastActivityAt)) {
        return;
      }

      lastActivityRef.current = Math.max(
        lastActivityRef.current,
        lastActivityAt,
      );
      scheduleInactivityTimer();
    }

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, recordActivity, { passive: true });
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      clearInactivityTimer();

      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, recordActivity);
      }

      window.removeEventListener("storage", handleStorage);
    };
  }, [
    clearInactivityTimer,
    recordActivity,
    scheduleInactivityTimer,
    signOutForInactivity,
    status,
  ]);

  return null;
}

function readStorageNumber(key: string) {
  try {
    const value = window.localStorage.getItem(key);

    if (!value) {
      return null;
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage can be unavailable in private browsing or locked-down contexts.
    // The current tab's in-memory timer still enforces inactivity sign-out.
  }
}
