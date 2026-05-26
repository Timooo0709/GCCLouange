"use client";

import { useTranslation } from "react-i18next";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggle = () => {
    const nextLang = currentLang === "zh-CN" ? "fr" : "zh-CN";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("i18nextLng", nextLang);
  };

  return (
    <button
      onClick={toggle}
      aria-label={currentLang === "zh-CN" ? "Changer en français" : "切换为中文"}
      className={`text-xs font-semibold px-2 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95 ${className}`}
    >
      {currentLang === "zh-CN" ? "FR" : "中文"}
    </button>
  );
}
