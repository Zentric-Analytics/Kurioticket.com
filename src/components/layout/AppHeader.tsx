"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  ChevronDown,
  Globe2,
  LogOut,
  Menu,
  UserCircle,
  X,
} from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";

type AppHeaderProps = {
  brandVariant?: "default" | "homepage";
};

const navItems = [
  { href: "/flights/results", label: "Flights" },
  { href: "/hotels/results", label: "Hotels" },
  { href: "/deals", label: "Deals" },
  { href: "/hotels/tokyo", label: "Destinations" },
  { href: "/guides", label: "Explore" },
  { href: "/support", label: "Support" },
];

export function AppHeader({
  brandVariant = "default",
}: AppHeaderProps) {
  void brandVariant;

  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  const isSignedIn =
    status === "authenticated" &&
    Boolean(session?.user);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="page-shell flex h-20 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center self-center"
          aria-label="Curioticket home"
        >
          <Image
            src="/curioticket-brand.svg"
            alt="Curioticket"
            width={720}
            height={160}
            className="h-11 w-auto sm:h-14"
            priority
          />
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
          <button
            type="button"
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-bold text-slate-900"
          >
            <Globe2 size={18} />
            EN
            <ChevronDown size={14} />
          </button>

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
                onClick={() =>
                  signOut({ callbackUrl: "/" })
                }
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

      {open ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-navy/40 md:hidden"
            onClick={() => setOpen(false)}
          />

          <aside className="fixed right-0 top-0 z-50 h-dvh w-[min(86vw,360px)] border-l border-border bg-white p-5 shadow-xl md:hidden">
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
      ) : null}
    </header>
  );
}