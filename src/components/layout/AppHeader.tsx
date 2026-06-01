"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  signOut,
  useSession,
} from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Bed,
  Bell,
  Car,
  Check,
  ChevronDown,
  Compass,
  LogOut,
  MapPin,
  Menu,
  Plane,
  Search,
  Tag,
  UserCircle,
  X,
} from "lucide-react";

import { KurioticketLogo } from "@/components/brand/KurioticketLogo";
import { useLocale } from "@/components/layout/LocaleProvider";
import { CountryCurrencySelector } from "@/components/region/CountryCurrencySelector";
import {
  Button,
  LinkButton,
} from "@/components/ui/Button";


function SavedHeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
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

export function AppHeader({
  hideMobileSecondaryNavLinks = false,
}: AppHeaderProps = {}) {
  const { data: session } = useSession();

  const isSignedIn = Boolean(session?.user);

  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageQuery, setLanguageQuery] = useState("");
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);

  const {
    locale,
    setLocale,
    t,
    locales,
  } = useLocale();

  const pathname = usePathname();

  const languageRef = useRef<HTMLDivElement | null>(null);
  const languageMenuRef = useRef<HTMLElement | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        languageRef.current &&
        !languageRef.current.contains(target) &&
        !languageMenuRef.current?.contains(target)
      ) {
        setLanguageOpen(false);
      }

      if (
        desktopMenuRef.current &&
        !desktopMenuRef.current.contains(target)
      ) {
        setDesktopMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLanguageOpen(false);
        setOpen(false);
        setDesktopMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const selectedLanguage = useMemo(
    () =>
      locales.find((option) => option.code === locale) ?? locales[0],
    [locale, locales]
  );

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
              href: "/pricing",
              label: t.premium,
              icon: undefined,
            },
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
    const desktopMoreHrefs = new Set([
      "/destinations",
      "/explore",
      "/saved",
    ]);

    return navItems.filter((item) => !desktopMoreHrefs.has(item.href));
  }, [navItems]);

  const desktopMoreNavItems = useMemo(() => {
    const desktopMoreHrefs = new Set([
      "/destinations",
      "/explore",
      "/saved",
    ]);

    return navItems.filter((item) => desktopMoreHrefs.has(item.href));
  }, [navItems]);

  const desktopMoreActive = desktopMoreNavItems.some((item) =>
    isNavItemActive(item.href)
  );

  const mobilePrimaryNavItems = useMemo(() => {
    const mobilePrimaryHrefs = new Set([
      "/flights/results",
      "/hotels",
      "/cars",
      "/deals",
      "/destinations",
      "/explore",
      "/saved",
    ]);

    return navItems.filter(
      (item) => Boolean(item.icon) && mobilePrimaryHrefs.has(item.href)
    );
  }, [navItems]);

  const mobileHiddenHrefs = useMemo(
    () => new Set(["/destinations", "/explore", "/saved"]),
    []
  );

  const visibleMobilePrimaryNavItems = useMemo(() => {
    if (!hideMobileSecondaryNavLinks) {
      return mobilePrimaryNavItems;
    }

    return mobilePrimaryNavItems.filter(
      (item) => !mobileHiddenHrefs.has(item.href)
    );
  }, [
    hideMobileSecondaryNavLinks,
    mobileHiddenHrefs,
    mobilePrimaryNavItems,
  ]);

  const mobileMenuNavItems = useMemo(() => {
    if (!hideMobileSecondaryNavLinks) {
      return navItems;
    }

    return navItems.filter((item) => !mobileHiddenHrefs.has(item.href));
  }, [hideMobileSecondaryNavLinks, mobileHiddenHrefs, navItems]);

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

  const handleLanguageSelect = (code: (typeof locales)[number]["code"]) => {
    setLocale(code);
    setLanguageOpen(false);
    setLanguageQuery("");
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-gradient-to-r from-indigo-900 via-violet-800 to-purple-700 text-white shadow-[0_10px_30px_rgba(76,29,149,0.22)]">
        <div className="page-shell flex min-h-[104px] items-center justify-between gap-6 py-5">
          <Link href="/" aria-label="Kurioticket home" className="shrink-0">
            <KurioticketLogo variant="full" tone="light" />
          </Link>

          <div className="hidden flex-1 flex-col gap-3 md:flex">
            <div className="flex items-center justify-end gap-3">
              <CountryCurrencySelector variant="header" />

              <div className="relative" ref={languageRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLanguageOpen((value) => !value)}
                  aria-label={`Change language, current language ${selectedLanguage?.label}`}
                  className="h-12 gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-indigo-50 shadow-sm transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-white/60 focus-visible:ring-offset-indigo-900"
                >
                  {renderFlag(
                    selectedLanguage?.countryCode,
                    selectedLanguage?.fallbackText
                  )}

                  <ChevronDown size={14} className="text-indigo-100" />
                </Button>
              </div>

              {isSignedIn ? (
                <>
                  <LinkButton
                    href="/dashboard/alerts"
                    variant="ghost"
                    className="h-12 rounded-full px-4 text-indigo-50 hover:bg-white/10 hover:text-white"
                  >
                    <Bell size={16} />
                  </LinkButton>

                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold text-indigo-50 shadow-sm hover:bg-white/15 hover:text-white"
                  >
                    <LogOut size={15} />
                    {t.logout}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="inline-flex h-12 items-center rounded-full px-4 text-sm font-semibold text-indigo-50 hover:bg-white/10 hover:text-white"
                  >
                    {t.login}
                  </Link>

                  <Link
                    href="/auth/signup"
                    className="inline-flex h-12 items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    {t.signUp}
                  </Link>
                </>
              )}
              <div className="relative" ref={desktopMenuRef}>
                <button
                  type="button"
                  onClick={() => setDesktopMenuOpen((value) => !value)}
                  aria-expanded={desktopMenuOpen}
                  aria-haspopup="menu"
                  aria-label={
                    desktopMenuOpen
                      ? "Close more navigation"
                      : "Open more navigation"
                  }
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-md shadow-indigo-950/20 transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 ${
                    desktopMoreActive ? "border-white/40 bg-white/20 ring-2 ring-white/60" : ""
                  }`}
                >
                  {desktopMenuOpen ? (
                    <X size={19} aria-hidden="true" />
                  ) : (
                    <Menu size={19} aria-hidden="true" />
                  )}
                </button>

                {desktopMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl"
                  >
                    {desktopMoreNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = isNavItemActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setDesktopMenuOpen(false)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                            active
                              ? "bg-violet-50 text-violet-700"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <nav className="flex items-center gap-2.5">
              {desktopPrimaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-base font-semibold transition-colors ${
                      active
                        ? "bg-white/15 text-white ring-2 ring-white/80 shadow-sm"
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
            <Link
              href={isSignedIn ? "/dashboard" : "/auth/signin"}
              aria-label={isSignedIn ? "Open dashboard" : "Sign in"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/15"
            >
              <UserCircle size={18} />
            </Link>

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/15"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {languageOpen ? (
            <>
              <div
                className="fixed inset-0 z-40 bg-slate-900/45"
                onClick={() => setLanguageOpen(false)}
              />

              <section
                role="menu"
                ref={languageMenuRef}
                className="fixed inset-x-4 top-[max(80px,8vh)] z-50 mx-auto max-h-[84vh] w-[min(980px,96vw)] overflow-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl md:inset-x-0 md:p-7"
              >
                <h2 className="text-base font-black text-slate-950">
                  {t.selectLanguage}
                </h2>

                <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <Search size={16} className="text-slate-500" />

                  <input
                    value={languageQuery}
                    onChange={(event) => setLanguageQuery(event.target.value)}
                    placeholder={t.searchLanguage}
                    className="w-full border-0 bg-transparent text-sm outline-none"
                  />
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {filteredLanguages.map((option) => {
                    const active = option.code === locale;

                    return (
                      <button
                        key={option.code}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => handleLanguageSelect(option.code)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                          active
                            ? "border-violet-300 bg-violet-50"
                            : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                          {renderFlag(option.countryCode, option.fallbackText)}

                          <span>{option.label}</span>
                        </span>

                        <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                          <span>{option.code}</span>

                          {active ? (
                            <Check size={16} className="text-violet-600" />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : null}
        </div>

        <nav className="bg-white/5 md:hidden">
          <div className="page-shell overflow-x-auto py-2">
            <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
              {visibleMobilePrimaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 ${
                      active
                        ? "bg-white/15 text-white ring-2 ring-white/80 shadow-sm"
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

        {open ? (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <nav className="page-shell grid gap-2 py-4">
              <div className="pb-2">
                <CountryCurrencySelector />
              </div>

              <button
                type="button"
                onClick={() => setLanguageOpen(true)}
                className="inline-flex h-11 items-center justify-between rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900"
              >
                <span className="inline-flex items-center gap-2">
                  {renderFlag(
                    selectedLanguage?.countryCode,
                    selectedLanguage?.fallbackText
                  )}
                  <span>{selectedLanguage.label}</span>
                </span>

                <ChevronDown size={14} className="text-slate-500" />
              </button>

              {mobileMenuNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[15px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <LogOut size={15} />
                  {t.logout}
                </button>
              ) : null}
            </nav>
          </div>
        ) : null}
      </header>

      <div aria-hidden="true" className="h-[150px] shrink-0 md:h-[104px]" />
    </>
  );
}
