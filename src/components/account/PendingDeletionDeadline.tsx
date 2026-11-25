"use client";

import React, { useSyncExternalStore } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";

const subscribe = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimeZone = () => "UTC";

export function PendingDeletionDeadline({ deadline, dateStyle }: { deadline: string; dateStyle: "full" | "medium" }) {
  const { locale } = useLocale();
  const timeZone = useSyncExternalStore(subscribe, browserTimeZone, serverTimeZone);
  return (
    <time dateTime={deadline}>
      {new Intl.DateTimeFormat(locale, { dateStyle, timeStyle: "short", timeZone }).format(new Date(deadline))}
    </time>
  );
}
