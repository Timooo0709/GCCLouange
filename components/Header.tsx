"use client";

import { useTranslation } from "react-i18next";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Music, List } from "lucide-react";

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
          aria-label={t("common.header.songs")}
          className={`p-2 rounded transition-colors ${
            activeTab === "songs"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Music className="h-5 w-5" />
        </a>
        <a
          href="/setlists"
          aria-label={t("common.header.setlists")}
          className={`p-2 rounded transition-colors ${
            activeTab === "setlists"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <List className="h-5 w-5" />
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
