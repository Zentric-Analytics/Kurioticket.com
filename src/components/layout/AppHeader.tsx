"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";

import {
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { CountryCurrencySelector } from "@/components/region/CountryCurrencySelector";
import { Button, LinkButton } from "@/components/ui/Button";
import { reloadAfterPreferenceChange } from "@/lib/preferences/reloadPreferences";

export function AppHeader() {
  const pathname = usePathname();

  const { data: session } = useSession();

  const isSignedIn = Boolean(session?.user);

  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageQuery, setLanguageQuery] = useState("");

  const { locale, setLocale, t, locales } = useLocale();

  const languageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!languageRef.current) {
        return;
      }

      if (!languageRef.current.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLanguageOpen(false);
        setOpen(false);
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
    () => locales.find((option) => option.code === locale) ?? locales[0],
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
      { href: "/flights/results", label: t.flights },
      { href: "/hotels/results", label: t.hotels },
      { href: "/deals", label: t.deals },
      { href: "/destinations", label: t.destinations },
      { href: "/explore", label: t.explore },

      ...(isSignedIn
        ? [
            { href: "/pricing", label: t.premium },
            { href: "/dashboard", label: t.dashboard },
          ]
        : []),
    ],
    [isSignedIn, t]
  );

  const renderFlag = (
    countryCode: string | undefined,
    fallbackText: string | undefined
  ) => (
    <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
      {countryCode ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`}
          alt={fallbackText ?? "Flag"}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";

            const fallback =
              event.currentTarget.nextElementSibling as HTMLElement | null;

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

  const handleLanguageSelect = (
    code: (typeof locales)[number]["code"]
  ) => {
    setLocale(code);

    setLanguageOpen(false);

    setLanguageQuery("");

    reloadAfterPreferenceChange();
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="page-shell flex min-h-[104px] items-center justify-between gap-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-3 text-2xl font-extrabold text-slate-950"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6d28d9] text-white">
              <Sparkles size={24} />
            </span>

            Curioticket
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <CountryCurrencySelector />

            <div className="relative" ref={languageRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguageOpen((value) => !value)}
                className="h-12 gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm"
                aria-haspopup="menu"
                aria-expanded={languageOpen}
                aria-label={t.selectLanguage}
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

              {languageOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-slate-900/45"
                    onClick={() => setLanguageOpen(false)}
                  />

                  <section
                    role="menu"
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
                          setLanguageQuery(event.target.value)
                        }
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
                            onClick={() =>
                              handleLanguageSelect(option.code)
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

                              <span>{option.label}</span>
                            </span>

                            <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                              <span>{option.code}</span>

                              {active ? (
                                <Check
                                  size={16}
                                  className="text-violet-600"
                                />
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

            {isSignedIn ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 rounded-full p-0"
                  aria-label={t.notifications}
                >
                  <Bell size={18} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 gap-2 rounded-full border border-slate-200 px-4 text-base"
                >
                  <UserCircle size={17} />

                  <span className="font-semibold">
                    {session?.user?.name || t.dashboard}
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="h-11 gap-2 rounded-full px-4 text-base"
                >
                  <LogOut size={16} />

                  {t.logout}
                </Button>
              </>
            ) : (
              <>
                <LinkButton
                  href="/auth/signin"
                  variant="ghost"
                  size="sm"
                  className="h-12 rounded-full px-5 text-base font-semibold"
                >
                  {t.login}
                </LinkButton>

                <LinkButton
                  href="/auth/signup"
                  size="sm"
                  className="h-12 rounded-full px-6 text-base font-semibold"
                >
                  {t.signUp}
                </LinkButton>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 md:hidden"
            aria-label={t.menu}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="hidden md:block">
          <nav className="page-shell flex items-center gap-3 pb-4">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-5 py-2.5 text-[1.02rem] font-semibold transition-colors ${
                    isActive
                      ? "bg-indigo-100/90 text-indigo-800"
                      : "text-slate-900 hover:bg-violet-50 hover:text-[#6d28d9]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-x-0 top-[104px] z-30 bg-white/95 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.12)] backdrop-blur-md md:hidden">
          <div className="mb-4 flex items-center gap-2">
            <CountryCurrencySelector />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguageOpen((value) => !value)}
              className="h-11 gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm"
            >
              {renderFlag(
                selectedLanguage?.countryCode,
                selectedLanguage?.fallbackText
              )}

              <span className="text-sm font-semibold">
                {selectedLanguage?.label}
              </span>
            </Button>
          </div>

          <nav className="grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-violet-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {!isSignedIn ? (
              <div className="mt-2 grid gap-2">
                <LinkButton
                  href="/auth/signin"
                  variant="ghost"
                  size="sm"
                  className="h-11 rounded-xl px-4 font-semibold"
                  onClick={() => setOpen(false)}
                >
                  {t.login}
                </LinkButton>

                <LinkButton
                  href="/auth/signup"
                  size="sm"
                  className="h-11 rounded-xl px-4 font-semibold"
                  onClick={() => setOpen(false)}
                >
                  {t.signUp}
                </LinkButton>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </>
  );
}