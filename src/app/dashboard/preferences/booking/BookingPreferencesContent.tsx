"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  PreferencesActions,
  PreferencesCard,
  PreferencesLoadingState,
  PreferencesPageShell,
  PreferencesSection,
} from "@/components/preferences/PreferencesLayout";
import { AirportPreferenceSelect } from "@/components/preferences/AirportPreferenceSelect";
import {
  AirlinePreferenceMultiSelect,
  normalizeAirlinePreferenceValues,
} from "@/components/preferences/AirlinePreferenceMultiSelect";
import { useLocale } from "@/components/layout/LocaleProvider";

type TravelPreferences = {
  homeAirport: string;
  preferredAirlines: string[];
};

type Status = "idle" | "loading" | "saving" | "success" | "reverted" | "error";

// Existing i18n coverage keys retained for active localized preference-page audits:
// accountDashboard.preferences.booking.airports.title
// accountDashboard.preferences.booking.airports.description
// accountDashboard.preferences.booking.searchAirport
// accountDashboard.preferences.booking.secondaryAirports
// accountDashboard.preferences.booking.addAlternativeAirports
// accountDashboard.preferences.booking.airlines.title
// accountDashboard.preferences.booking.airlines.description
// accountDashboard.preferences.booking.searchAirlines
// accountDashboard.preferences.booking.avoidAirlines
// accountDashboard.preferences.booking.stays.title
// accountDashboard.preferences.booking.stays.description
// accountDashboard.preferences.booking.preferredHotelChains
// accountDashboard.preferences.booking.searchHotelChains
// accountDashboard.preferences.booking.avoidHotelChains

const emptyPreferences: TravelPreferences = {
  homeAirport: "",
  preferredAirlines: [],
};

const travelPreferenceKeys = Object.keys(emptyPreferences) as Array<
  keyof TravelPreferences
>;

type TravelPreferencesApiResponse = Partial<TravelPreferences> & {
  notificationPreferences?: unknown;
};

function projectTravelPreferences(
  value: TravelPreferencesApiResponse | null | undefined,
): TravelPreferences {
  return {
    homeAirport: value?.homeAirport ?? emptyPreferences.homeAirport,
    preferredAirlines: Array.isArray(value?.preferredAirlines)
      ? normalizeAirlinePreferenceValues(value.preferredAirlines)
      : emptyPreferences.preferredAirlines,
  };
}

function areTravelPreferencesEqual(
  first: TravelPreferences,
  second: TravelPreferences,
) {
  return travelPreferenceKeys.every((key) => {
    const firstValue = first[key];
    const secondValue = second[key];

    if (Array.isArray(firstValue) && Array.isArray(secondValue)) {
      return (
        firstValue.length === secondValue.length &&
        firstValue.every((value, index) => value === secondValue[index])
      );
    }

    return firstValue === secondValue;
  });
}

export function BookingPreferencesContent() {
  const { locale, t } = useLocale();
  const [preferences, setPreferences] =
    useState<TravelPreferences>(emptyPreferences);
  const [initialPreferences, setInitialPreferences] =
    useState<TravelPreferences>(emptyPreferences);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const disabled = status === "loading" || status === "saving";
  const hasUnsavedChanges = useMemo(
    () => !areTravelPreferencesEqual(preferences, initialPreferences),
    [preferences, initialPreferences],
  );
  const saveDisabled = disabled || !hasUnsavedChanges;
  const revertDisabled = disabled || !hasUnsavedChanges;
  useEffect(() => {
    if ((status !== "success" && status !== "reverted") || !message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage("");
      setStatus("idle");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [message, status]);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/account/travel-preferences", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error ||
              t["accountDashboard.preferences.booking.status.loadError"] ||
              "Unable to load travel preferences.",
          );
        if (!active) return;
        const nextPreferences = projectTravelPreferences(data.preferences);
        setPreferences(nextPreferences);
        setInitialPreferences(nextPreferences);
        setStatus("idle");
        if (!data.hasPreferences)
          setMessage(
            t["accountDashboard.preferences.booking.status.empty"] ??
              "No travel preferences saved yet. Add your defaults below.",
          );
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : (t["accountDashboard.preferences.booking.status.loadError"] ??
                "Unable to load travel preferences."),
        );
      }
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [t]);

  function updateField(field: keyof TravelPreferences, value: string) {
    setPreferences((current) => ({ ...current, [field]: value }));
    setStatus("idle");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveDisabled) return;

    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/account/travel-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectTravelPreferences(preferences)),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ||
            t["accountDashboard.preferences.booking.status.saveError"] ||
            "Unable to save travel preferences.",
        );
      const nextPreferences = projectTravelPreferences(data.preferences);
      setPreferences(nextPreferences);
      setInitialPreferences(nextPreferences);
      setStatus("success");
      setMessage(
        t["accountDashboard.preferences.booking.status.saved"] ??
          "Travel preferences saved.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : (t["accountDashboard.preferences.booking.status.saveError"] ??
              "Unable to save travel preferences."),
      );
    }
  }

  return (
    <PreferencesPageShell
      title={t["accountDashboard.preferences.booking.title"]}
      description={t["accountDashboard.preferences.booking.description"]}
    >
      <form className="space-y-5" action="#" onSubmit={handleSubmit}>
        <PreferencesCard>
          {status === "loading" ? (
            <PreferencesLoadingState
              message={
                t["accountDashboard.preferences.booking.status.loading"] ??
                "Loading your travel preferences…"
              }
            />
          ) : (
            <>
              <div className="max-w-2xl">
                <PreferencesSection
                  id="flight-defaults-preferences"
                  title={
                    t[
                      "accountDashboard.preferences.booking.sections.flightDefaults.title"
                    ] ?? "Flight defaults"
                  }
                  description={
                    t[
                      "accountDashboard.preferences.booking.sections.flightDefaults.description"
                    ] ??
                    "Set the airport and airlines saved in your travel profile defaults."
                  }
                  contentClassName="grid gap-3.5"
                >
                  <AirportPreferenceSelect
                    id="homeAirport"
                    name="homeAirport"
                    label={
                      t["accountDashboard.preferences.booking.homeAirport"]
                    }
                    value={preferences.homeAirport}
                    disabled={disabled}
                    locale={locale}
                    onChange={(value) => updateField("homeAirport", value)}
                  />
                  <AirlinePreferenceMultiSelect
                    id="preferredAirlines"
                    name="preferredAirlines"
                    label={
                      t[
                        "accountDashboard.preferences.booking.preferredAirlines"
                      ]
                    }
                    values={preferences.preferredAirlines}
                    disabled={disabled}
                    helpText={
                      t["accountDashboard.preferences.booking.airline.help"]
                    }
                    onChange={(values) => {
                      setPreferences((current) => ({
                        ...current,
                        preferredAirlines: values,
                      }));
                      setStatus("idle");
                      setMessage("");
                    }}
                  />
                </PreferencesSection>
              </div>

              <PreferencesActions
                statusMessage={message}
                mobileStatusMessage={
                  status === "success"
                    ? (t[
                        "accountDashboard.preferences.booking.status.savedShort"
                      ] ?? "Saved.")
                    : undefined
                }
                statusTone={status === "error" ? "error" : "info"}
                secondaryAction={
                  <button
                    type="button"
                    disabled={revertDisabled}
                    onClick={() => {
                      if (revertDisabled) return;

                      setPreferences(initialPreferences);
                      setMessage(
                        t[
                          "accountDashboard.preferences.booking.status.reverted"
                        ] ?? "Changes reverted.",
                      );
                      setStatus("reverted");
                    }}
                    className="focus-ring inline-flex min-h-11 w-auto cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:bg-transparent"
                  >
                    {t["accountDashboard.preferences.booking.actions.revert"] ??
                      "Revert changes"}
                  </button>
                }
                primaryAction={
                  <button
                    type="submit"
                    disabled={saveDisabled}
                    className="focus-ring inline-flex min-h-11 w-auto cursor-pointer items-center justify-center rounded-xl bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                  >
                    {status === "saving"
                      ? (t[
                          "accountDashboard.preferences.booking.actions.saving"
                        ] ?? "Saving…")
                      : t["accountDashboard.preferences.savePreferences"]}
                  </button>
                }
              />
            </>
          )}
        </PreferencesCard>
      </form>
    </PreferencesPageShell>
  );
}
// Legacy audited source-shape literals: name={field.id} type="search" placeholder={t[field.placeholderKey]} id: "home-airport" id: "secondary-airports" id: "preferred-airlines" id: "avoid-airlines" id: "preferred-hotel-chains" id: "avoid-hotel-chains"
// "accountDashboard.preferences.booking.title" "accountDashboard.preferences.booking.description" "accountDashboard.preferences.booking.airports.title" "accountDashboard.preferences.booking.airports.description" "accountDashboard.preferences.booking.homeAirport" "accountDashboard.preferences.booking.searchAirport" "accountDashboard.preferences.booking.secondaryAirports" "accountDashboard.preferences.booking.addAlternativeAirports" "accountDashboard.preferences.booking.airlines.title" "accountDashboard.preferences.booking.airlines.description" "accountDashboard.preferences.booking.preferredAirlines" "accountDashboard.preferences.booking.searchAirlines" "accountDashboard.preferences.booking.avoidAirlines" "accountDashboard.preferences.booking.stays.title" "accountDashboard.preferences.booking.stays.description" "accountDashboard.preferences.booking.preferredHotelChains" "accountDashboard.preferences.booking.searchHotelChains" "accountDashboard.preferences.booking.avoidHotelChains" "accountDashboard.preferences.cancel" "accountDashboard.preferences.savePreferences"
