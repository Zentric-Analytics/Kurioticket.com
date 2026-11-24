"use client";

import { useEffect, useState } from "react";
import { formatViewerTimestamp } from "@/lib/adminLocalTime";

/** Render a stable UTC fallback on SSR, then the browser's local timestamp.
 * The title retains the canonical UTC instant for auditing. */
export function AdminLocalTimestamp({ value, referenceNow }: { value: string; referenceNow?: string }) {
  const [zone, setZone] = useState("UTC");
  useEffect(() => { setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"); }, []);
  return <time dateTime={value} title={new Date(value).toISOString()}>
    {formatViewerTimestamp(value, zone, referenceNow)}
  </time>;
}
