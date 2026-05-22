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
import { RegionSelector } from "@/components/region/RegionSelector";
import { Button, LinkButton } from "@/components/ui/Button";

export function AppHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user);

  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const { locale, setLocale, t, locales } = useLocale();
  const [languageQuery, setLanguageQuery] = useState("");
  const languageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!languageRef.current) return;
      if (!languageRef.current.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  const selectedLanguage = useMemo(
    () => locales.find((option) => option.code === locale) ?? locales[0],
    [locale, locales]
  );

  const filteredLanguages = useMemo(() => {
    const query = languageQuery.trim().toLowerCase();
    if (!query) return locales;

    return locales.filter(
      (option) => option.label.toLowerCase().includes(query) || option.code.toLowerCase().includes(query)
    );
  }, [languageQuery, locales]);

  const navItems = useMemo(
    () => [
      { href: "/flights/results", label: t.flights },
      { href: "/hotels/results", label: t.hotels },
      { href: "/pricing", label: t.premium },
      { href: "/support", label: t.support },
      { href: "/dashboard", label: t.dashboard },
    ],
    [t]
  );

  const handleLanguageSelect = (code: (typeof locales)[number]["code"]) => {
    setLocale(code);
    setLanguageOpen(false);
    setLanguageQuery("");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="page-shell flex min-h-[104px] items-center justify-between gap-6 py-5">
        <Link href="/" className="flex items-center gap-3 text-2xl font-extrabold text-slate-950">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6d28d9] text-white">
            <Sparkles size={24} />
          </span>
          Curioticket
        </Link>

        <div className="hidden items-center gap-4 md:flex">
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
              <span className="text-sm font-semibold text-slate-900">
                {selectedLanguage.flag} {selectedLanguage.label} ({selectedLanguage.code})
              </span>
              <ChevronDown size={14} className="text-slate-600" />
            </Button>

            {languageOpen && (
              <section
                role="menu"
                className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-auto rounded-t-3xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_55px_-24px_rgba(15,23,42,0.4)] md:absolute md:inset-auto md:right-0 md:top-14 md:max-h-[70vh] md:w-[min(92vw,720px)] md:rounded-2xl"
              >
                <h2 className="text-base font-black text-slate-950">{t.selectLanguage}</h2>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <Search size={16} className="text-slate-500" />
                  <input
                    value={languageQuery}
                    onChange={(e) => setLanguageQuery(e.target.value)}
                    placeholder={t.searchLanguage}
                    className="w-full border-0 bg-transparent text-sm outline-none"
                  />
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {filteredLanguages.map((option) => {
                    const active = option.code === locale;
                    return (
                      <button
                        type="button"
                        key={option.code}
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => handleLanguageSelect(option.code)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left ${
                          active
                            ? "border-violet-300 bg-violet-50"
                            : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <span>{option.flag}</span>
                          <span>{option.label}</span>
                        </span>
                        <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                          <span>{option.code}</span>
                          {active ? <Check size={16} className="text-violet-600" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <RegionSelector />

          {isSignedIn ? (
            <>
              <Button variant="ghost" size="sm" className="h-11 w-11 rounded-full p-0" aria-label={t.notifications}>
                <Bell size={18} />
              </Button>
              <Button variant="ghost" size="sm" className="h-11 gap-2 rounded-full border border-slate-200 px-4 text-base">
                <UserCircle size={17} />
                <span className="font-semibold">{session?.user?.name || t.dashboard}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })} className="h-11 gap-2 rounded-full px-4 text-base">
                <LogOut size={16} />
                {t.logout}
              </Button>
            </>
          ) : (
            <>
              <LinkButton href="/auth/login" variant="ghost" size="sm" className="h-12 rounded-full px-5 text-base font-semibold">
                {t.login}
              </LinkButton>
              <LinkButton href="/auth/register" size="sm" className="h-12 rounded-full px-6 text-base font-semibold">
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
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-5 py-2.5 text-[1.02rem] font-semibold transition-colors ${
                  isActive ? "bg-indigo-100/90 text-indigo-800" : "text-slate-900 hover:bg-violet-50 hover:text-[#6d28d9]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
