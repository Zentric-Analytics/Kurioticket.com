"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, Globe2, LogOut, Menu, Sparkles, UserCircle, X } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { getLanguageFromStorage, languageOptions, setLanguageInStorage, type LanguageCode } from "@/lib/language";

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
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>(getLanguageFromStorage);
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && Boolean(session?.user);


  useEffect(() => {
    function syncLanguage() {
      setLanguage(getLanguageFromStorage());
    }
    window.addEventListener("curioticket-language-change", syncLanguage as EventListener);
    return () => window.removeEventListener("curioticket-language-change", syncLanguage as EventListener);
  }, []);

  const selectedLanguage = languageOptions.find((item) => item.code === language) || languageOptions[0];

  function selectLanguage(nextLanguage: LanguageCode) {
    setLanguage(nextLanguage);
    setLanguageInStorage(nextLanguage);
    setLanguageOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="page-shell flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-950">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6d28d9] text-white shadow-[0_10px_24px_rgba(109,40,217,0.22)]">
            <Sparkles size={22} />
          </span>
          Curioticket
        </Link>

        <nav className="hidden items-center gap-1.5 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-base font-black text-slate-900 hover:bg-violet-50 hover:text-[#6d28d9]">
              {({ en: item.label, fr: {Flights:"Vols",Hotels:"Hôtels",Deals:"Offres",Destinations:"Destinations",Explore:"Explorer",Support:"Support"}[item.label] || item.label, es: {Flights:"Vuelos",Hotels:"Hoteles",Deals:"Ofertas",Destinations:"Destinos",Explore:"Explorar",Support:"Soporte"}[item.label] || item.label, ar: {Flights:"رحلات",Hotels:"فنادق",Deals:"عروض",Destinations:"وجهات",Explore:"استكشف",Support:"الدعم"}[item.label] || item.label } as const)[language]}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={languageOpen}
              aria-label="Select language"
              onClick={() => setLanguageOpen((value) => !value)}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
            >
              <Globe2 size={16} />
              <span>{`${selectedLanguage.flag} ${selectedLanguage.label}`}</span>
              <ChevronDown size={14} />
            </button>
            {languageOpen ? (
              <div className="absolute right-0 top-12 z-50 min-w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg" role="menu" aria-label="Language options">
                {languageOptions.map((item) => (
                  <button
                    key={`${item.flag} ${item.label}`}
                    type="button"
                    role="menuitemradio"
                    aria-checked={language === item.code}
                    onClick={() => selectLanguage(item.code)}
                    className="w-full rounded px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    {`${item.flag} ${item.label}`}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
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
              <Link href="/auth/signin" className="focus-ring inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-semibold text-navy transition hover:bg-surface-muted">
                {({ en: "Login", fr: "Connexion", es: "Iniciar sesión", ar: "تسجيل الدخول" } as const)[language]}
              </Link>
              <LinkButton href="/auth/signup" variant="accent" size="sm" className="bg-[#5b21d6] hover:bg-[#4c1d95]">
                {({ en: "Sign Up", fr: "Inscription", es: "Regístrate", ar: "إنشاء حساب" } as const)[language]}
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
                  className="rounded-md px-3 py-3 text-lg font-bold text-navy hover:bg-surface-muted"
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
                  <Link href="/auth/signup" onClick={() => setOpen(false)} className="rounded-md bg-[#5b21d6] px-3 py-3 text-base font-semibold text-white hover:bg-[#4c1d95]">
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
