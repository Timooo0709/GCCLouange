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
    <header className="sticky top-0 z-50 w-full h-[58px] border-b border-border/50 bg-background/82 backdrop-saturate-[1.2] backdrop-blur-[14px] print:hidden">
      <div className="max-w-[1080px] mx-auto px-4 h-full flex items-center gap-3.5">
        {/* Brand */}
        <Link href="/songs" className="flex items-center gap-2.5 shrink-0">
          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-white shadow-sm">
            <Image
              src="/logo.png"
              alt="GCC Logo"
              fill
              sizes="36px"
              className="object-contain"
              priority
            />
          </div>
          <span className="font-bold text-[17px] tracking-[-0.3px] text-foreground">
            GCC <span className="text-primary">{isZh ? "敬拜" : "Louange"}</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden sm:flex items-center gap-1 ml-2">
          <Link
            href="/songs"
            className={`px-3 py-[7px] rounded-[9px] text-[13.5px] font-semibold transition-all duration-150 ${
              isActiveSongs
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {t("common.header.songs")}
          </Link>
          <Link
            href="/setlists"
            className={`px-3 py-[7px] rounded-[9px] text-[13.5px] font-semibold transition-all duration-150 ${
              isActiveSetlists
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {t("common.header.setlists")}
          </Link>
        </nav>

        {/* Actions — pushed to far right */}
        <div className="ml-auto flex items-center gap-2">
          {/* Lang toggle */}
          <button
            onClick={toggleLanguage}
            aria-label={isZh ? "Changer en français" : "切换为中文"}
            className="h-[34px] min-w-[34px] px-2 rounded-[9px] border border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-all duration-150 active:scale-[.96] flex items-center justify-center gap-1.5 text-[12.5px] font-semibold cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{isZh ? "中文" : "FR"}</span>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            aria-label={dark ? "Mode clair" : "Mode sombre"}
            className="h-[34px] w-[34px] rounded-[9px] border border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-all duration-150 active:scale-[.96] flex items-center justify-center cursor-pointer"
          >
            {dark ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
          </button>

          {/* Auth */}
          {!authLoading && (
            user ? (
              <button
                onClick={() => logOut()}
                className="h-[34px] min-w-[34px] px-2 rounded-[9px] border border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-all duration-150 active:scale-[.96] flex items-center justify-center gap-1.5 text-[12.5px] font-semibold cursor-pointer"
                title={user.email ?? undefined}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t("common.header.logout")}</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="h-[34px] min-w-[34px] px-2 rounded-[9px] border border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-all duration-150 active:scale-[.96] flex items-center justify-center gap-1.5 text-[12.5px] font-semibold"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t("common.header.login")}</span>
              </Link>
            )
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            className="sm:hidden h-[34px] w-[34px] rounded-[9px] border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150 flex items-center justify-center cursor-pointer"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
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
              <span>{isZh ? "中文" : "Français"}</span>
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
