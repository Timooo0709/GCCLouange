"use client";

import { useEffect, useState } from "react";
import { initReactI18next } from "react-i18next";
import i18n from "i18next";
import frTranslations from "@/locales/fr.json";
import zhTranslations from "@/locales/zh-CN.json";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: frTranslations },
        "zh-CN": { translation: zhTranslations },
      },
      lng: "fr", // Statically compiled server-side HTML will be in French
      fallbackLng: "fr",
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("i18nextLng");
    const systemLanguage = navigator.language.startsWith("zh") ? "zh-CN" : "fr";
    const clientLanguage = savedLanguage || systemLanguage;
    if (clientLanguage && clientLanguage !== i18n.language) {
      i18n.changeLanguage(clientLanguage);
    }
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by waiting for client-side mounting
  // while rendering invisible or raw until ready, or let standard react hydrate.
  // Standard react hydrate with mounted state is safe:
  return <>{children}</>;
}
export default i18n;
