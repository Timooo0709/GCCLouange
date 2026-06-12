"use client";

import { useTranslation } from "react-i18next";
import { BookOpen, Music, SlidersHorizontal, Pencil, ListMusic, CalendarDays, UserCog } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";

const SECTIONS = [
  { key: "songs", Icon: Music },
  { key: "customize", Icon: SlidersHorizontal },
  { key: "performance", Icon: Pencil },
  { key: "setlists", Icon: ListMusic },
  { key: "planning", Icon: CalendarDays },
  { key: "account", Icon: UserCog },
] as const;

export default function GuidePage() {
  const { t } = useTranslation();

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-16 space-y-6">
          <header className="space-y-1.5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">{t("guide.title")}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{t("guide.subtitle")}</p>
          </header>

          {/* Sommaire */}
          <nav className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              {t("guide.tocTitle")}
            </p>
            <ul className="flex flex-col gap-0.5">
              {SECTIONS.map(({ key, Icon }) => (
                <li key={key}>
                  <a
                    href={`#${key}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    {t(`guide.sections.${key}.title`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sections */}
          <div className="space-y-5">
            {SECTIONS.map(({ key, Icon }) => (
              <section
                key={key}
                id={key}
                className="scroll-mt-[var(--nav-h)] rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Icon className="h-[18px] w-[18px] text-primary shrink-0" />
                  {t(`guide.sections.${key}.title`)}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`guide.sections.${key}.body`)}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
