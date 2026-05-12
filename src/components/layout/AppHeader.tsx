"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Plane, X } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";

const navItems = [
  { href: "/flights/results", label: "Flights" },
  { href: "/hotels/results", label: "Hotels" },
  { href: "/deals", label: "Deals" },
  { href: "/support", label: "Support" },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-navy">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy text-white">
            <Plane size={18} />
          </span>
          Curioticket
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-navy">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LinkButton href="/auth/signin" variant="ghost" size="sm">
            Login
          </LinkButton>
          <LinkButton href="/auth/signup" variant="accent" size="sm">
            Sign Up
          </LinkButton>
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
              <Link href="/auth/signin" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base font-semibold text-navy hover:bg-surface-muted">
                Login
              </Link>
              <Link href="/auth/signup" onClick={() => setOpen(false)} className="rounded-md bg-teal px-3 py-3 text-base font-semibold text-white">
                Sign Up
              </Link>
            </nav>
          </aside>
        </>
      ) : null}
    </header>
  );
}
