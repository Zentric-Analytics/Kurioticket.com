"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  ChevronDown,
  Globe2,
  LogOut,
  Menu,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";

import { RegionSelector } from "@/components/region/RegionSelector";

import {
  Button,
  LinkButton,
} from "@/components/ui/Button";

import {
  getLanguageFromStorage,
  languageOptions,
  setLanguageInStorage,
  translations,
  type LanguageCode,
} from "@/lib/language";

const navItems = [
  {
    href: "/flights/results",
    label: "Flights",
    key: "flights",
  },
  {
    href: "/hotels/results",
    label: "Hotels",
    key: "hotels",
  },
  {
    href: "/deals",
    label: "Deals",
    key: "deals",
  },
  {
    href: "/hotels/tokyo",
    label: "Destinations",
    key: "destinations",
  },
  {
    href: "/guides",
    label: "Explore",
    key: "explore",
  },
  {
    href: "/support",
    label: "Support",
    key: "support",
  },
] as const;

export function AppHeader() {
  const [open, setOpen] =
    useState(false);

  const [
    languageOpen,
    setLanguageOpen,
  ] = useState(false);

  const [language, setLanguage] =
    useState<LanguageCode>(
      "en",
    );

  const dropdownRef =
    useRef<HTMLDivElement>(
      null,
    );

  const {
    data: session,
    status,
  } = useSession();

  const isSignedIn =
    status ===
      "authenticated" &&
    Boolean(session?.user);

  const selectedLanguage =
    languageOptions.find(
      (item) =>
        item.code ===
        language,
    ) ||
    languageOptions[0];

  const t =
    translations[
      language
    ];

  useEffect(() => {
    setLanguage(
      getLanguageFromStorage(),
    );

    function syncLanguage() {
      setLanguage(
        getLanguageFromStorage(),
      );
    }

    window.addEventListener(
      "curioticket-language-change",
      syncLanguage as EventListener,
    );

    return () =>
      window.removeEventListener(
        "curioticket-language-change",
        syncLanguage as EventListener,
      );
  }, []);

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setLanguageOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, []);

  function selectLanguage(
    nextLanguage: LanguageCode,
  ) {
    setLanguage(
      nextLanguage,
    );

    setLanguageInStorage(
      nextLanguage,
    );

    setLanguageOpen(
      false,
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="page-shell flex h-20 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-950"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6d28d9] text-white shadow-[0_10px_24px_rgba(109,40,217,0.22)]">
              <Sparkles
                size={22}
              />
            </span>

            Curioticket
          </Link>

          <nav className="hidden items-center gap-1.5 lg:flex">
            {navItems.map(
              (item) => (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className="rounded-md px-3 py-2 text-base font-black text-slate-900 hover:bg-violet-50 hover:text-[#6d28d9]"
                >
                  {t[
                    item.key
                  ] ||
                    item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <RegionSelector />

            <div
              className="relative"
              ref={
                dropdownRef
              }
            >
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={
                  languageOpen
                }
                aria-label="Select language"
                onClick={() =>
                  setLanguageOpen(
                    (
                      value,
                    ) =>
                      !value,
                  )
                }
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
              >
                <Globe2
                  size={16}
                />

                <span>
                  {
                    selectedLanguage.flag
                  }{" "}
                  {
                    selectedLanguage.label
                  }
                </span>

                <ChevronDown
                  size={14}
                />
              </button>

              {languageOpen ? (
                <div
                  className="absolute right-0 top-12 z-50 min-w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
                  role="menu"
                  aria-label="Language options"
                >
                  {languageOptions.map(
                    (
                      item,
                    ) => (
                      <button
                        key={
                          item.code
                        }
                        type="button"
                        role="menuitemradio"
                        aria-checked={
                          language ===
                          item.code
                        }
                        onClick={() =>
                          selectLanguage(
                            item.code,
                          )
                        }
                        className="w-full rounded px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        {
                          item.flag
                        }{" "}
                        {
                          item.label
                        }
                      </button>
                    ),
                  )}
                </div>
              ) : null}
            </div>

            <LinkButton
              href="/dashboard"
              variant="ghost"
              size="sm"
              className="h-10 w-10 px-0"
              aria-label="Notifications"
            >
              <Bell
                size={18}
              />
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
                  Dashboard
                </LinkButton>

                <Button
                  variant="accent"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    signOut(
                      {
                        callbackUrl:
                          "/",
                      },
                    )
                  }
                >
                  <LogOut
                    size={18}
                  />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="focus-ring inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-semibold text-navy transition hover:bg-surface-muted"
                >
                  {t.login}
                </Link>

                <LinkButton
                  href="/auth/signup"
                  variant="accent"
                  size="sm"
                  className="bg-[#6d28d9] hover:bg-[#5b21b6]"
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
              setOpen(
                true,
              )
            }
          >
            <Menu
              size={20}
            />
          </Button>
        </div>
      </header>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() =>
              setOpen(
                false,
              )
            }
          />

          <aside className="fixed right-0 top-0 z-50 flex h-full w-[320px] flex-col bg-white shadow-xl md:hidden">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <span className="text-lg font-black text-slate-950">
                Menu
              </span>

              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 px-0"
                onClick={() =>
                  setOpen(
                    false,
                  )
                }
              >
                <X
                  size={20}
                />
              </Button>
            </div>

            <nav className="flex flex-col p-4">
              {navItems.map(
                (item) => (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    onClick={() =>
                      setOpen(
                        false,
                      )
                    }
                    className="rounded-lg px-4 py-3 text-base font-bold text-slate-900 hover:bg-slate-100"
                  >
                    {t[
                      item.key
                    ] ||
                      item.label}
                  </Link>
                ),
              )}
            </nav>
          </aside>
        </>
      ) : null}
    </>
  );
}