"use client";

import { useSyncExternalStore } from "react";
import { formatViewerTimestamp } from "@/lib/adminLocalTime";

/** Render a stable UTC fallback on SSR, then the browser's local timestamp.
 * The title retains the canonical UTC instant for auditing. */
const subscribe=()=>()=>{};
const localZone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";
const serverZone=()=>"UTC";
export function AdminLocalTimestamp({ value, referenceNow }: { value: string; referenceNow?: string }) {
  const zone=useSyncExternalStore(subscribe,localZone,serverZone);
  return <time dateTime={value} title={new Date(value).toISOString()}>
    {formatViewerTimestamp(value, zone, referenceNow)}
  </time>;
}
