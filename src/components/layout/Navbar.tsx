"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Menu, X, Sun, Moon, Globe, LogIn, LogOut, ChevronDown } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useAuth, logOut } from "@/lib/firebase/auth";
import { useScrollDirection } from "@/hooks/useScrollDirection";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname() || "";
  const { dark, toggle: toggleTheme } = useDarkMode();
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = i18n.language;
  const isZh = currentLang === "zh-CN";
  const scrollVisible = useScrollDirection();
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
  const isActiveLouange = isActiveSongs || isActiveSetlists;
  const isActivePlanning = pathname.startsWith("/planning");

  return (
    <header className={`fixed top-0 z-50 w-full h-[58px] border-b border-border/50 bg-background/82 backdrop-saturate-[1.2] backdrop-blur-[14px] print:hidden transition-transform duration-300 ${scrollVisible ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="max-w-[1080px] mx-auto px-4 h-full flex items-center gap-3.5">
        {/* Brand */}
        <Link href="/planning" className="flex items-center gap-2.5 shrink-0">
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
            GCC <span className="text-primary">{isActivePlanning ? "Planning" : isZh ? "敬拜" : "Louange"}</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden sm:flex items-center gap-1 ml-2">
          <Link
            href="/planning"
            className={`px-3 py-[7px] rounded-[9px] text-[13.5px] font-semibold transition-all duration-150 ${
              isActivePlanning
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Planning
          </Link>

          {/* Louange dropdown */}
          <div className="relative group">
            <button className={`flex items-center gap-1 px-3 py-[7px] rounded-[9px] text-[13.5px] font-semibold transition-all duration-150 cursor-pointer ${
              isActiveLouange
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
              Louange
              <ChevronDown className="h-3 w-3 opacity-60 group-hover:rotate-180 transition-transform duration-150" />
            </button>
            <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50">
              <div className="bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                <Link
                  href="/songs"
                  className={`flex items-center px-3 py-2 text-[13px] font-semibold transition-colors ${
                    isActiveSongs ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {t("common.header.songs")}
                </Link>
                <Link
                  href="/setlists"
                  className={`flex items-center px-3 py-2 text-[13px] font-semibold transition-colors ${
                    isActiveSetlists ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {t("common.header.setlists")}
                </Link>
              </div>
            </div>
          </div>
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
            {/* Planning */}
            <span className="px-3 pt-1 pb-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Planning
            </span>
            <Link
              href="/planning"
              className={`pl-5 pr-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActivePlanning ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Planning
            </Link>
            {/* Louange section */}
            <span className="px-3 pt-2 pb-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Louange
            </span>
            <Link
              href="/songs"
              className={`pl-5 pr-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActiveSongs ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t("common.header.songs")}
            </Link>
            <Link
              href="/setlists"
              className={`pl-5 pr-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActiveSetlists ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
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