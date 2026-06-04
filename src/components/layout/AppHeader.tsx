"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import {
  signOut,
  useSession,
} from "next-auth/react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

import {
  Bed,
  Car,
  Check,
  ChevronDown,
  Compass,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Plane,
  Search,
  Settings,
  Tag,
  UserCircle,
  X,
} from "lucide-react";

import { KurioticketLogo } from "@/components/brand/KurioticketLogo";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { CountryCurrencySelector } from "@/components/region/CountryCurrencySelector";


function SavedHeartIcon({
  className,
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.2C6.3 16.2 3 13.1 3 9.1C3 6.3 5.2 4 8.1 4C9.8 4 11.4 4.8 12.4 6.1C13.4 4.8 15 4 16.7 4C19.6 4 21.8 6.3 21.8 9.1C21.8 13.1 18.5 16.2 12.8 20.2L12.4 20.5L12 20.2Z" />
      <path d="M15.7 7.4C16.8 7.4 17.7 8.3 17.7 9.4" className="opacity-70" />
    </svg>
  );
}

type AppHeaderProps = {
  hideMobileSecondaryNavLinks?: boolean;
};

const signedInAccountMenuItems = [
  {
    href: "/dashboard",
    label: "My account",
    description: "Trips and travel tools",
    icon: LayoutDashboard,
  },
  {
    href: "/saved",
    label: "Saved trips",
    description: "Shortlisted stays and searches",
    icon: SavedHeartIcon,
  },
  {
    href: "/dashboard/alerts",
    label: "Price alerts",
    description: "Track fare changes",
    icon: Tag,
  },
  {
    href: "/dashboard/settings",
    label: "Account settings",
    description: "Profile and preferences",
    icon: Settings,
  },
];

export function AppHeader({
  hideMobileSecondaryNavLinks = false,
}: AppHeaderProps = {}) {
  const { data: session } = useSession();

  const isSignedIn = Boolean(session?.user);

  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageQuery, setLanguageQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const {
    locale,
    setLocale,
    t,
    locales,
  } = useLocale();

  const pathname = usePathname();
  const { start: startRouteProgress } = useRouteProgress();

  const languageRef = useRef<HTMLDivElement | null>(null);
  const languageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const languageMenuRef = useRef<HTMLElement | null>(null);
  const languageSearchInputRef = useRef<HTMLInputElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const languageDialogId = useId();
  const languageTitleId = useId();
  const languageDescriptionId = useId();
  const languageSearchId = useId();

  const closeLanguageDialog = () => {
    setLanguageOpen(false);
    setLanguageQuery("");
    window.setTimeout(() => {
      languageTriggerRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        accountRef.current &&
        !accountRef.current.contains(target)
      ) {
        setAccountOpen(false);
      }

    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!languageOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      languageSearchInputRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLanguageDialog();
        return;
      }

      if (event.key !== "Tab" || !languageMenuRef.current) {
        return;
      }

      const focusableElements = Array.from(
        languageMenuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.getClientRects().length > 0);

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [languageOpen]);

  const selectedLanguage = useMemo(
    () =>
      locales.find((option) => option.code === locale) ?? locales[0],
    [locale, locales]
  );

  const selectedLanguageDisplayName =
    selectedLanguage.label;

  const accountDisplayName = useMemo(() => {
    const rawName = session?.user?.name?.trim();

    if (rawName) {
      return rawName.split(/\s+/)[0] || "Account";
    }

    return session?.user?.email?.split("@")[0] || "Account";
  }, [session?.user?.email, session?.user?.name]);

  const accountInitials = useMemo(() => {
    const source =
      session?.user?.name?.trim() ||
      session?.user?.email?.trim() ||
      "Account";

    return source
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "A";
  }, [session?.user?.email, session?.user?.name]);

  const filteredLanguages = useMemo(() => {
    const query = languageQuery.trim().toLowerCase();

    if (!query) {
      return locales;
    }

    return locales.filter((option) => {
      return (
        option.label.toLowerCase().includes(query) ||
        option.code.toLowerCase().includes(query)
      );
    });
  }, [languageQuery, locales]);

  const navItems = useMemo(
    () => [
      {
        href: "/flights/results",
        label: t.flights,
        icon: Plane,
      },
      {
        href: "/hotels",
        label: t.hotels,
        icon: Bed,
      },
      {
        href: "/cars",
        label: "Cars",
        icon: Car,
      },
      {
        href: "/deals",
        label: t.deals,
        icon: Tag,
      },
      {
        href: "/destinations",
        label: t.destinations,
        icon: MapPin,
      },
      {
        href: "/explore",
        label: t.explore,
        icon: Compass,
      },
      {
        href: "/saved",
        label: "Saved",
        icon: SavedHeartIcon,
      },
      ...(isSignedIn
        ? [
            {
              href: "/dashboard",
              label: t.dashboard,
              icon: undefined,
            },
          ]
        : []),
    ],
    [isSignedIn, t]
  );

  const isNavItemActive = (href: string) => {
    if (href.startsWith("/flights")) {
      return pathname.startsWith("/flights");
    }

    if (href.startsWith("/hotels")) {
      return pathname.startsWith("/hotels");
    }

    if (href.startsWith("/cars")) {
      return pathname.startsWith("/cars");
    }

    if (href === "/deals") {
      return pathname.startsWith("/deals");
    }

    if (href === "/destinations") {
      return pathname.startsWith("/destinations");
    }

    if (href === "/explore") {
      return pathname.startsWith("/explore");
    }

    return pathname === href;
  };

  const desktopPrimaryNavItems = useMemo(() => {
    const desktopPrimaryHrefs = new Set([
      "/flights/results",
      "/hotels",
      "/cars",
      "/deals",
    ]);

    return navItems.filter((item) => desktopPrimaryHrefs.has(item.href));
  }, [navItems]);

  const mobilePrimaryNavItems = useMemo(() => {
    const mobilePrimaryHrefs = new Set([
      "/flights/results",
      "/hotels",
      "/cars",
      "/deals",
    ]);

    return navItems.filter(
      (item) => Boolean(item.icon) && mobilePrimaryHrefs.has(item.href)
    );
  }, [navItems]);

  const visibleMobilePrimaryNavItems = useMemo(
    () => mobilePrimaryNavItems,
    [hideMobileSecondaryNavLinks, mobilePrimaryNavItems]
  );

  const mobileDrawerHrefs = useMemo(
    () =>
      new Set([
        "/destinations",
        "/explore",
        "/saved",
        ...(isSignedIn ? ["/dashboard"] : []),
      ]),
    [isSignedIn]
  );

  const mobileMenuNavItems = useMemo(() => {
    return navItems.filter((item) => mobileDrawerHrefs.has(item.href));
  }, [mobileDrawerHrefs, navItems]);

  const renderFlag = (
    countryCode: string | undefined,
    fallbackText: string | undefined
  ) => (
    <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
      {countryCode ? (
        <img
          src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`}
          alt={fallbackText ?? "Flag"}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";

            const fallback = event.currentTarget
              .nextElementSibling as HTMLElement | null;

            if (fallback) {
              fallback.style.display = "inline-flex";
            }
          }}
        />
      ) : null}

      <span className="hidden items-center justify-center text-[9px] font-bold text-slate-700">
        {fallbackText ?? "US"}
      </span>
    </span>
  );


  const handleRouteLinkClick = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    href: string,
    afterStart?: () => void
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const nextUrl = new URL(href, currentUrl.origin);

    if (nextUrl.origin !== currentUrl.origin) {
      return;
    }

    if (
      nextUrl.pathname === currentUrl.pathname &&
      nextUrl.search === currentUrl.search &&
      nextUrl.hash === currentUrl.hash
    ) {
      afterStart?.();
      return;
    }

    startRouteProgress();
    afterStart?.();
  };

  const handleLanguageSelect = (code: (typeof locales)[number]["code"]) => {
    setLocale(code);
    closeLanguageDialog();
  };

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setAccountOpen(false);
    setOpen(false);

    try {
      await signOut({ redirect: false, callbackUrl: "/" });
      window.location.assign("/");
    } catch {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <header className="relative z-50 border-b border-white/15 bg-[#4338CA] text-white shadow-[0_8px_24px_rgba(49,46,129,0.16)]">
        <div className="page-shell flex min-h-[104px] items-center justify-between gap-6 py-5">
          <Link
            href="/"
            aria-label="Kurioticket home"
            onClick={(event) => handleRouteLinkClick(event, "/")}
            className="shrink-0"
          >
            <KurioticketLogo variant="full" tone="light" />
          </Link>

          <div className="hidden flex-1 flex-col gap-3 md:flex">
            <div className="flex items-center justify-end gap-3">
              <div className="inline-flex h-12 items-center overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm">
                <CountryCurrencySelector variant="header" grouped />

                <span className="pointer-events-none h-6 w-px bg-white/20" aria-hidden="true" />

                <div className="relative" ref={languageRef}>
                  <button
                    ref={languageTriggerRef}
                    type="button"
                    onClick={() => setLanguageOpen((value) => !value)}
                    aria-haspopup="dialog"
                    aria-expanded={languageOpen}
                    aria-controls={languageOpen ? languageDialogId : undefined}
                    aria-label={`Open language preferences, current language ${selectedLanguageDisplayName}`}
                    className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none border-0 bg-transparent px-4 text-sm font-semibold text-indigo-50 shadow-none transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                  >
                    <span>{selectedLanguageDisplayName}</span>

                    <ChevronDown size={14} className="text-indigo-100" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {isSignedIn ? (
                <div className="relative" ref={accountRef}>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    onClick={() => setAccountOpen((value) => !value)}
                    className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-white/10 px-2.5 pr-3.5 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-black text-indigo-700 shadow-sm">
                      {session?.user?.image ? (
                        <img
                          src={session.user.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        accountInitials
                      )}
                    </span>

                    <span className="max-w-[8rem] truncate">{accountDisplayName}</span>

                    <ChevronDown
                      size={14}
                      className={`text-indigo-100 transition-transform ${accountOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>

                  {accountOpen ? (
                    <div
                      role="menu"
                      aria-label="Account menu"
                      className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl ring-1 ring-slate-950/5"
                    >
                      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                          Kurioticket account
                        </p>
                        <p className="mt-1 truncate text-sm font-black text-slate-950">
                          {session?.user?.name || accountDisplayName}
                        </p>
                        {session?.user?.email ? (
                          <p className="truncate text-xs font-semibold text-slate-500">
                            {session.user.email}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-1 p-2">
                        {signedInAccountMenuItems.map((item) => {
                          const Icon = item.icon;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              role="menuitem"
                              onClick={(event) =>
                                handleRouteLinkClick(event, item.href, () => setAccountOpen(false))
                              }
                              className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-white">
                                <Icon size={17} aria-hidden="true" />
                              </span>

                              <span className="min-w-0">
                                <span className="block text-sm font-bold text-slate-950">
                                  {item.label}
                                </span>
                                <span className="block truncate text-xs font-medium text-slate-500">
                                  {item.description}
                                </span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>

                      <div className="border-t border-slate-100 p-2">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleSignOut}
                          disabled={isSigningOut}
                          aria-busy={isSigningOut}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <LogOut size={17} aria-hidden="true" />
                          </span>
                          {isSigningOut ? "Signing out…" : t.logout}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    onClick={(event) => handleRouteLinkClick(event, "/auth/signin")}
                    className="inline-flex h-12 cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-indigo-50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                  >
                    {t.login}
                  </Link>

                  <Link
                    href="/auth/signup"
                    onClick={(event) => handleRouteLinkClick(event, "/auth/signup")}
                    className="inline-flex h-12 cursor-pointer items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                  >
                    {t.signUp}
                  </Link>
                </>
              )}
            </div>

            <nav className="flex items-center gap-2.5">
              {desktopPrimaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(event) => handleRouteLinkClick(event, item.href)}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700 ${
                      active
                        ? "bg-white/10 text-white ring-1 ring-white/50 shadow-none"
                        : "text-indigo-50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {Icon ? <Icon size={17} aria-hidden="true" /> : null}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isSignedIn ? (
              <button
                type="button"
                aria-label="Open account menu"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpen((value) => !value)}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-white/10 text-sm font-black text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
              >
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  accountInitials
                )}
              </button>
            ) : (
              <Link
                href="/auth/signin"
                aria-label="Sign in"
                onClick={(event) => handleRouteLinkClick(event, "/auth/signin")}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
              >
                <UserCircle size={18} />
              </Link>
            )}

            <button
              type="button"
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {languageOpen && typeof document !== "undefined"
            ? createPortal(
                <>
                  <div
                    className="fixed inset-0 z-40 bg-slate-900/45"
                    onClick={closeLanguageDialog}
                  />

                  <section
                    ref={languageMenuRef}
                    id={languageDialogId}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={languageTitleId}
                    aria-describedby={languageDescriptionId}
                    className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-auto rounded-t-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl md:inset-x-0 md:bottom-auto md:top-[max(80px,8vh)] md:mx-auto md:w-[min(980px,96vw)] md:rounded-3xl md:p-7"
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">
                          Preferences
                        </p>
                        <h2
                          id={languageTitleId}
                          className="mt-1 text-2xl font-black text-slate-950"
                        >
                          Language
                        </h2>
                        <p
                          id={languageDescriptionId}
                          className="mt-1 text-sm text-slate-600"
                        >
                          Choose the language used across the site. This preference does not change airport suggestions.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeLanguageDialog}
                        className="cursor-pointer rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        aria-label="Close preferences dialog"
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
                    </div>

                    <label
                      htmlFor={languageSearchId}
                      className="mb-2 block text-sm font-bold text-slate-900"
                    >
                      Search language
                    </label>

                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
                      <Search size={16} className="text-slate-500" aria-hidden="true" />

                      <input
                        ref={languageSearchInputRef}
                        id={languageSearchId}
                        value={languageQuery}
                        onChange={(event) => setLanguageQuery(event.target.value)}
                        placeholder="English (US) or English (UK)"
                        className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <div
                      role="radiogroup"
                      aria-label="Language options"
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {filteredLanguages.map((option) => {
                        const active = option.code === locale;

                        return (
                          <button
                            key={option.code}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            aria-label={`Select ${option.label}`}
                            onClick={() => handleLanguageSelect(option.code)}
                            className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                              active
                                ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                                : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                            }`}
                          >
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                              {renderFlag(option.countryCode, option.fallbackText)}

                              <span>{option.label}</span>
                            </span>

                            <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                              <span className="uppercase">{option.code}</span>

                              {active ? (
                                <Check size={16} className="text-violet-600" aria-hidden="true" />
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </>,
                document.body
              )
            : null}
        </div>

        <nav className="bg-white/5 md:hidden">
          <div className="page-shell overflow-x-auto py-2.5">
            <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
              {visibleMobilePrimaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(event) => handleRouteLinkClick(event, item.href)}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700 ${
                      active
                        ? "bg-white/10 text-white ring-1 ring-white/50 shadow-none"
                        : "text-indigo-50/90 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {Icon ? (
                      <Icon size={17} className="shrink-0" aria-hidden="true" />
                    ) : null}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {open ? (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <nav className="page-shell grid gap-2 py-4">
              <div className="pb-2">
                <CountryCurrencySelector />
              </div>

              <button
                ref={languageTriggerRef}
                type="button"
                onClick={() => setLanguageOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={languageOpen}
                aria-controls={languageOpen ? languageDialogId : undefined}
                aria-label={`Open language preferences, current language ${selectedLanguageDisplayName}`}
                className="inline-flex h-11 cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span className="inline-flex items-center gap-2">
                  {renderFlag(
                    selectedLanguage?.countryCode,
                    selectedLanguage?.fallbackText
                  )}
                  <span>{selectedLanguageDisplayName}</span>
                </span>

                <ChevronDown size={14} className="text-slate-500" />
              </button>

              {mobileMenuNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(event) => handleRouteLinkClick(event, item.href, () => setOpen(false))}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {isSignedIn ? (
                <section className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3" aria-label="Account">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-sm font-black text-white shadow-sm">
                      {session?.user?.image ? (
                        <img
                          src={session.user.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        accountInitials
                      )}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-950">
                        {session?.user?.name || accountDisplayName}
                      </span>
                      <span className="block truncate text-xs font-semibold text-slate-500">
                        {session?.user?.email || "Kurioticket account"}
                      </span>
                    </span>
                  </div>

                  <div className="mt-2 grid gap-1">
                    {signedInAccountMenuItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={(event) =>
                            handleRouteLinkClick(event, item.href, () => setOpen(false))
                          }
                          className="inline-flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <Icon size={16} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      aria-busy={isSigningOut}
                      className="inline-flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      {isSigningOut ? "Signing out…" : t.logout}
                    </button>
                  </div>
                </section>
              ) : null}
            </nav>
          </div>
        ) : null}
      </header>
    </>
  );
}
