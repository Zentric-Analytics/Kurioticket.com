"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";

type LocalizedLoadingLabelProps = {
  labelKey: string;
  className?: string;
};

export function LocalizedLoadingLabel({
  labelKey,
  className,
}: LocalizedLoadingLabelProps) {
  const { t: dictionary } = useLocale();

  return (
    <span className={className}>
      {dictionary[labelKey] ?? enTranslations[labelKey] ?? ""}
    </span>
  );
}
