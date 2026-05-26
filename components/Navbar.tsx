"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Menu, X, Sun, Moon, Globe, LogIn, LogOut, Music } from "lucide-react";
import { useDarkMode } from "@/lib/useDarkMode";
import { useAuth, logOut } from "@/lib/firebase/auth";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname() || "";
  const { dark, toggle: toggleTheme } = useDarkMode();
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = i18n.language;
  const isZh = currentLang === "zh-CN";

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const toggleLanguage = () => {
    const nextLang = currentLang === "zh-CN" ? "fr" : "zh-CN";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("i18nextLng", nextLang);
  };

  const isActiveSongs = pathname.startsWith("/songs");
  const isActiveSetlists = pathname.startsWith("/setlists");

  return (
    <header className="sticky top-0 z-50 w-full h-14 border-b border-border/40 bg-background/80 backdrop-blur-md print:hidden transition-colors duration-200">
      <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/songs" className="flex items-center gap-2 group">
          <div className="relative h-8 w-8 rounded-full overflow-hidden shadow-sm shadow-orange-500/10 group-hover:scale-105 transition-transform duration-200 bg-white">
            <Image
              src="/logo.png"
              alt="GCC Logo"
              fill
              sizes="32px"
              className="object-contain"
              priority
            />
          </div>
          <span className="font-bold tracking-tight text-lg text-foreground group-hover:text-primary transition-colors duration-200">
            {t("common.header.title")}
          </span>
        </Link>

        {/* Desktop Navigation & Actions */}
        <div className="hidden sm:flex items-center gap-4">
          <nav className="flex items-center gap-1">
            <Link
              href="/songs"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActiveSongs
                  ? "bg-primary/10 text-primary dark:bg-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t("common.header.songs")}
            </Link>
            <Link
              href="/setlists"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActiveSetlists
                  ? "bg-primary/10 text-primary dark:bg-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t("common.header.setlists")}
            </Link>
          </nav>

          <div className="h-4 w-px bg-border/60" />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Lang toggle */}
            <button
              onClick={toggleLanguage}
              aria-label={isZh ? "Changer en français" : "切换为中文"}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{isZh ? "FR" : "中文"}</span>
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              aria-label={dark ? "Mode clair" : "Mode sombre"}
              className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95 cursor-pointer"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            {/* Auth button */}
            {!authLoading && (
              user ? (
                <button
                  onClick={() => logOut()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-muted-foreground transition-all duration-200 active:scale-95 text-xs font-semibold cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("common.header.logout")}</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95 text-xs font-semibold"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("common.header.login")}</span>
                </Link>
              )
            )}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
          className="sm:hidden p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="absolute top-14 left-0 right-0 border-b border-border bg-background/95 backdrop-blur-md px-4 py-4 space-y-4 flex flex-col sm:hidden animate-in slide-in-from-top-2 duration-200 z-50">
          <div className="flex flex-col gap-1">
            <Link
              href="/songs"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActiveSongs
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t("common.header.songs")}
            </Link>
            <Link
              href="/setlists"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActiveSetlists
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t("common.header.setlists")}
            </Link>
          </div>

          <hr className="border-border/50" />

          {/* Mobile settings row */}
          <div className="flex items-center justify-between px-3">
            <span className="text-xs text-muted-foreground font-medium">Language / 语言</span>
            <button
              onClick={toggleLanguage}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center gap-1 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{isZh ? "Français" : "中文"}</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-3">
            <span className="text-xs text-muted-foreground font-medium">Theme / 主题</span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>

          <hr className="border-border/50" />

          {/* Mobile Auth Button */}
          <div className="px-1">
            {!authLoading && (
              user ? (
                <button
                  onClick={() => logOut()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive text-sm font-semibold transition-all duration-200 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  {t("common.header.logout")}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-sm font-semibold transition-all duration-200"
                >
                  <LogIn className="h-4 w-4" />
                  {t("common.header.login")}
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
