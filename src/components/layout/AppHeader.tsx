"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";

import {
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Menu,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";

import {
  applyLanguageToDocument,
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

  const [language, setLanguage] =
    useState<LanguageCode>(() => {
      try {
        return getLanguageFromStorage();
      } catch {
        return "en" as LanguageCode;
      }
    });

  const languageRef =
    useRef<HTMLDivElement>(null);

  const { data: session, status } =
    useSession();

  const isSignedIn =
    status === "authenticated" &&
    Boolean(session?.user);

  const selectedLanguage =
    getLanguageOption(language) ||
    languageOptions[0];

  const suggestedLanguages =
    useMemo(
      () => getSuggestedLanguages(),
      []
    );

  const t = useMemo(
    () => getUiTranslations(language),
    [language]
  );

  const navItems = useMemo(
    () => [
      {
        href: "/flights/results",
        label: t.flights,
      },
      {
        href: "/hotels/results",
        label: t.hotels,
      },
      {
        href: "/deals",
        label: t.deals,
      },
      {
        href: "/hotels/tokyo",
        label: t.destinations,
      },
      {
        href: "/guides",
        label: t.explore,
      },
      {
        href: "/support",
        label: t.support,
      },
    ],
    [t]
  );

  useEffect(() => {
    applyLanguageToDocument(language);
  }, [language]);

  useEffect(() => {
    const onChange = () => {
      setLanguage(
        getLanguageFromStorage()
      );
    };

    window.addEventListener(
      LANGUAGE_CHANGE_EVENT,
      onChange as EventListener
    );

    return () => {
      window.removeEventListener(
        LANGUAGE_CHANGE_EVENT,
        onChange as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (
      event: MouseEvent
    ) => {
      if (
        !languageRef.current
      ) {
        return;
      }

      if (
        !languageRef.current.contains(
          event.target as Node
        )
      ) {
        setLanguageOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      onClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        onClickOutside
      );
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        setLanguageOpen(false);
        setOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow =
        "";
      return;
    }

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [open]);

  const handleLanguageSelect = (
    code: LanguageCode
  ) => {
    setLanguage(code);
    setLanguageInStorage(code);
    setLanguageOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="page-shell flex h-20 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-extrabold text-slate-950"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6d28d9] text-white">
            <Sparkles size={22} />
          </span>

          Curioticket
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map(
            (item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-bold text-slate-900 hover:bg-violet-50 hover:text-[#6d28d9]"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
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
              className="h-10 gap-2 rounded-full border border-slate-200/80 bg-white px-3.5 shadow-sm"
              aria-haspopup="menu"
              aria-expanded={
                languageOpen
              }
              aria-label="Select language"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm">
                {getFlagEmoji(
                  selectedLanguage.flagCode
                )}
              </span>

              <span className="text-sm font-bold text-slate-900">
                {
                  selectedLanguage.label
                }
              </span>

              <ChevronDown
                size={14}
                className="text-slate-600"
              />
            </Button>

            {languageOpen && (
              <section
                role="menu"
                className="absolute right-0 top-12 z-50 w-[min(92vw,660px)] rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_55px_-24px_rgba(15,23,42,0.4)]"
              >
                <h2 className="text-base font-black text-slate-950">
                  {
                    t.selectLanguage
                  }
                </h2>

                <div className="mt-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {
                      t.suggestedLanguages
                    }
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestedLanguages.map(
                      (
                        option
                      ) => (
                        <LanguageOptionRow
                          key={
                            option.code
                          }
                          option={
                            option
                          }
                          selected={
                            option.code ===
                            language
                          }
                          onSelect={
                            handleLanguageSelect
                          }
                        />
                      )
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {
                      t.allLanguages
                    }
                  </p>

                  <div className="grid max-h-[320px] gap-2 overflow-auto pr-1 sm:grid-cols-2">
                    {languageOptions.map(
                      (
                        option
                      ) => (
                        <LanguageOptionRow
                          key={
                            option.code
                          }
                          option={
                            option
                          }
                          selected={
                            option.code ===
                            language
                          }
                          onSelect={
                            handleLanguageSelect
                          }
                        />
                      )
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          <RegionSelector />

          <LinkButton
            href="/dashboard"
            variant="ghost"
            size="sm"
            className="h-10 w-10 px-0"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </LinkButton>

          {isSignedIn ? (
            <>
              <LinkButton
                href="/dashboard"
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <UserCircle
                  size={22}
                />
                {t.dashboard}
              </LinkButton>

              <Button
                variant="accent"
                size="sm"
                className="gap-2"
                onClick={() =>
                  signOut({
                    callbackUrl:
                      "/",
                  })
                }
              >
                <LogOut
                  size={18}
                />
                {t.logout}
              </Button>
            </>
          ) : (
            <>
              <LinkButton
                href="/auth/signin"
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <UserCircle
                  size={22}
                />
                {t.login}
              </LinkButton>

              <LinkButton
                href="/auth/signup"
                variant="accent"
                size="sm"
              >
                {t.signUp}
              </LinkButton>
            </>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="h-10 w-10 px-0 md:hidden"
          aria-label="Open menu"
          onClick={() =>
            setOpen(true)
          }
        >
          <Menu size={20} />
        </Button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-navy/40 md:hidden"
            onClick={() =>
              setOpen(false)
            }
          />

          <aside className="fixed right-0 top-0 z-50 h-dvh w-[min(86vw,360px)] border-l bg-white p-5 shadow-xl md:hidden">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-navy">
                {t.menu}
              </span>

              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 px-0"
                aria-label="Close menu"
                onClick={() =>
                  setOpen(false)
                }
              >
                <X size={20} />
              </Button>
            </div>

            <nav className="mt-6 grid gap-2">
              {navItems.map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() =>
                      setOpen(false)
                    }
                    className="rounded-md px-3 py-3 text-base font-semibold text-navy hover:bg-surface-muted"
                  >
                    {item.label}
                  </Link>
                )
              )}

              {isSignedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() =>
                      setOpen(false)
                    }
                    className="rounded-md px-3 py-3 text-base font-semibold text-navy hover:bg-surface-muted"
                  >
                    {t.dashboard}
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);

                      signOut({
                        callbackUrl:
                          "/",
                      });
                    }}
                    className="rounded-md bg-teal px-3 py-3 text-left text-base font-semibold text-white"
                  >
                    {t.logout}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    onClick={() =>
                      setOpen(false)
                    }
                    className="rounded-md px-3 py-3 text-base font-semibold text-navy hover:bg-surface-muted"
                  >
                    {t.login}
                  </Link>

                  <Link
                    href="/auth/signup"
                    onClick={() =>
                      setOpen(false)
                    }
                    className="rounded-md bg-teal px-3 py-3 text-base font-semibold text-white"
                  >
                    {t.signUp}
                  </Link>
                </>
              )}
            </nav>
          </aside>
        </>
      )}
    </header>
  );
}

function LanguageOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: (typeof languageOptions)[number];
  selected: boolean;
  onSelect: (
    code: LanguageCode
  ) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onSelect(option.code)
      }
      className={`flex items-center gap-3.5 rounded-xl border border-slate-200/80 px-3.5 py-2.5 text-left transition ${
        selected
          ? "border-[#6d28d9] bg-violet-50"
          : "hover:bg-slate-50/80"
      }`}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-base">
        {getFlagEmoji(
          option.flagCode
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">
          {option.label}
        </p>
      </div>

      {selected && (
        <Check
          size={16}
          className="text-[#6d28d9]"
        />
      )}
    </button>
  );
}