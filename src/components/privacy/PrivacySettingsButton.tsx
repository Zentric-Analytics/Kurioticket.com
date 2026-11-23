"use client";

import { openAnalyticsSettingsEvent } from "@/lib/analyticsConsentClient";

export function PrivacySettingsButton() {
  return (
    <button
      type="button"
      className="transition-colors hover:text-[#004BB8] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
      onClick={() => window.dispatchEvent(new Event(openAnalyticsSettingsEvent))}
    >
      Privacy settings
    </button>
  );
}
