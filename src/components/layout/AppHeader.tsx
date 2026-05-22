"use client";

import Link from "next/link";
import { useState } from "react";
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
import { Button, LinkButton } from "@/components/ui/Button";

const navItems = [
  { href: "/flights/results", label: "Flights" },
  { href: "/hotels/results", label: "Hotels" },
  { href: "/deals", label: "Deals" },
  { href: "/hotels/tokyo", label: "Destinations" },
  { href: "/guides", label: "Explore" },
  { href: "/support", label: "Support" },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);

  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "EN";

    return (
      window.localStorage.getItem("ct_language")?.toUpperCase() || "EN"
    );
  });

  const { data: session, status } = useSession();

  const isSignedIn =
    status === "authenticated" && Boolean(session?.user);

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    window.localStorage.setItem("ct_language", value);
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
          <div className="relative">
            <Globe2
              size={18}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700"
            />

            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-700"
            />

            <select
              value={language}
              onChange={(event) =>
                handleLanguageChange(event.target.value)
              }
              aria-label="Select language"
              className="focus-ring h-10 rounded-md border border-transparent bg-transparent pl-8 pr-7 text-sm font-bold text-slate-900"
            >
              <option value="EN">EN</option>
              <option value="FR">FR</option>
              <option value="ES">ES</option>
            </select>
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
                <UserCircle size={22} />
                Dashboard
              </LinkButton>

              <Button
                variant="accent"
                size="sm"
                className="gap-2"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut size={18} />
                Logout
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
                <UserCircle size={22} />
                Login
              </LinkButton>

              <LinkButton
                href="/auth/signup"
                variant="accent"
                size="sm"
              >
                Sign Up
              </LinkButton>
            </>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="h-10 w-10 px-0 md:hidden"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </Button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-navy/40 md:hidden"
            onClick={() => setOpen(false)}
          />

          <aside className="fixed right-0 top-0 z-50 h-dvh w-[min(86vw,360px)] border-l bg-white p-5 shadow-xl md:hidden">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-navy">
                Menu
              </span>

              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 px-0"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </Button>
            </div>

            <nav className="mt-6 grid gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-base font-semibold text-navy hover:bg-surface-muted"
                >
                  {item.label}
                </Link>
              ))}

              {isSignedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-semibold text-navy hover:bg-surface-muted"
                  >
                    Dashboard
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="rounded-md bg-teal px-3 py-3 text-left text-base font-semibold text-white"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-semibold text-navy hover:bg-surface-muted"
                  >
                    Login
                  </Link>

                  <Link
                    href="/auth/signup"
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-teal px-3 py-3 text-base font-semibold text-white"
                  >
                    Sign Up
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