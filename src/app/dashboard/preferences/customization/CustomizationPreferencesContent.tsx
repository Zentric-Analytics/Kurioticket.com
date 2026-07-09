"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PreferencesActions,
  PreferencesCard,
  PreferencesPageShell,
  PreferencesSection,
} from "@/components/preferences/PreferencesLayout";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import {
  getCanonicalDisplayLocale,
  getCountryDisplayNameForLocale,
} from "@/lib/region/countryDisplayNames";

type BooleanPreferenceKey =
  | "rememberChoices"
  | "personalizeRecommendations"
  | "showHelpfulTips";
type Status = "idle" | "saving" | "success" | "error";

type PersonalizationPreferences = Record<BooleanPreferenceKey, boolean>;

type CustomizationPreferencesDraft = PersonalizationPreferences & {
  locale: string;
  currency: string;
  region: string;
};

const defaultPersonalizationPreferences: PersonalizationPreferences = {
  rememberChoices: true,
  personalizeRecommendations: true,
  showHelpfulTips: true,
};

const DEFAULT_LOCALE = "en-us";
const DEFAULT_CURRENCY = "USD";
const DEFAULT_REGION = "US";

const defaultCustomizationPreferences: CustomizationPreferencesDraft = {
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
  region: DEFAULT_REGION,
  ...defaultPersonalizationPreferences,
};

const personalizationOptions: BooleanPreferenceKey[] = [
  "rememberChoices",
  "personalizeRecommendations",
  "showHelpfulTips",
];

function PreferenceSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="focus-ring inline-flex min-h-8 shrink-0 items-center rounded-full p-1 transition"
    >
      <span
        aria-hidden="true"
        className={
          checked
            ? "relative inline-flex h-7 w-12 items-center rounded-full bg-[#004BB8] shadow-sm transition"
            : "relative inline-flex h-7 w-12 items-center rounded-full bg-slate-300 shadow-sm transition"
        }
      >
        <span
          className={
            checked
              ? "inline-block h-5 w-5 translate-x-6 rounded-full bg-slate-50 shadow-sm transition"
              : "inline-block h-5 w-5 translate-x-1 rounded-full bg-slate-50 shadow-sm transition"
          }
        />
      </span>
    </button>
  );
}

export function CustomizationPreferencesContent() {
  const { locale, setLocale, t, locales } = useLocale();
  const {
    mode,
    setMode,
    selectedCurrency,
    setCurrency,
    options: regionOptions,
    currencies,
  } = useRegion();
  const [draftPreferences, setDraftPreferences] =
    useState<CustomizationPreferencesDraft>(() => ({
      locale,
      currency: selectedCurrency,
      region: mode,
      ...defaultPersonalizationPreferences,
    }));
  const hasUserEditedDraftRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (status !== "success" || !statusMessage) return;

    const timeoutId = window.setTimeout(() => {
      setStatus("idle");
      setStatusMessage("");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [status, statusMessage]);

  useEffect(() => {
    let isActive = true;

    const loadPreferences = async () => {
      try {
        const response = await fetch("/api/account/customization-preferences", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (response.status === 401) return;

        if (!response.ok) {
          throw new Error("Unable to load customization preferences.");
        }

        const data = (await response.json()) as {
          hasPreferences?: boolean;
          preferences?: Partial<CustomizationPreferencesDraft>;
        };

        if (
          !isActive ||
          !data.hasPreferences ||
          !data.preferences ||
          hasUserEditedDraftRef.current
        )
          return;

        setDraftPreferences((current) => ({
          ...current,
          ...data.preferences,
        }));
      } catch {
        if (!isActive) return;

        setStatus("error");
        setStatusMessage(
          t["accountDashboard.preferences.customization.status.loadError"],
        );
      }
    };

    void loadPreferences();

    return () => {
      isActive = false;
    };
  }, [t]);

  const showStatusMessage = (nextStatus: Status, messageKey: string) => {
    setStatus(nextStatus);
    setStatusMessage(t[messageKey]);
  };

  const handleLanguageChange = (nextLocale: string) => {
    hasUserEditedDraftRef.current = true;
    setDraftPreferences((current) => ({ ...current, locale: nextLocale }));
    setStatus("idle");
    setStatusMessage("");
  };

  const handleCurrencyChange = (nextCurrency: string) => {
    hasUserEditedDraftRef.current = true;
    setDraftPreferences((current) => ({ ...current, currency: nextCurrency }));
    setStatus("idle");
    setStatusMessage("");
  };

  const handleRegionChange = (nextRegion: string) => {
    hasUserEditedDraftRef.current = true;
    setDraftPreferences((current) => ({ ...current, region: nextRegion }));
    setStatus("idle");
    setStatusMessage("");
  };

  const updatePersonalizationPreference = (
    key: BooleanPreferenceKey,
    value: boolean,
  ) => {
    hasUserEditedDraftRef.current = true;
    setDraftPreferences((current) => ({ ...current, [key]: value }));
    setStatus("idle");
    setStatusMessage("");
  };

  const resetToDefault = () => {
    hasUserEditedDraftRef.current = true;
    setDraftPreferences(defaultCustomizationPreferences);
    setStatus("idle");
    setStatusMessage("");
  };

  const applyDraftToDevice = (preferences: CustomizationPreferencesDraft) => {
    const didChangeLanguage = preferences.locale !== locale;

    if (didChangeLanguage) {
      setLocale(preferences.locale);
    }

    if (preferences.currency !== selectedCurrency) {
      setCurrency(preferences.currency);
    }

    if (preferences.region !== mode) {
      setMode(preferences.region);
    }

    if (didChangeLanguage) {
      window.setTimeout(() => {
        window.location.reload();
      }, 220);
    }
  };

  const savePreferences = async () => {
    setStatus("saving");
    setStatusMessage(
      t["accountDashboard.preferences.customization.status.saving"],
    );

    try {
      const response = await fetch("/api/account/customization-preferences", {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draftPreferences),
      });

      if (response.status === 401) {
        applyDraftToDevice(draftPreferences);
        showStatusMessage(
          "success",
          "accountDashboard.preferences.customization.status.updatedOnDeviceSignedOut",
        );
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to save customization preferences.");
      }

      const data = (await response.json()) as {
        preferences?: CustomizationPreferencesDraft;
      };
      const savedPreferences = data.preferences ?? draftPreferences;

      setDraftPreferences(savedPreferences);
      applyDraftToDevice(savedPreferences);
      showStatusMessage(
        "success",
        "accountDashboard.preferences.customization.status.saved",
      );
    } catch {
      showStatusMessage(
        "error",
        "accountDashboard.preferences.customization.status.saveError",
      );
    }
  };

  const availableLocales = locales.filter(
    (option) => option.status === "available",
  );
  const displayLocale = getCanonicalDisplayLocale(locale);
  const currencyDisplayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([displayLocale], { type: "currency" });
    } catch {
      return null;
    }
  }, [displayLocale]);

  return (
    <PreferencesPageShell
      title={t["accountDashboard.preferences.customization.title"]}
      description={t["accountDashboard.preferences.customization.subtitle"]}
    >
      <div className="space-y-5">
        <PreferencesCard>
          <PreferencesSection
            title={
              t[
                "accountDashboard.preferences.customization.sections.regionalDefaults"
              ]
            }
            contentClassName="grid gap-4"
          >
            <label className="block">
              <span className="text-sm font-semibold leading-5 text-slate-950">
                {
                  t[
                    "accountDashboard.preferences.customization.fields.language.label"
                  ]
                }
              </span>
              <select
                value={draftPreferences.locale}
                onChange={(event) => handleLanguageChange(event.target.value)}
                className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
              >
                {availableLocales.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.nativeLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold leading-5 text-slate-950">
                {
                  t[
                    "accountDashboard.preferences.customization.fields.currency.label"
                  ]
                }
              </span>
              <select
                value={draftPreferences.currency}
                onChange={(event) => handleCurrencyChange(event.target.value)}
                className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
              >
                {currencies.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} ·{" "}
                    {currencyDisplayNames?.of(option.code) ?? option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold leading-5 text-slate-950">
                {
                  t[
                    "accountDashboard.preferences.customization.fields.region.label"
                  ]
                }
              </span>
              <select
                value={draftPreferences.region}
                onChange={(event) => handleRegionChange(event.target.value)}
                className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
              >
                {regionOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {getCountryDisplayNameForLocale(
                      option.code,
                      locale,
                      option.country,
                    )}{" "}
                    · {option.currency}
                  </option>
                ))}
              </select>
            </label>
          </PreferencesSection>

          <PreferencesSection
            title={
              t[
                "accountDashboard.preferences.customization.sections.personalization"
              ]
            }
            bordered
            contentClassName="divide-y divide-slate-200"
          >
            {personalizationOptions.map((option) => (
              <div
                key={option}
                className="flex items-start justify-between gap-4 py-4 sm:items-center sm:gap-6"
              >
                <div className="min-w-0 flex-1 sm:flex-initial">
                  <p className="text-sm font-semibold leading-5 text-slate-950">
                    {
                      t[
                        `accountDashboard.preferences.customization.fields.${option}.label`
                      ]
                    }
                  </p>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                    {
                      t[
                        `accountDashboard.preferences.customization.fields.${option}.description`
                      ]
                    }
                  </p>
                </div>
                <div className="shrink-0 pt-1 sm:pt-0">
                  <PreferenceSwitch
                    checked={draftPreferences[option]}
                    label={
                      t[
                        `accountDashboard.preferences.customization.fields.${option}.label`
                      ]
                    }
                    onChange={() =>
                      updatePersonalizationPreference(
                        option,
                        !draftPreferences[option],
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </PreferencesSection>
          <PreferencesActions
            statusMessage={statusMessage}
            mobileStatusMessage={
              status === "saving"
                ? t[
                    "accountDashboard.preferences.customization.status.savingShort"
                  ]
                : status === "success"
                  ? t[
                      "accountDashboard.preferences.customization.status.savedShort"
                    ]
                  : undefined
            }
            statusTone={status === "error" ? "error" : "info"}
            secondaryAction={
              <button
                type="button"
                onClick={resetToDefault}
                className="focus-ring inline-flex min-h-11 w-auto items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex-none sm:bg-transparent"
              >
                {t["accountDashboard.preferences.customization.actions.reset"]}
              </button>
            }
            primaryAction={
              <button
                type="button"
                onClick={savePreferences}
                disabled={status === "saving"}
                className="focus-ring inline-flex min-h-11 w-auto items-center justify-center rounded-xl bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              >
                {status === "saving"
                  ? t[
                      "accountDashboard.preferences.customization.actions.saving"
                    ]
                  : t[
                      "accountDashboard.preferences.customization.actions.save"
                    ]}
              </button>
            }
          />
        </PreferencesCard>
      </div>
    </PreferencesPageShell>
  );
}

// i18n coverage keys used through computed row lookups:
// accountDashboard.preferences.customization.fields.rememberChoices.label
// accountDashboard.preferences.customization.fields.personalizeRecommendations.label
// accountDashboard.preferences.customization.fields.showHelpfulTips.label
// accountDashboard.preferences.customization.fields.rememberChoices.description
// accountDashboard.preferences.customization.fields.personalizeRecommendations.description
// accountDashboard.preferences.customization.fields.showHelpfulTips.description
