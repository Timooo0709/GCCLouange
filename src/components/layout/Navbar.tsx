"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Menu, X, Sun, Moon, Globe, LogIn, LogOut, ChevronDown, UserRound, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth, logOut } from "@/lib/firebase/auth";
import { isAdminUser } from "@/lib/access";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useNotifications, type NotificationItem } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NOTIF_KIND_KEYS: Record<NotificationItem["kind"], string> = {
  "annonce": "notifications.annonce",
  "setlist-created": "notifications.setlistCreated",
  "setlist-updated": "notifications.setlistUpdated",
};

export function Navbar() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname() || "";
  const { resolvedTheme, setTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const toggleTheme = () => setTheme(dark ? "light" : "dark");

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { items: notifItems, unreadCount, markAllSeen } = useNotifications();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language;
  const isZh = currentLang === "zh-CN";
  const scrollVisible = useScrollDirection();

  const closeMenu = () => {
    if (!isOpen) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 160);
  };

  // Close mobile menu and dropdown on route change
  useEffect(() => {
    closeMenu();
    setDropdownOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [dropdownOpen]);

  const toggleLanguage = () => {
    const nextLang = currentLang === "zh-CN" ? "fr" : "zh-CN";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("i18nextLng", nextLang);
  };

  const isActiveSongs = pathname.startsWith("/songs");
  const isActiveSetlists = pathname.startsWith("/setlists");
  const isActiveLouange = isActiveSongs || isActiveSetlists;
  const isActivePlanning = pathname.startsWith("/planning");
  const isActiveMesServices = pathname.startsWith("/mes-services");
  const isActiveAnnonces = pathname.startsWith("/annonces");
  const isActiveAdmin = pathname.startsWith("/admin");
  const admin = isAdminUser(user);
  const headerLabel = isActivePlanning ? t("common.header.planning") : t("common.header.louange");

  return (
    <>
      {/* Backdrop derrière le menu mobile */}
      {(isOpen || isClosing) && (
        <div
          className={`fixed top-[var(--nav-h)] inset-x-0 bottom-0 z-40 bg-black/20 sm:hidden ${isClosing ? "animate-out fade-out duration-150" : "animate-in fade-in duration-200"}`}
          onClick={closeMenu}
        />
      )}

      <header className={`fixed top-0 z-50 w-full h-[var(--nav-h)] border-b border-border/50 bg-background/82 backdrop-saturate-[1.2] backdrop-blur-[14px] print:hidden transition-transform duration-300 ${scrollVisible ? "translate-y-0" : "-translate-y-full"}`}>
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
            <span className="font-bold text-[17px] tracking-[-0.3px] text-foreground w-[111px] flex items-center gap-1">
              GCC{" "}
              <span
                key={headerLabel}
                className="text-primary animate-in fade-in duration-150"
              >
                {headerLabel}
              </span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden sm:flex items-center gap-1 ml-2">
            <Link
              href="/planning"
              className={`w-[80px] px-3 py-[7px] rounded-[9px] text-[13.5px] font-semibold transition-all duration-150 ${
                isActivePlanning
                  ? "bg-primary/10 text-primary text-center"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t("common.header.planning")}
            </Link>

            {/* Louange dropdown — hover (souris) + click (tactile) */}
            <div className="relative group" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className={`flex w-[96px] items-center gap-1 px-3 py-[7px] rounded-[9px] text-[13.5px] font-semibold transition-all duration-150 cursor-pointer ${
                  isActiveLouange
                    ? "bg-primary/10 text-primary text-center"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary text-center"
                }`}
              >
                {t("common.header.louange")}
                <ChevronDown
                  className={`h-3 w-3 opacity-60 transition-transform duration-150 ${
                    dropdownOpen ? "rotate-180" : "group-hover:rotate-180"
                  }`}
                />
              </button>
              <div
                className={`absolute left-0 top-full pt-1 z-50 transition-all duration-150 ${
                  dropdownOpen
                    ? "opacity-100 visible translate-y-0"
                    : "opacity-0 invisible -translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0"
                }`}
              >
                <div className="bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                  <Link
                    href="/songs"
                    onClick={() => setDropdownOpen(false)}
                    className={`flex items-center px-3 py-2 text-[13px] font-semibold transition-colors ${
                      isActiveSongs ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {t("common.header.songs")}
                  </Link>
                  <Link
                    href="/setlists"
                    onClick={() => setDropdownOpen(false)}
                    className={`flex items-center px-3 py-2 text-[13px] font-semibold transition-colors ${
                      isActiveSetlists ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {t("common.header.setlists")}
                  </Link>
                </div>
              </div>
            </div>

            {!authLoading && user && (
              <Link
                href="/mes-services"
                className={`px-3 py-[7px] rounded-[9px] text-[13.5px] font-semibold transition-all duration-150 whitespace-nowrap ${
                  isActiveMesServices
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {t("common.header.myServices")}
              </Link>
            )}

            {!authLoading && user && (
              <Link
                href="/annonces"
                className={`relative px-3 py-[7px] rounded-[9px] text-[13.5px] font-semibold transition-all duration-150 whitespace-nowrap ${
                  isActiveAnnonces
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {t("common.header.annonces")}
              </Link>
            )}

            {!authLoading && admin && (
              <Link
                href="/admin"
                className={`px-3 py-[7px] rounded-[9px] text-[13.5px] font-semibold transition-all duration-150 whitespace-nowrap ${
                  isActiveAdmin
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Actions — pushed to far right */}
          <div className="ml-auto flex items-center gap-2">
            {/* Notifications */}
            {!authLoading && user && (
              <DropdownMenu onOpenChange={(open) => { if (open) markAllSeen(); }}>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={t("notifications.title")}
                    className="relative h-[34px] w-[34px] rounded-[9px] border border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-all duration-150 active:scale-[.96] flex items-center justify-center cursor-pointer"
                  >
                    <Bell className="h-[15px] w-[15px]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-w-[90vw]">
                  <DropdownMenuLabel>{t("notifications.title")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-96 overflow-y-auto">
                    {notifItems.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                        {t("notifications.empty")}
                      </p>
                    ) : (
                      notifItems.map((n) => (
                        <DropdownMenuItem key={n.id} asChild>
                          <Link href={n.href} className="flex flex-col items-start gap-0.5">
                            <span className="text-sm font-medium text-foreground truncate w-full">
                              {n.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {t(NOTIF_KIND_KEYS[n.kind])}
                              {" · "}
                              {t("categories." + n.category, { defaultValue: n.category })}
                              {" · "}
                              {new Intl.DateTimeFormat(isZh ? "zh-CN" : "fr-FR", {
                                day: "numeric",
                                month: "short",
                              }).format(n.date)}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
            {!authLoading && user && (
              <Link
                href="/profil"
                title={t("common.header.profile")}
                className={`hidden sm:flex h-[34px] w-[34px] rounded-[9px] border transition-all duration-150 active:scale-[.96] items-center justify-center ${
                  pathname.startsWith("/profil")
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                }`}
              >
                <UserRound className="h-[15px] w-[15px]" />
              </Link>
            )}
            {!authLoading && (
              user ? (
                <button
                  onClick={() => logOut()}
                  className="hidden sm:flex h-[34px] min-w-[34px] px-2 rounded-[9px] border border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-all duration-150 active:scale-[.96] items-center justify-center gap-1.5 text-[12.5px] font-semibold cursor-pointer"
                  title={user.email ?? undefined}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("common.header.logout")}</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:flex h-[34px] min-w-[34px] px-2 rounded-[9px] border border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-all duration-150 active:scale-[.96] items-center justify-center gap-1.5 text-[12.5px] font-semibold"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("common.header.login")}</span>
                </Link>
              )
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => (isOpen ? closeMenu() : setIsOpen(true))}
              aria-label="Toggle menu"
              className="sm:hidden h-[34px] w-[34px] rounded-[9px] border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150 flex items-center justify-center cursor-pointer"
            >
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {(isOpen || isClosing) && (
          <div
            className={`absolute top-14 left-0 right-0 border-b border-border bg-background/95 backdrop-blur-md px-4 py-4 space-y-4 flex flex-col sm:hidden z-50 ${
              isClosing
                ? "animate-out slide-out-to-top-2 duration-150"
                : "animate-in slide-in-from-top-2 duration-200"
            }`}
          >
            <div className="flex flex-col gap-1">
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
              {!authLoading && user && (
                <Link
                  href="/mes-services"
                  className={`pl-5 pr-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActiveMesServices ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {t("common.header.myServices")}
                </Link>
              )}
              {!authLoading && user && (
                <Link
                  href="/annonces"
                  className={`relative flex items-center gap-2 pl-5 pr-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActiveAnnonces ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {t("common.header.annonces")}
                </Link>
              )}
              {!authLoading && admin && (
                <Link
                  href="/admin"
                  className={`pl-5 pr-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActiveAdmin ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Admin
                </Link>
              )}
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

            <div className="px-1 space-y-2">
              {!authLoading && (
                user ? (
                  <>
                    <Link
                      href="/profil"
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-sm font-semibold transition-all duration-200"
                    >
                      <UserRound className="h-4 w-4" />
                      {t("common.header.profile")}
                    </Link>
                    <button
                      onClick={() => logOut()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive text-sm font-semibold transition-all duration-200 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("common.header.logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-sm font-semibold transition-all duration-200"
                    >
                      <LogIn className="h-4 w-4" />
                      {t("common.header.login")}
                    </Link>
                    <Link
                      href="/signup"
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200"
                    >
                      {t("common.header.signup")}
                    </Link>
                  </>
                )
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
