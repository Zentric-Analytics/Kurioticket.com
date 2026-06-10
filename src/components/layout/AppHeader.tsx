"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { signOut, useSession } from "next-auth/react";
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

const RawImage = "img";

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
    description: "View saved alerts",
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
  const [languageStatusMessage, setLanguageStatusMessage] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const { locale, setLocale, t, locales } = useLocale();

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

  const closeLanguageDialog = useCallback(() => {
    setLanguageOpen(false);
    setLanguageQuery("");
    setLanguageStatusMessage("");
    window.setTimeout(() => {
      languageTriggerRef.current?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (accountRef.current && !accountRef.current.contains(target)) {
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
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
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
  }, [closeLanguageDialog, languageOpen]);

  useEffect(() => {
    const closeMenuOnRouteChange = window.setTimeout(() => {
      setOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(closeMenuOnRouteChange);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectedLanguage = useMemo(
    () => locales.find((option) => option.code === locale) ?? locales[0],
    [locale, locales],
  );

  const selectedLanguageDisplayName = selectedLanguage.nativeLabel;

  const accountDisplayName = useMemo(() => {
    const rawName = session?.user?.name?.trim();

    if (rawName) {
      return rawName.split(/\s+/)[0] || t.account;
    }

    return session?.user?.email?.split("@")[0] || t.account;
  }, [session?.user?.email, session?.user?.name, t.account]);

  const accountInitials = useMemo(() => {
    const source =
      session?.user?.name?.trim() || session?.user?.email?.trim() || t.account;

    return (
      source
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "A"
    );
  }, [session?.user?.email, session?.user?.name, t.account]);

  const filteredLanguages = useMemo(() => {
    const query = languageQuery.trim().toLowerCase();

    if (!query) {
      return locales;
    }

    return locales.filter((option) => {
      return (
        option.label.toLowerCase().includes(query) ||
        option.nativeLabel.toLowerCase().includes(query) ||
        option.locale.toLowerCase().includes(query) ||
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
        label: t.cars,
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
        label: t.saved,
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
    [isSignedIn, t],
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
      (item) => Boolean(item.icon) && mobilePrimaryHrefs.has(item.href),
    );
  }, [navItems]);

  const visibleMobilePrimaryNavItems = useMemo(
    () => mobilePrimaryNavItems,
    // hideMobileSecondaryNavLinks is retained for the current header API even though
    // mobile secondary links now live in the overlay drawer instead of this rail.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hideMobileSecondaryNavLinks, mobilePrimaryNavItems],
  );

  const mobileDrawerHrefs = useMemo(
    () =>
      new Set([
        "/destinations",
        "/explore",
        "/saved",
        ...(isSignedIn ? ["/dashboard"] : []),
      ]),
    [isSignedIn],
  );

  const mobileMenuNavItems = useMemo(() => {
    return navItems.filter((item) => mobileDrawerHrefs.has(item.href));
  }, [mobileDrawerHrefs, navItems]);

  const renderFlag = (
    countryCode: string | undefined,
    fallbackText: string | undefined,
  ) => (
    <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
      {countryCode ? (
        <RawImage
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
    afterStart?: () => void,
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

  const handleLanguageSelect = (option: (typeof locales)[number]) => {
    if (option.status !== "available") {
      setLanguageStatusMessage(
        t.languageUnavailableMessage.replace(
          "{{language}}",
          option.nativeLabel,
        ),
      );
      return;
    }

    const didChangeLanguage = setLocale(option.code);

    if (didChangeLanguage) {
      closeLanguageDialog();
    }
  };

  const handleMobileCountryCurrencyBeforeOpen = () => {
    setLanguageOpen(false);
    setAccountOpen(false);
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
        <div className="page-shell flex min-h-[56px] items-center justify-between gap-3 py-2 md:min-h-[46px] md:gap-4 md:py-1">
          <Link
            href="/"
            aria-label="Kurioticket home"
            onClick={(event) => handleRouteLinkClick(event, "/")}
            className="shrink-0"
          >
            <KurioticketLogo
              variant="full"
              tone="light"
              className="gap-2"
              markClassName="h-8 w-8 md:h-9 md:w-9"
              textClassName="text-base md:text-lg"
            />
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 md:flex">
            <CountryCurrencySelector variant="header" grouped />

            <div className="relative" ref={languageRef}>
              <button
                ref={languageTriggerRef}
                type="button"
                onClick={() => setLanguageOpen((value) => !value)}
                aria-haspopup="dialog"
                aria-expanded={languageOpen}
                aria-controls={languageOpen ? languageDialogId : undefined}
                aria-label={t.openLanguagePreferences.replace(
                  "{{language}}",
                  selectedLanguageDisplayName,
                )}
                title={t.openLanguagePreferences.replace(
                  "{{language}}",
                  selectedLanguageDisplayName,
                )}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/10 text-indigo-50 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
              >
                {renderFlag(
                  selectedLanguage?.countryCode,
                  selectedLanguage?.fallbackText,
                )}
              </button>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2">
              {isSignedIn ? (
                <div className="relative" ref={accountRef}>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    onClick={() => setAccountOpen((value) => !value)}
                    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-1.5 pr-2.5 text-[13px] font-semibold text-white shadow-sm ring-1 ring-white/10 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white text-[11px] font-black text-indigo-700 shadow-sm">
                      {session?.user?.image ? (
                        <RawImage
                          src={session.user.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        accountInitials
                      )}
                    </span>

                    <span className="max-w-[8rem] truncate">
                      {accountDisplayName}
                    </span>

                    <ChevronDown
                      size={13}
                      className={`text-indigo-100 transition-transform ${accountOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>

                  {accountOpen ? (
                    <div
                      role="menu"
                      aria-label="Account menu"
                      className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl ring-1 ring-slate-950/5"
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
                                handleRouteLinkClick(event, item.href, () =>
                                  setAccountOpen(false),
                                )
                              }
                              className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-white">
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
                          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent"
                        >
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <LogOut size={17} aria-hidden="true" />
                          </span>
                          {isSigningOut ? t.signingOut : t.logout}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    onClick={(event) =>
                      handleRouteLinkClick(event, "/auth/signin")
                    }
                    className="inline-flex h-9 cursor-pointer items-center rounded-full px-3 text-[13px] font-semibold text-indigo-50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                  >
                    {t.login}
                  </Link>

                  <Link
                    href="/auth/signup"
                    onClick={(event) =>
                      handleRouteLinkClick(event, "/auth/signup")
                    }
                    className="inline-flex h-9 cursor-pointer items-center rounded-full bg-violet-600 px-3.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                  >
                    {t.signUp}
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isSignedIn ? (
              <button
                type="button"
                aria-label={t.openAccountMenu}
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpen((value) => !value)}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-white/10 text-xs font-black text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white text-[11px] font-black text-indigo-700 shadow-sm">
                  {session?.user?.image ? (
                    <RawImage
                      src={session.user.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    accountInitials
                  )}
                </span>
              </button>
            ) : (
              <Link
                href="/auth/signin"
                aria-label={t.signIn}
                onClick={(event) => handleRouteLinkClick(event, "/auth/signin")}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
              >
                <UserCircle size={18} />
              </Link>
            )}

            <button
              type="button"
              aria-label={open ? t.closeMobileMenu : t.openMobileMenu}
              aria-expanded={open}
              aria-controls={open ? "mobile-menu-drawer" : undefined}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
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
                    className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-auto rounded-none border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl md:inset-x-0 md:bottom-auto md:top-[max(64px,6vh)] md:mx-auto md:w-[min(980px,96vw)] md:rounded-3xl md:p-7"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">
                          {t.globalLanguage}
                        </p>
                        <h2
                          id={languageTitleId}
                          className="mt-1 text-xl font-black text-slate-950"
                        >
                          {t.websiteLanguageTitle}
                        </h2>
                        <p
                          id={languageDescriptionId}
                          className="mt-1 max-w-2xl text-sm leading-6 text-slate-600"
                        >
                          {t.websiteLanguageDescription}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeLanguageDialog}
                        className="cursor-pointer rounded-none p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        aria-label={t.closeLanguageSelector}
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mb-4 rounded-none border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-bold text-slate-950">
                        {t.currentLanguage.replace(
                          "{{language}}",
                          selectedLanguageDisplayName,
                        )}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        {t.languagePreparingNotice}
                      </p>
                    </div>

                    <label
                      htmlFor={languageSearchId}
                      className="mb-2 block text-sm font-bold text-slate-900"
                    >
                      {t.languageSearchLabel}
                    </label>

                    <div className="mb-4 flex items-center gap-2 rounded-none border border-slate-200 px-3 py-2 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
                      <Search
                        size={16}
                        className="text-slate-500"
                        aria-hidden="true"
                      />

                      <input
                        ref={languageSearchInputRef}
                        id={languageSearchId}
                        value={languageQuery}
                        onChange={(event) => {
                          setLanguageQuery(event.target.value);
                          setLanguageStatusMessage("");
                        }}
                        placeholder={t.languageSearchPlaceholder}
                        className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>

                    {languageStatusMessage ? (
                      <p
                        className="mb-4 rounded-none border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
                        role="status"
                      >
                        {languageStatusMessage}
                      </p>
                    ) : null}

                    <div
                      role="radiogroup"
                      aria-label={t.languageOptionsLabel}
                      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {filteredLanguages.map((option) => {
                        const active = option.code === locale;
                        const available = option.status === "available";

                        return (
                          <button
                            key={option.code}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            aria-disabled={!available}
                            aria-label={
                              available
                                ? t.selectLanguageOption.replace(
                                    "{{language}}",
                                    option.nativeLabel,
                                  )
                                : t.languagePreparingAria.replace(
                                    "{{language}}",
                                    option.nativeLabel,
                                  )
                            }
                            onClick={() => handleLanguageSelect(option)}
                            className={`flex min-h-[4.25rem] cursor-pointer items-start justify-between gap-3 rounded-none border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                              active
                                ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                                : available
                                  ? "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                                  : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <span className="flex min-w-0 items-start gap-2.5">
                              {renderFlag(
                                option.countryCode,
                                option.fallbackText,
                              )}

                              <span className="min-w-0">
                                <span
                                  className="block truncate text-sm font-black text-slate-950"
                                  dir={option.direction}
                                >
                                  {option.nativeLabel}
                                </span>
                                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                                  {option.label} · {option.locale}
                                </span>
                                {!available ? (
                                  <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">
                                    {t.preparing}
                                  </span>
                                ) : null}
                              </span>
                            </span>

                            {active ? (
                              <Check
                                size={16}
                                className="mt-0.5 shrink-0 text-violet-600"
                                aria-hidden="true"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </>,
                document.body,
              )
            : null}
        </div>

        <nav className="hidden border-t border-white/10 bg-white/[0.04] md:block">
          <div className="page-shell flex min-h-[36px] items-center py-1">
            <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
              {desktopPrimaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(event) => handleRouteLinkClick(event, item.href)}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700 ${
                      active
                        ? "bg-white/[0.12] text-white ring-1 ring-white/35"
                        : "text-indigo-50/90 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {Icon ? <Icon size={15} aria-hidden="true" /> : null}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <nav className="bg-white/5 md:hidden">
          <div className="page-shell overflow-x-auto py-1.5">
            <div className="flex min-w-max items-center gap-1.5 whitespace-nowrap">
              {visibleMobilePrimaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(event) => handleRouteLinkClick(event, item.href)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700 ${
                      active
                        ? "bg-white/10 text-white ring-1 ring-white/50 shadow-none"
                        : "text-indigo-50/90 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {Icon ? (
                      <Icon size={15} className="shrink-0" aria-hidden="true" />
                    ) : null}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {open && typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[70] md:hidden"
                role="presentation"
              >
                <button
                  type="button"
                  className="absolute inset-0 h-full w-full cursor-default bg-slate-950/45"
                  aria-label="Close mobile menu backdrop"
                  onClick={() => setOpen(false)}
                />

                <aside
                  id="mobile-menu-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Mobile menu"
                  className="fixed inset-y-0 right-0 z-[80] flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-white text-slate-900 shadow-2xl"
                >
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
                    <Link
                      href="/"
                      aria-label="Kurioticket home"
                      onClick={(event) =>
                        handleRouteLinkClick(event, "/", () => setOpen(false))
                      }
                      className="shrink-0"
                    >
                      <KurioticketLogo
                        variant="full"
                        tone="dark"
                        className="gap-2"
                        markClassName="h-8 w-8"
                        textClassName="text-base"
                      />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-transparent text-slate-700 transition-colors hover:border-slate-200 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      aria-label="Close mobile menu"
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>

                  <nav className="page-shell grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overflow-x-hidden overscroll-contain py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
                    <div className="pb-1">
                      <CountryCurrencySelector
                        variant="mobile"
                        onBeforeOpen={handleMobileCountryCurrencyBeforeOpen}
                      />
                    </div>

                    <button
                      ref={languageTriggerRef}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setLanguageOpen(true);
                      }}
                      aria-haspopup="dialog"
                      aria-expanded={languageOpen}
                      aria-controls={
                        languageOpen ? languageDialogId : undefined
                      }
                      aria-label={t.openLanguagePreferences.replace(
                        "{{language}}",
                        selectedLanguageDisplayName,
                      )}
                      className="inline-flex min-h-11 cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <span className="inline-flex items-center gap-2">
                        {renderFlag(
                          selectedLanguage?.countryCode,
                          selectedLanguage?.fallbackText,
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
                          onClick={(event) =>
                            handleRouteLinkClick(event, item.href, () =>
                              setOpen(false),
                            )
                          }
                          className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}

                    {isSignedIn ? (
                      <section
                        className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2"
                        aria-label="Account"
                      >
                        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2">
                          <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-xs font-black text-white shadow-sm">
                            {session?.user?.image ? (
                              <RawImage
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

                        <div className="mt-1.5 grid gap-0.5">
                          {signedInAccountMenuItems.map((item) => {
                            const Icon = item.icon;

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={(event) =>
                                  handleRouteLinkClick(event, item.href, () =>
                                    setOpen(false),
                                  )
                                }
                                className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                            className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent"
                          >
                            <LogOut size={16} aria-hidden="true" />
                            {isSigningOut ? t.signingOut : t.logout}
                          </button>
                        </div>
                      </section>
                    ) : null}
                  </nav>
                </aside>
              </div>,
              document.body,
            )
          : null}
      </header>
    </>
  );
}
