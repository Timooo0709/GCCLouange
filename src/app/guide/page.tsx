"use client";

import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Music,
  SlidersHorizontal,
  Pencil,
  ListMusic,
  ListPlus,
  CalendarDays,
  Megaphone,
  Bell,
  AlertCircle,
  ShieldCheck,
  UserCog,
  Lightbulb,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";

const SECTIONS = [
  { key: "songs", Icon: Music },
  { key: "customize", Icon: SlidersHorizontal },
  { key: "performance", Icon: Pencil },
  { key: "setlists", Icon: ListMusic },
  { key: "compose", Icon: ListPlus },
  { key: "planning", Icon: CalendarDays },
  { key: "annonces", Icon: Megaphone },
  { key: "notifications", Icon: Bell },
  { key: "report", Icon: AlertCircle },
  { key: "roles", Icon: ShieldCheck },
  { key: "account", Icon: UserCog },
] as const;

/** Rend un texte en mettant en gras les termes entre **doubles astérisques**. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

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
            {SECTIONS.map(({ key, Icon }) => {
              const points = t(`guide.sections.${key}.points`, {
                returnObjects: true,
                defaultValue: [],
              }) as unknown as string[];
              const tip = t(`guide.sections.${key}.tip`, { defaultValue: "" });
              const forWhom = t(`guide.sections.${key}.for`, { defaultValue: "" });

              return (
                <section
                  key={key}
                  id={key}
                  className="scroll-mt-[var(--nav-h)] rounded-xl border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                      <Icon className="h-[18px] w-[18px] text-primary shrink-0" />
                      {t(`guide.sections.${key}.title`)}
                    </h2>
                    {forWhom && (
                      <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {forWhom}
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <RichText text={t(`guide.sections.${key}.body`)} />
                  </p>

                  {points.length > 0 && (
                    <ul className="space-y-1.5">
                      {points.map((point, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                        >
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>
                            <RichText text={point} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {tip && (
                    <div className="flex gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>
                        <RichText text={tip} />
                      </span>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
