"use client";

import { useTranslation } from "react-i18next";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";

interface HeaderProps {
  activeTab: "songs" | "setlists" | "none";
}

export function Header({ activeTab }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="border-b border-border px-4 py-4 flex items-center gap-4">
      <a href="/songs" className="text-xl font-bold text-foreground hover:opacity-90 transition-opacity">
        {t("common.header.title")}
      </a>
      <nav className="flex gap-1">
        <a
          href="/songs"
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "songs"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {t("common.header.songs")}
        </a>
        <a
          href="/setlists"
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "setlists"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {t("common.header.setlists")}
        </a>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <LanguageToggle />
        <DarkModeToggle />
      </div>
    </header>
  );
}
export default Header;
