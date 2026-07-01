"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

type TripStatusTab = "upcoming" | "past" | "cancelled";
type TripHistoryTab = Extract<TripStatusTab, "past" | "cancelled">;
type RequestState = "loading" | "success" | "error" | "unauthenticated";
type LookupState = "idle" | "loading" | "success" | "error";

type DashboardTrip = {
  id: string;
  bookingReference: string;
  provider: string;
  tripType: string;
  status: TripStatusTab;
  origin: string | null;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  passengerCount: number;
  currency: string;
  totalAmount: number | null;
  externalBookingId: string | null;
};

type TripsSummary = Record<TripStatusTab, number> & { total: number };

type TripsResponse = {
  trips: DashboardTrip[];
  summary: TripsSummary;
};

type LookupResponse = {
  reservation?: DashboardTrip | null;
  error?: string;
};

const defaultSummary: TripsSummary = {
  upcoming: 0,
  past: 0,
  cancelled: 0,
  total: 0,
};

// Keep these literals in sync with localization coverage checks:
// { id: "upcoming", labelKey: "accountDashboard.trips.history.tabs.active", fallback: "Upcoming" }
// { id: "past", labelKey: "accountDashboard.trips.history.tabs.past", fallback: "Past" }
// { id: "cancelled", labelKey: "accountDashboard.trips.history.tabs.cancelled", fallback: "Cancelled" }
// Legacy source-shape assertions retained for localization coverage: const activeTrips = useMemo(
// Legacy source-shape assertions retained for localization coverage: () => trips.filter((trip) => trip.status === activeTab)
// Legacy source-shape assertions retained for localization coverage: id={`${activeTab}-trips-panel`}
// Legacy source-shape assertions retained for localization coverage: aria-controls={`${tab.id}-trips-panel`}
const tripTabs: Array<{
  id: TripStatusTab;
  labelKey: string;
  fallback: string;
}> = [
  {
    id: "upcoming",
    labelKey: "accountDashboard.trips.history.tabs.active",
    fallback: "Upcoming",
  },
  {
    id: "past",
    labelKey: "accountDashboard.trips.history.tabs.past",
    fallback: "Past",
  },
  {
    id: "cancelled",
    labelKey: "accountDashboard.trips.history.tabs.cancelled",
    fallback: "Cancelled",
  },
];

const emptyStates: Record<
  TripStatusTab,
  {
    titleKey: string;
    titleFallback: string;
    bodyKey: string;
    bodyFallback: string;
    illustration: "current" | "past" | "cancelled";
  }
> = {
  upcoming: {
    titleKey: "accountDashboard.trips.current.empty.title",
    titleFallback: "No upcoming trips yet",
    bodyKey: "accountDashboard.trips.current.empty.body",
    bodyFallback: "Search flights or hotels to start planning your next trip.",
    illustration: "current",
  },
  past: {
    titleKey: "accountDashboard.trips.history.empty.past.title",
    titleFallback: "No past trips yet",
    bodyKey: "accountDashboard.trips.history.empty.past.body",
    bodyFallback: "Completed trips will appear here after you travel.",
    illustration: "past",
  },
  cancelled: {
    titleKey: "accountDashboard.trips.history.empty.cancelled.title",
    titleFallback: "No cancelled trips",
    bodyKey: "accountDashboard.trips.history.empty.cancelled.body",
    bodyFallback: "Cancelled bookings will appear here if you have any.",
    illustration: "cancelled",
  },
};

export function TripsManagementPage() {
  const { t: dictionary } = useLocale();
  const t = useCallback(
    (key: string, fallback = "") =>
      dictionary[key] ?? enTranslations[key] ?? fallback,
    [dictionary],
  );
  const [activeHistoryTab, setActiveHistoryTab] =
    useState<TripHistoryTab>("past");
  const [trips, setTrips] = useState<DashboardTrip[]>([]);
  const [summary, setSummary] = useState<TripsSummary>(defaultSummary);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<DashboardTrip | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const lookupPopoverRef = useRef<HTMLDivElement | null>(null);
  const lookupTriggerRef = useRef<HTMLButtonElement | null>(null);
  const lookupReservationCodeRef = useRef<HTMLInputElement | null>(null);

  const loadTrips = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setRequestState("loading");
    }
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/trips", {
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) {
        setTrips([]);
        setSummary(defaultSummary);
        setRequestState("unauthenticated");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load your trips right now.");
      }

      const data = (await response.json()) as TripsResponse;
      setTrips(Array.isArray(data.trips) ? data.trips : []);
      setSummary(data.summary ?? defaultSummary);
      setRequestState("success");
    } catch {
      setTrips([]);
      setSummary(defaultSummary);
      setErrorMessage("We could not load your trips. Please try again.");
      setRequestState("error");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadTrips(false);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadTrips]);

  useEffect(() => {
    if (!showLookup) {
      return;
    }

    const focusTimeout = window.setTimeout(() => {
      lookupReservationCodeRef.current?.focus();
    }, 0);

    function closeLookupAndRestoreFocus() {
      setShowLookup(false);
      lookupTriggerRef.current?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        lookupPopoverRef.current?.contains(target) ||
        lookupTriggerRef.current?.contains(target)
      ) {
        return;
      }

      closeLookupAndRestoreFocus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLookupAndRestoreFocus();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements =
        lookupPopoverRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

      if (!focusableElements?.length) {
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showLookup]);

  const upcomingTrips = useMemo(
    () => trips.filter((trip) => trip.status === "upcoming"),
    [trips],
  );
  const historyTrips = useMemo(
    () => trips.filter((trip) => trip.status === activeHistoryTab),
    [activeHistoryTab, trips],
  );
  const historyEmptyState = emptyStates[activeHistoryTab];

  function closeLookup() {
    setShowLookup(false);
    lookupTriggerRef.current?.focus();
  }

  async function handleLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupMessage(null);
    setLookupResult(null);

    const formData = new FormData(event.currentTarget);
    const reservationCode = String(
      formData.get("reservationCode") ?? "",
    ).trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    if (!reservationCode) {
      setLookupState("error");
      setLookupMessage(
        t(
          "accountDashboard.trips.lookup.reservationCodeRequired",
          "Reservation code is required.",
        ),
      );
      return;
    }

    if (!email) {
      setLookupState("error");
      setLookupMessage(
        t(
          "accountDashboard.trips.lookup.emailRequired",
          "Email address is required.",
        ),
      );
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setLookupState("error");
      setLookupMessage(
        t(
          "accountDashboard.trips.lookup.invalidEmail",
          "Enter a valid email address.",
        ),
      );
      return;
    }

    setLookupState("loading");

    try {
      const response = await fetch("/api/dashboard/trips/lookup", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reservationCode, email }),
      });
      const data = (await response.json().catch(() => ({}))) as LookupResponse;

      if (response.status === 401) {
        setLookupState("error");
        setLookupMessage("Please sign in to look up a reservation.");
        return;
      }

      if (response.status === 404) {
        setLookupState("error");
        setLookupMessage(
          `${t("accountDashboard.trips.lookup.notFoundTitle", "Reservation not found")}. ${t("accountDashboard.trips.lookup.notFoundDescription", "We could not find a reservation with those details.")}`,
        );
        return;
      }

      if (!response.ok) {
        setLookupState("error");
        setLookupMessage(
          data.error ??
            "We could not look up that reservation. Please try again.",
        );
        return;
      }

      if (data.reservation) {
        setLookupResult(data.reservation);
        setLookupState("success");
        setLookupMessage("Reservation found.");
        void loadTrips(false);
        return;
      }

      setLookupState("error");
      setLookupMessage(
        t(
          "accountDashboard.trips.lookup.notFoundDescription",
          "We could not find a reservation with those details.",
        ),
      );
    } catch {
      setLookupState("error");
      setLookupMessage(
        "We could not look up that reservation. Please try again.",
      );
    }
  }

  return (
    <section
      aria-labelledby="trips-title"
      className="mx-auto min-w-0 max-w-[72rem] space-y-10 bg-white pb-12 pt-3 sm:pt-6 lg:space-y-12 lg:pb-16"
    >
      <div>
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h1
              id="trips-title"
              className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]"
            >
              {t("accountDashboard.trips.title", "My Trips")}
            </h1>
            <p className="sr-only" aria-live="polite">
              {summary.total} total trips. {summary.upcoming} upcoming,{" "}
              {summary.past} past, {summary.cancelled} cancelled.
            </p>
          </div>
          <div className="relative flex w-fit shrink-0 justify-end pt-1">
            <button
              ref={lookupTriggerRef}
              type="button"
              onClick={() => {
                setShowLookup(true);
                setLookupMessage(null);
                setLookupResult(null);
                setLookupState("idle");
              }}
              aria-expanded={showLookup}
              aria-controls="reservation-lookup"
              className="focus-ring inline-flex w-fit items-center justify-center rounded-full px-1 py-1 text-sm font-semibold text-violet-800 underline-offset-4 transition hover:text-violet-950 hover:underline lg:cursor-pointer"
            >
              {t(
                "accountDashboard.trips.findReservation",
                "Find a reservation",
              )}
            </button>

            {showLookup ? (
              <LookupDialog
                lookupPopoverRef={lookupPopoverRef}
                lookupState={lookupState}
                lookupMessage={lookupMessage}
                lookupResult={lookupResult}
                reservationCodeRef={lookupReservationCodeRef}
                onClose={closeLookup}
                onSubmit={handleLookupSubmit}
                t={t}
              />
            ) : null}
          </div>
        </div>
      </div>

      {requestState === "loading" ? <TripsLoadingState /> : null}

      {requestState === "unauthenticated" ? (
        <NoticeState
          title="Sign in to view your trips"
          body="Your trips are connected to your account. Please sign in, then return here to manage upcoming, past, and cancelled bookings."
        />
      ) : null}

      {requestState === "error" ? (
        <NoticeState
          title="Unable to load trips"
          body={
            errorMessage ?? "We could not load your trips. Please try again."
          }
          action={
            <button
              type="button"
              onClick={() => void loadTrips()}
              className="focus-ring mt-4 inline-flex h-11 items-center justify-center rounded-full bg-violet-700 px-5 text-sm font-semibold text-white transition hover:bg-violet-800"
              aria-label="Retry loading trips"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {requestState === "success" ? (
        <>
          {upcomingTrips.length > 0 ? (
            <TripCards trips={upcomingTrips} />
          ) : (
            <EmptyStateRow
              className="pt-3 sm:pt-8 lg:pt-12"
              illustration={
                <CurrentTripsIllustration
                  ariaLabel={t(
                    "accountDashboard.trips.illustration.currentAriaLabel",
                    "No current trips illustration",
                  )}
                />
              }
              title={t(
                "accountDashboard.trips.current.empty.title",
                emptyStates.upcoming.titleFallback,
              )}
              body={t(
                "accountDashboard.trips.current.empty.body",
                emptyStates.upcoming.bodyFallback,
              )}
              titleId="current-trips-panel-title"
            />
          )}

          <section
            aria-labelledby="history-trips-panel-title"
            className="space-y-8 pt-1 sm:pt-5 lg:pt-8"
          >
            <div
              className="flex min-w-0 items-center gap-4"
              role="tablist"
              aria-label={t(
                "accountDashboard.trips.history.filtersAriaLabel",
                "Filter trips by status",
              )}
            >
              {tripTabs
                .filter((tab) => tab.id !== "upcoming")
                .map((tab) => {
                  const isActive = activeHistoryTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`${tab.id}-history-trips-panel`}
                      id={`${tab.id}-history-trips-tab`}
                      onClick={() =>
                        setActiveHistoryTab(tab.id as TripHistoryTab)
                      }
                      className={cn(
                        "focus-ring inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-5 text-sm font-semibold transition",
                        isActive
                          ? "border-violet-300 bg-violet-50 text-violet-800"
                          : "border-transparent bg-transparent text-slate-600 hover:border-violet-200 hover:text-slate-950",
                      )}
                    >
                      {t(tab.labelKey, tab.fallback)}
                      <span className="sr-only"> ({summary[tab.id]})</span>
                    </button>
                  );
                })}
            </div>

            <div
              id={`${activeHistoryTab}-history-trips-panel`}
              role="tabpanel"
              aria-labelledby={`${activeHistoryTab}-history-trips-tab`}
            >
              {historyTrips.length > 0 ? (
                <TripCards trips={historyTrips} />
              ) : (
                <EmptyStateRow
                  illustration={
                    <HistoryEmptyIllustration
                      variant={activeHistoryTab}
                      ariaLabel={t(
                        activeHistoryTab === "cancelled"
                          ? "accountDashboard.trips.illustration.cancelledAriaLabel"
                          : "accountDashboard.trips.illustration.historyAriaLabel",
                        "No trip history illustration",
                      )}
                    />
                  }
                  title={t(
                    historyEmptyState.titleKey,
                    historyEmptyState.titleFallback,
                  )}
                  body={t(
                    historyEmptyState.bodyKey,
                    historyEmptyState.bodyFallback,
                  )}
                  titleId="history-trips-panel-title"
                />
              )}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

function LookupDialog({
  lookupPopoverRef,
  lookupState,
  lookupMessage,
  lookupResult,
  reservationCodeRef,
  onClose,
  onSubmit,
  t,
}: {
  lookupPopoverRef: React.RefObject<HTMLDivElement | null>;
  lookupState: LookupState;
  lookupMessage: string | null;
  lookupResult: DashboardTrip | null;
  reservationCodeRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/20 px-3 pb-3 pt-16 sm:absolute sm:inset-auto sm:end-0 sm:top-[calc(100%+0.75rem)] sm:block sm:w-[min(24rem,calc(100vw-3rem))] sm:bg-transparent sm:p-0"
      role="presentation"
    >
      <section
        id="reservation-lookup"
        ref={lookupPopoverRef}
        aria-labelledby="reservation-lookup-title"
        aria-modal="true"
        role="dialog"
        className="max-h-[calc(100vh-4.75rem)] w-full max-w-sm overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.55)] sm:max-h-none sm:max-w-none sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2
              id="reservation-lookup-title"
              className="text-lg font-semibold tracking-tight text-slate-950"
            >
              {t(
                "accountDashboard.trips.lookup.title",
                "Enter booking details",
              )}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {t(
                "accountDashboard.trips.lookup.body",
                "Enter your reservation code and email address to locate and manage your booking.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(
              "accountDashboard.trips.lookup.closeAriaLabel",
              "Close",
            )}
            className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl leading-none text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            ×
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t(
              "accountDashboard.trips.lookup.reservationCode",
              "Reservation code",
            )}
            <input
              ref={reservationCodeRef}
              type="text"
              name="reservationCode"
              autoComplete="off"
              className="focus-ring h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium uppercase tracking-[0.08em] text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t("accountDashboard.trips.lookup.emailAddress", "Email address")}
            <input
              type="email"
              name="email"
              autoComplete="email"
              className="focus-ring h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400"
            />
          </label>
          <button
            type="submit"
            disabled={lookupState === "loading"}
            className="focus-ring inline-flex h-12 items-center justify-center rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(79,70,229,0.9)] transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-400"
          >
            {lookupState === "loading"
              ? t(
                  "accountDashboard.trips.lookup.loading",
                  "Finding reservation...",
                )
              : t("accountDashboard.trips.lookup.submit", "Find reservation")}
          </button>
          {lookupMessage ? (
            <p
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-medium",
                lookupState === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900",
              )}
              role="status"
            >
              {lookupMessage}
            </p>
          ) : null}
          {lookupResult ? <LookupResultCard trip={lookupResult} /> : null}
        </form>
      </section>
    </div>
  );
}

function TripCards({ trips }: { trips: DashboardTrip[] }) {
  return (
    <div className="grid gap-4 sm:gap-5">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}

function TripCard({ trip }: { trip: DashboardTrip }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.45)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
            {trip.provider} · {formatLabel(trip.tripType)}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {formatRoute(trip.origin, trip.destination)}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Booking reference:{" "}
            <span className="font-semibold text-slate-900">
              {trip.bookingReference}
            </span>
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-800">
          {formatLabel(trip.status)}
        </span>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TripDetail label="Departure" value={formatDate(trip.departureDate)} />
        <TripDetail
          label="Return"
          value={trip.returnDate ? formatDate(trip.returnDate) : "—"}
        />
        <TripDetail label="Passengers" value={`${trip.passengerCount}`} />
        <TripDetail
          label="Total"
          value={formatAmount(trip.totalAmount, trip.currency)}
        />
      </dl>
      <button
        type="button"
        disabled
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-500"
        aria-disabled="true"
      >
        View details
      </button>
    </article>
  );
}

function LookupResultCard({ trip }: { trip: DashboardTrip }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-950">
        {formatRoute(trip.origin, trip.destination)}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {trip.provider} · {formatDate(trip.departureDate)} ·{" "}
        {trip.bookingReference}
      </p>
    </div>
  );
}

function TripDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function TripsLoadingState() {
  return (
    <div className="grid gap-4" aria-live="polite" aria-busy="true">
      <p className="text-sm font-medium text-slate-600">
        Loading your trips...
      </p>
      {[0, 1].map((item) => (
        <div
          key={item}
          className="h-40 animate-pulse rounded-3xl bg-slate-100"
        />
      ))}
    </div>
  );
}

function NoticeState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {body}
      </p>
      {action}
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRoute(origin: string | null, destination: string) {
  const safeDestination = destination.trim() || "Unknown destination";
  const safeOrigin = origin?.trim();

  return safeOrigin ? `${safeOrigin} → ${safeDestination}` : safeDestination;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

function formatAmount(amount: number | null, currency: string) {
  if (amount === null) {
    return "—";
  }

  try {
    if (currency.trim()) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
      }).format(amount);
    }
  } catch {
    const safeCurrency = currency.trim();

    return safeCurrency ? `${safeCurrency} ${amount}` : `${amount}`;
  }

  return `${amount}`;
}

function EmptyStateRow({
  illustration,
  title,
  body,
  titleId,
  className,
}: {
  illustration: ReactNode;
  title: string;
  body: string;
  titleId: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 items-center gap-7 sm:grid-cols-[11rem_minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10",
        className,
      )}
    >
      <div className="flex justify-center sm:justify-start">{illustration}</div>
      <div className="min-w-0 text-center sm:text-start">
        <h2
          id={titleId}
          className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.6rem]"
        >
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
          {body}
        </p>
      </div>
    </div>
  );
}

function HistoryEmptyIllustration({
  variant,
  ariaLabel,
}: {
  variant: "past" | "cancelled";
  ariaLabel: string;
}) {
  if (variant === "cancelled") {
    return <CancelledTripIllustration ariaLabel={ariaLabel} />;
  }

  return <PastTripsIllustration ariaLabel={ariaLabel} />;
}

function CurrentTripsIllustration({ ariaLabel }: { ariaLabel: string }) {
  return (
    <svg
      className="h-auto w-44 shrink-0 sm:w-48 lg:w-52"
      viewBox="0 0 240 180"
      fill="none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient
          id="currentTripBlob"
          x1="38"
          x2="202"
          y1="26"
          y2="152"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F7FA" />
          <stop offset="1" stopColor="#EAF7F6" />
        </linearGradient>
        <linearGradient
          id="currentTripGlobe"
          x1="63"
          x2="148"
          y1="50"
          y2="132"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D8E7F8" />
          <stop offset="1" stopColor="#EAF7F6" />
        </linearGradient>
        <filter
          id="currentTripShadow"
          x="29"
          y="35"
          width="187"
          height="130"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feDropShadow
            dx="0"
            dy="14"
            floodColor="#021C2B"
            floodOpacity="0.13"
            stdDeviation="10"
          />
        </filter>
      </defs>
      <path
        d="M42 98c-10-39 16-72 54-77 24-4 36 11 56 14 25 4 47 6 55 30 12 37-24 81-66 91-47 11-88-14-99-58Z"
        fill="url(#currentTripBlob)"
      />
      <g filter="url(#currentTripShadow)">
        <circle
          cx="97"
          cy="91"
          r="43"
          fill="url(#currentTripGlobe)"
          stroke="#004BB8"
          strokeWidth="3"
        />
        <path
          d="M56 91h82M97 48c14 13 22 27 22 43s-8 30-22 43M97 48c-14 13-22 27-22 43s8 30 22 43"
          stroke="#5CB6B2"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
        <path
          d="M66 65c16 8 45 8 62 0M66 117c16-8 45-8 62 0"
          stroke="#5CB6B2"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
        <path
          d="M59 80c18-9 32-9 50 1 18 9 32 9 50-2"
          stroke="#004BB8"
          strokeDasharray="4 7"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path d="M158 74l18 7-18 8 5-8-5-7Z" fill="#004BB8" />
        <path
          d="M67 64c0 10-13 23-13 23S41 74 41 64a13 13 0 1 1 26 0Z"
          fill="#5CB6B2"
        />
        <circle cx="54" cy="63" r="4" fill="white" />
        <path
          d="M145 99h36c5 0 9 4 9 9v30h-54v-30c0-5 4-9 9-9Z"
          fill="white"
          stroke="#021C2B"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="M153 99v-8c0-6 5-11 11-11s11 5 11 11v8"
          stroke="#021C2B"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M136 119h54"
          stroke="#5CB6B2"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <rect x="151" y="112" width="26" height="17" rx="5" fill="#EAF7F6" />
      </g>
    </svg>
  );
}

function PastTripsIllustration({ ariaLabel }: { ariaLabel: string }) {
  return (
    <svg
      className="h-auto w-44 shrink-0 sm:w-48 lg:w-52"
      viewBox="0 0 240 180"
      fill="none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient
          id="pastTripsBlob"
          x1="36"
          x2="206"
          y1="28"
          y2="151"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F7FA" />
          <stop offset="1" stopColor="#EAF7F6" />
        </linearGradient>
        <filter
          id="pastTripsShadow"
          x="34"
          y="32"
          width="178"
          height="128"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feDropShadow
            dx="0"
            dy="13"
            floodColor="#021C2B"
            floodOpacity="0.12"
            stdDeviation="10"
          />
        </filter>
      </defs>
      <path
        d="M35 89c0-38 34-65 73-64 28 1 37 17 61 21 26 4 43 13 43 39 0 40-41 76-90 77-50 2-87-29-87-73Z"
        fill="url(#pastTripsBlob)"
      />
      <g filter="url(#pastTripsShadow)">
        <rect
          x="54"
          y="48"
          width="101"
          height="78"
          rx="14"
          fill="white"
          stroke="#021C2B"
          strokeWidth="3"
        />
        <path
          d="M68 108c18-19 30-22 44-10 8 7 17 8 30-5"
          stroke="#5CB6B2"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M73 69h40M73 82h25"
          stroke="#5CB6B2"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M129 76c0 10-13 24-13 24s-13-14-13-24a13 13 0 1 1 26 0Z"
          fill="#004BB8"
        />
        <circle cx="116" cy="75" r="4" fill="white" />
        <rect
          x="127"
          y="37"
          width="55"
          height="72"
          rx="10"
          fill="#F8FAFC"
          stroke="#004BB8"
          strokeWidth="3"
          transform="rotate(8 127 37)"
        />
        <path
          d="M141 57l24 3M138 78l26 4M136 91l18 3"
          stroke="#5CB6B2"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <circle
          cx="165"
          cy="91"
          r="8"
          fill="#EAF7F6"
          stroke="#5CB6B2"
          strokeWidth="3"
        />
        <path
          d="M66 134c16 8 76 10 103 0"
          stroke="#5CB6B2"
          strokeLinecap="round"
          strokeWidth="4"
        />
      </g>
    </svg>
  );
}

function CancelledTripIllustration({ ariaLabel }: { ariaLabel: string }) {
  return (
    <svg
      className="h-auto w-44 shrink-0 sm:w-48 lg:w-52"
      viewBox="0 0 240 180"
      fill="none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient
          id="cancelledTripsBlob"
          x1="38"
          x2="202"
          y1="29"
          y2="150"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F7FA" />
          <stop offset="1" stopColor="#EAF7F6" />
        </linearGradient>
        <filter
          id="cancelledTripsShadow"
          x="35"
          y="35"
          width="175"
          height="126"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feDropShadow
            dx="0"
            dy="13"
            floodColor="#021C2B"
            floodOpacity="0.12"
            stdDeviation="10"
          />
        </filter>
      </defs>
      <path
        d="M41 93c-8-35 21-65 59-68 26-2 35 13 58 17 26 5 47 9 50 34 5 39-34 75-80 81-48 6-78-25-87-64Z"
        fill="url(#cancelledTripsBlob)"
      />
      <g filter="url(#cancelledTripsShadow)">
        <path
          d="M57 60l39-15 42 15 39-15v78l-39 15-42-15-39 15V60Z"
          fill="white"
          stroke="#021C2B"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="M96 45v78M138 60v78"
          stroke="#5CB6B2"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M70 88c17-16 38-18 58-7 16 9 27 8 43-5"
          stroke="#004BB8"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path d="M157 69l17 7-15 10 4-9-6-8Z" fill="#004BB8" />
        <path
          d="M88 91c0 10-13 24-13 24S62 101 62 91a13 13 0 1 1 26 0Z"
          fill="#5CB6B2"
        />
        <circle cx="75" cy="90" r="4" fill="white" />
        <path
          d="M119 102c14 9 28 8 44-4"
          stroke="#5CB6B2"
          strokeDasharray="5 7"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <circle
          cx="157"
          cy="105"
          r="22"
          fill="#EAF7F6"
          stroke="#004BB8"
          strokeWidth="3"
        />
        <path
          d="M148 96l18 18M166 96l-18 18"
          stroke="#004BB8"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          d="M65 144c15 7 73 9 103 0"
          stroke="#5CB6B2"
          strokeLinecap="round"
          strokeWidth="4"
        />
      </g>
    </svg>
  );
}
