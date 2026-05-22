"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { signOut, useSession } from "next-auth/react";
import { Bell, Check, ChevronDown, LogOut, Menu, Sparkles, UserCircle, X } from "lucide-react";

import {
  applyLanguageToDocument,
  getDefaultLanguage,
  getFlagEmoji,
  getLanguageFromStorage,
  getLanguageOption,
  getSuggestedLanguages,
  getUiTranslations,
  LANGUAGE_CHANGE_EVENT,
  languageOptions,
  setLanguageInStorage,
  type LanguageCode,
} from "@/lib/language";
import { RegionSelector } from "@/components/region/RegionSelector";
import { Button, LinkButton } from "@/components/ui/Button";

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>(getDefaultLanguage());
  const languageRef = useRef<HTMLDivElement>(null);

  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && Boolean(session?.user);

  const selectedLanguage = getLanguageOption(language) || languageOptions[0];
  const suggestedLanguages = useMemo(() => getSuggestedLanguages(), []);
  const t = useMemo(() => getUiTranslations(language), [language]);

  const navItems = useMemo(
    () => [
      { href: "/flights/results", label: t.flights },
      { href: "/hotels/results", label: t.hotels },
      { href: "/deals", label: t.deals },
      { href: "/hotels/tokyo", label: t.destinations },
      { href: "/guides", label: t.explore },
      { href: "/support", label: t.support },
    ],
    [t]
  );

  useEffect(() => {
    applyLanguageToDocument(language);
  }, [language]);

  useEffect(() => {
    const syncLanguage = () => setLanguage(getLanguageFromStorage());
    syncLanguage();

    window.addEventListener(LANGUAGE_CHANGE_EVENT, syncLanguage as EventListener);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, syncLanguage as EventListener);
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLanguageOpen(false);
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleLanguageSelect = (code: LanguageCode) => {
    setLanguage(code);
    setLanguageInStorage(code);
    setLanguageOpen(false);
  };

  const handleMobileNavKey = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((value) => !value);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="page-shell flex h-20 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 text-xl font-extrabold text-slate-950">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6d28d9] text-white">
              <Sparkles size={22} />
            </span>
            Curioticket
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-bold text-slate-900 hover:bg-violet-50 hover:text-[#6d28d9]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <div className="relative" ref={languageRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguageOpen((value) => !value)}
                className="h-10 gap-2 rounded-full border border-slate-200/80 bg-white px-3.5 shadow-sm"
                aria-haspopup="menu"
                aria-expanded={languageOpen}
                aria-label="Select language"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm">
                  {getFlagEmoji(selectedLanguage.flagCode)}
                </span>
                <span className="text-sm font-bold text-slate-900">{selectedLanguage.label}</span>
                <ChevronDown size={14} className="text-slate-600" />
              </Button>

              {languageOpen && (
                <section
                  role="menu"
                  className="absolute right-0 top-12 z-50 w-[min(92vw,660px)] rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_55px_-24px_rgba(15,23,42,0.4)]"
                >
                  <h2 className="text-base font-black text-slate-950">{t.selectLanguage}</h2>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{t.suggestedLanguages}</p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {suggestedLanguages.map((option) => {
                      const active = option.code === language;
                      return (
                        <button
                          type="button"
                          key={option.code}
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => handleLanguageSelect(option.code as LanguageCode)}
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left hover:border-violet-300 hover:bg-violet-50"
                        >
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <span>{getFlagEmoji(option.flagCode)}</span>
                            {option.label}
                          </span>
                          {active ? <Check size={16} className="text-violet-600" /> : null}
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
                <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full p-0" aria-label="Notifications">
                  <Bell size={18} />
                </Button>
                <Button variant="ghost" size="sm" className="h-10 gap-2 rounded-full border border-slate-200 px-3">
                  <UserCircle size={17} />
                  <span className="font-semibold">{session?.user?.name || t.dashboard}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })} className="h-10 gap-2 rounded-full px-3">
                  <LogOut size={16} />
                  {t.logout}
                </Button>
              </>
            ) : (
              <>
                <LinkButton href="/auth/login" variant="ghost" size="sm" className="h-10 rounded-full px-4 font-semibold">
                  {t.login}
                </LinkButton>
                <LinkButton href="/auth/register" size="sm" className="h-10 rounded-full px-4 font-semibold">
                  {t.signUp}
                </LinkButton>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 md:hidden"
            aria-label={t.menu}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            onKeyDown={handleMobileNavKey}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-x-0 top-20 z-30 border-b border-slate-200 bg-white p-4 shadow-lg md:hidden">
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
          </nav>
        </div>
      )}
    </>
  );
}
