"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
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

import {
  applyLanguageToDocument,
  getDefaultLanguage,
  getLanguageFromStorage,
  getLanguageOption,
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
  const [languageQuery, setLanguageQuery] = useState("");
  const [language, setLanguage] = useState<LanguageCode>(getDefaultLanguage());

  const languageRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isSignedIn = status === "authenticated" && Boolean(session?.user);
  const selectedLanguage = getLanguageOption(language) || languageOptions[0];
  const t = useMemo(() => getUiTranslations(language), [language]);

  const filteredLanguages = useMemo(() => {
    const q = languageQuery.trim().toLowerCase();
    if (!q) return languageOptions;
    return languageOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.code.toLowerCase().includes(q)
    );
  }, [languageQuery]);

  const navItems = useMemo(
    () => [
      { href: "/flights/results", label: t.flights },
      { href: "/hotels/results", label: t.hotels },
      { href: "/deals", label: t.deals },
      { href: "/hotels/tokyo", label: t.destinations },
      { href: "/guides", label: t.explore },
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
    setLanguageQuery("");
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">

        {/* TOP ROW */}
        <div className="page-shell flex min-h-[96px] items-center justify-between gap-6 py-4">
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
                onClick={() => setLanguageOpen((v) => !v)}
                className="h-11 rounded-full border px-4"
              >
                {selectedLanguage.label}
                <ChevronDown size={14} />
              </Button>

              {languageOpen && (
                <section className="absolute right-0 top-14 z-50 w-[320px] rounded-xl border bg-white p-4 shadow-xl">
                  <input
                    value={languageQuery}
                    onChange={(e) => setLanguageQuery(e.target.value)}
                    placeholder="Search language"
                    className="w-full border-b pb-2 mb-3 outline-none"
                  />

                  {filteredLanguages.map((option) => (
                    <button
                      key={option.code}
                      onClick={() => handleLanguageSelect(option.code as LanguageCode)}
                      className="flex w-full justify-between py-2 text-left"
                    >
                      {option.label}
                      {option.code === language && <Check size={16} />}
                    </button>
                  ))}
                </section>
              )}
            </div>

            <RegionSelector />

            {isSignedIn ? (
              <>
                <Button variant="ghost" className="h-10 w-10 p-0">
                  <Bell size={18} />
                </Button>

                <Button variant="ghost" className="flex items-center gap-2">
                  <UserCircle size={18} />
                  {session?.user?.name}
                </Button>

                <Button onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut size={16} />
                </Button>
              </>
            ) : (
              <>
                <LinkButton href="/auth/signin">Login</LinkButton>
                <LinkButton href="/auth/signup">Sign up</LinkButton>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setOpen(!open)}>
            <Menu size={20} />
          </button>
        </div>

        {/* SECOND ROW */}
        <div className="hidden border-t md:block">
          <nav className="page-shell flex gap-4 py-3">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg ${
                    active ? "bg-violet-100 text-violet-700" : "hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* MOBILE MENU */}
      {open && (
        <div className="fixed inset-0 bg-white z-50 p-4 md:hidden">
          <button onClick={() => setOpen(false)}>
            <X size={20} />
          </button>

          <nav className="mt-6 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}

            {!isSignedIn && (
              <>
                <Link href="/auth/signin">Login</Link>
                <Link href="/auth/signup">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}