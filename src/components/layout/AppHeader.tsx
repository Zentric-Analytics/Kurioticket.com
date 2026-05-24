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

import {
  Bed,
  Bell,
  Check,
  ChevronDown,
  Compass,
  LogOut,
  MapPin,
  Menu,
  Plane,
  Search,
  Sparkles,
  Tag,
  UserCircle,
  X,
} from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { CountryCurrencySelector } from "@/components/region/CountryCurrencySelector";
import {
  Button,
  LinkButton,
} from "@/components/ui/Button";

export function AppHeader() {
  const { data: session } =
    useSession();

  const isSignedIn = Boolean(
    session?.user
  );

  const [open, setOpen] =
    useState(false);

  const [languageOpen, setLanguageOpen] =
    useState(false);

  const [languageQuery, setLanguageQuery] =
    useState("");

  const {
    locale,
    setLocale,
    t,
    locales,
  } = useLocale();

  const languageRef =
    useRef<HTMLDivElement | null>(
      null
    );
  const languageMenuRef =
    useRef<HTMLElement | null>(
      null
    );

  useEffect(() => {
    const onClickOutside = (
      event: MouseEvent
    ) => {
      if (!languageRef.current) {
        return;
      }

      if (
        !languageRef.current.contains(
          event.target as Node
        ) &&
        !languageMenuRef.current?.contains(
          event.target as Node
        )
      ) {
        setLanguageOpen(false);
      }
    };

    const onKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setLanguageOpen(false);
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      onClickOutside
    );

    document.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        onClickOutside
      );

      document.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, []);

  const selectedLanguage =
    useMemo(
      () =>
        locales.find(
          (option) =>
            option.code === locale
        ) ?? locales[0],
      [locale, locales]
    );

  const filteredLanguages =
    useMemo(() => {
      const query =
        languageQuery
          .trim()
          .toLowerCase();

      if (!query) {
        return locales;
      }

      return locales.filter(
        (option) => {
          return (
            option.label
              .toLowerCase()
              .includes(query) ||
            option.code
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [languageQuery, locales]);

  const navItems = useMemo(
    () => [
      {
        href: "/flights/results",
        label: t.flights,
        icon: Plane,
      },
      {
        href: "/hotels/results",
        label: t.hotels,
        icon: Bed,
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

      ...(isSignedIn
        ? [
            {
              href: "/pricing",
              label: t.premium,
            },
            {
              href: "/dashboard",
              label: t.dashboard,
            },
          ]
        : []),
    ],
    [isSignedIn, t]
  );

  const renderFlag = (
    countryCode:
      | string
      | undefined,
    fallbackText:
      | string
      | undefined
  ) => (
    <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
      {countryCode ? (
        <img
          src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`}
          alt={
            fallbackText ??
            "Flag"
          }
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display =
              "none";

            const fallback =
              event.currentTarget
                .nextElementSibling as HTMLElement | null;

            if (fallback) {
              fallback.style.display =
                "inline-flex";
            }
          }}
        />
      ) : null}

      <span className="hidden items-center justify-center text-[9px] font-bold text-slate-700">
        {fallbackText ?? "US"}
      </span>
    </span>
  );

  const handleLanguageSelect = (
    code:
      (typeof locales)[number]["code"]
  ) => {
    setLocale(code);

    setLanguageOpen(false);

    setLanguageQuery("");

  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-900 text-white shadow-[0_10px_30px_rgba(30,27,75,0.28)]">
        <div className="page-shell flex min-h-[104px] items-center justify-between gap-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-3 text-xl font-bold text-white"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6d28d9] text-white">
              <Sparkles size={24} />
            </span>

            <span className="leading-none">Curioticket</span>
          </Link>

          <div className="hidden flex-1 flex-col gap-3 md:flex">
            <div className="flex items-center justify-end gap-3">
              <CountryCurrencySelector />

              <div
                className="relative"
                ref={languageRef}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setLanguageOpen(
                      (value) =>
                        !value
                    )
                  }
                  aria-label={`Change language, current language ${selectedLanguage?.label}`}
                  className="h-12 gap-2 rounded-full border border-white/30 bg-white/95 px-4 shadow-sm"
                >
                  {renderFlag(
                    selectedLanguage?.countryCode,
                    selectedLanguage?.fallbackText
                  )}

                  <ChevronDown
                    size={14}
                    className="text-slate-600"
                  />
                </Button>
              </div>

              {isSignedIn ? (
                <>
                  <LinkButton href="/dashboard/alerts" variant="ghost" className="h-12 rounded-full px-4 text-indigo-50 hover:bg-white/10 hover:text-white">
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
                  <Link href="/auth/signin" className="inline-flex h-12 items-center rounded-full px-4 text-sm font-semibold text-indigo-50 hover:bg-white/10 hover:text-white">
                    {t.login}
                  </Link>
                  <Link href="/auth/signup" className="inline-flex h-12 items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700">
                    {t.signUp}
                  </Link>
                </>
              )}
            </div>

            <nav className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-indigo-50 hover:bg-white/10 hover:text-white"
                  >
                    {Icon ? (
                      <Icon
                        size={15}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href={
                isSignedIn
                  ? "/dashboard"
                  : "/auth/signin"
              }
              aria-label={
                isSignedIn
                  ? "Open dashboard"
                  : "Sign in"
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/15"
            >
              <UserCircle size={18} />
            </Link>

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/15"
              onClick={() =>
                setOpen(
                  (value) => !value
                )
              }
            >
              {open ? (
                <X size={18} />
              ) : (
                <Menu size={18} />
              )}
            </button>
          </div>

          {languageOpen ? (
            <>
              <div
                className="fixed inset-0 z-40 bg-slate-900/45"
                onClick={() =>
                  setLanguageOpen(false)
                }
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
                  <Search
                    size={16}
                    className="text-slate-500"
                  />

                  <input
                    value={languageQuery}
                    onChange={(event) =>
                      setLanguageQuery(
                        event.target.value
                      )
                    }
                    placeholder={
                      t.searchLanguage
                    }
                    className="w-full border-0 bg-transparent text-sm outline-none"
                  />
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {filteredLanguages.map(
                    (option) => {
                      const active =
                        option.code ===
                        locale;

                      return (
                        <button
                          key={
                            option.code
                          }
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() =>
                            handleLanguageSelect(
                              option.code
                            )
                          }
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                            active
                              ? "border-violet-300 bg-violet-50"
                              : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                            {renderFlag(
                              option.countryCode,
                              option.fallbackText
                            )}

                            <span>
                              {option.label}
                            </span>
                          </span>

                          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                            <span>
                              {option.code}
                            </span>

                            {active ? (
                              <Check
                                size={16}
                                className="text-violet-600"
                              />
                            ) : null}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>

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
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    {Icon ? (
                      <Icon
                        size={16}
                        aria-hidden="true"
                      />
                    ) : null}
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

      <div aria-hidden="true" className="h-[104px] shrink-0" />
    </>
  );
}
