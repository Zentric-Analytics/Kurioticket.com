"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { useLocale } from "@/components/layout/LocaleProvider";

export function AccountPreferencesHeader() {
  const { t } = useLocale();

  return <AppHeader showAccountBackLink accountBackLabel={t["accountDashboard.hub.title"]} />;
}
