"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Bell, ChevronDown, Globe2, LogOut, Menu, Sparkles, UserCircle, X } from "lucide-react";
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

export function AppHeader({ brandVariant = "default" }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && Boolean(session?.user);
  const isHomepageBrand = brandVariant === "homepage";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="page-shell flex h-20 items-center justify-between gap-4">
        <Link href="/" className={`flex items-center text-slate-950 ${isHomepageBrand ? "shrink-0" : "gap-3 text-xl font-extrabold tracking-tight"}`}>
          {isHomepageBrand ? (
            <Image
              src="/curioticket-logo.png"
              alt="Curioticket"
              width={188}
              height={44}
              priority
              className="h-8 w-auto sm:h-10"
            />
          ) : (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6d28d9] text-white shadow-[0_10px_24px_rgba(109,40,217,0.22)]">
                <Sparkles size={22} />
              </span>
              Curioticket
            </>
          )}
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-bold text-slate-900 hover:bg-violet-50 hover:text-[#6d28d9]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button type="button" className="focus-ring inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-bold text-slate-900">
            <Globe2 size={18} />
            EN
            <ChevronDown size={14} />
          </button>
          <LinkButton href="/dashboard" variant="ghost" size="sm" className="h-10 w-10 px-0" aria-label="Notifications">
            <Bell size={18} />
          </LinkButton>
          {isSignedIn ? (
            <>
              <LinkButton href="/dashboard" variant="ghost" size="sm" className="gap-2">
                <UserCircle size={22} />
                Dashboard
              </LinkButton>
              <Button variant="accent" size="sm" className="gap-2" onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut size={18} />
                Logout
              </Button>
            </>
          ) : (
            <>
              <LinkButton href="/auth/signin" variant="ghost" size="sm" className="gap-2">
                <UserCircle size={22} />
                Login
              </LinkButton>
              <LinkButton href="/auth/signup" variant="accent" size="sm">
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
          <div className="fixed inset-0 z-50 bg-navy/40 md:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed right-0 top-0 z-50 h-dvh w-[min(86vw,360px)] border-l border-border bg-white p-5 shadow-xl md:hidden">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-navy">Menu</span>
              <Button variant="ghost" size="sm" className="h-10 w-10 px-0" aria-label="Close menu" onClick={() => setOpen(false)}>
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
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base font-semibold text-navy hover:bg-surface-muted">
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
                  <Link href="/auth/signin" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base font-semibold text-navy hover:bg-surface-muted">
                    Login
                  </Link>
                  <Link href="/auth/signup" onClick={() => setOpen(false)} className="rounded-md bg-teal px-3 py-3 text-base font-semibold text-white">
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
