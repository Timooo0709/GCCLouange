"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarDays, Clock, ListMusic, Lock, MapPin, UserPen } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { getSetlists, type FSSetlist } from "@/lib/firebase/setlists";
import {
  loadPlanningData,
  findMyServices,
  normalizeName,
  serviceCategory,
  type PlanningData,
  type ServiceEntry,
} from "@/lib/planning/names";
import { MOIS, JOURC } from "@/lib/planning/utils";
import { serviceColor } from "@/lib/serviceColors";
import { PushPrompt } from "@/components/push/PushPrompt";

type Tab = "upcoming" | "past";

function fdJour(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${JOURC[date.getDay()]} ${d} ${MOIS[m - 1].toLowerCase()}`;
}

function daysUntil(dateStr: string, todayStr: string): number {
  const [y1, m1, d1] = todayStr.split("-").map(Number);
  const [y2, m2, d2] = dateStr.split("-").map(Number);
  return Math.round(
    (new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86_400_000
  );
}

type GroupedEntry = { date: string; service: string; roles: string[]; time?: string; location?: string; setlistDate?: string; leader?: string; moment?: "matin" | "soir" };

/** Regroupe les entrées par date+service en fusionnant les rôles. */
function groupEntries(entries: ServiceEntry[]): GroupedEntry[] {
  const map = new Map<string, GroupedEntry>();
  for (const e of entries) {
    const key = `${e.date}|${e.service}`;
    const g = map.get(key);
    if (g) {
      if (!g.roles.includes(e.role)) g.roles.push(e.role);
    } else {
      map.set(key, { date: e.date, service: e.service, roles: [e.role], time: e.time, location: e.location, setlistDate: e.setlistDate, leader: e.leader, moment: e.moment });
    }
  }
  return [...map.values()];
}

/** Regroupe par mois ("Juin 2026") en conservant l'ordre. */
function groupByMonth(entries: GroupedEntry[]): { label: string; items: GroupedEntry[] }[] {
  const out: { label: string; items: GroupedEntry[] }[] = [];
  for (const e of entries) {
    const [y, m] = e.date.split("-").map(Number);
    const label = `${MOIS[m - 1]} ${y}`;
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(e);
    else out.push({ label, items: [e] });
  }
  return out;
}

export default function MesServicesPage() {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useProfile();
  const [data, setData] = useState<PlanningData | null>(null);
  const [setlists, setSetlists] = useState<FSSetlist[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");

  useEffect(() => {
    loadPlanningData().then(setData);
  }, []);

  useEffect(() => {
    if (!user) return;
    getSetlists().then(setSetlists);
    // Vide à la déconnexion / au changement d'utilisateur (pas de setState synchrone).
    return () => setSetlists([]);
  }, [user]);

  // Setlists groupées par date+catégorie.
  const setlistsByDateCat = useMemo(() => {
    const map = new Map<string, FSSetlist[]>();
    for (const s of setlists) {
      const key = `${s.date}|${s.category}`;
      const arr = map.get(key);
      if (arr) arr.push(s);
      else map.set(key, [s]);
    }
    return map;
  }, [setlists]);

  // Setlist d'un service : s'il n'y en a qu'une ce jour-là dans la catégorie, on
  // la lie ; s'il y en a plusieurs (campus matin/soir), on départage par président.
  const findSetlistId = (date: string, category: string, leader?: string, moment?: "matin" | "soir"): string | undefined => {
    const arr = setlistsByDateCat.get(`${date}|${category}`);
    if (!arr || arr.length === 0) return undefined;
    // Campus : matin/soir partagent date + catégorie "Campus" → départage par moment
    // (setlists récentes liées à la séance), puis par président (anciennes sans moment).
    if (category === "Campus") {
      if (moment) {
        const m = arr.find((s) => s.moment === moment);
        if (m) return m.id;
      }
      if (leader) {
        const want = normalizeName(leader);
        const m = arr.find((s) => normalizeName(s.leader) === want);
        if (m) return m.id;
      }
      return undefined; // ambigu → pas de lien (évite le mauvais)
    }
    if (arr.length === 1) return arr[0].id;
    if (leader) {
      const want = normalizeName(leader);
      const match = arr.find((s) => normalizeName(s.leader) === want);
      if (match) return match.id;
    }
    return undefined;
  };

  // Date du jour en heure LOCALE (pas UTC) — sinon le partage à-venir/passés et le
  // badge « Aujourd'hui » sont décalés d'un jour quelques heures autour de minuit.
  const todayStr = useMemo(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }, []);

  const entries = useMemo(() => {
    if (!data || !profile?.planningName) return [];
    return groupEntries(findMyServices(data, profile.planningName));
  }, [data, profile]);

  const shown = useMemo(
    () =>
      tab === "upcoming"
        ? entries.filter((e) => e.date >= todayStr)
        : entries.filter((e) => e.date < todayStr).reverse(),
    [entries, tab, todayStr]
  );

  const months = useMemo(() => groupByMonth(shown), [shown]);
  const upcomingCount = useMemo(
    () => entries.filter((e) => e.date >= todayStr).length,
    [entries, todayStr]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("mesServices.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("mesServices.loginPrompt")}
        </p>
        <Link href="/login?from=/mes-services" className="text-sm text-primary hover:underline">
          {t("mesServices.login")}
        </Link>
      </div>
    );
  }

  if (!profile || !profile.planningName) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <UserPen className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-sm">
          {profile ? t("mesServices.chooseName") : t("mesServices.completeProfile")}
        </p>
        <Link href="/profil" className="text-sm text-primary hover:underline">
          {t("mesServices.myProfile")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">{t("mesServices.title")}</h1>
          </div>
          {upcomingCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              {t("mesServices.upcomingCount", { count: upcomingCount })}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("mesServices.subtitle", { name: profile.planningName })}
        </p>

        <PushPrompt />

        {/* Onglets À venir / Passés */}
        <div className="flex rounded-xl border border-border overflow-hidden text-sm">
          {(["upcoming", "past"] as Tab[]).map((tb, i) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`flex-1 px-3 py-2.5 font-medium transition-colors ${i === 1 ? "border-l border-border" : ""} ${
                tab === tb
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {tb === "upcoming" ? t("mesServices.tabUpcoming") : t("mesServices.tabPast")}
            </button>
          ))}
        </div>

        {!data ? (
          <p className="text-sm text-muted-foreground text-center py-16">{t("mesServices.loading")}</p>
        ) : shown.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl space-y-1">
            <p className="text-sm text-muted-foreground">
              {tab === "upcoming"
                ? t("mesServices.emptyUpcoming")
                : t("mesServices.emptyPast")}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {months.map((month) => (
              <div key={month.label}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {month.label}
                </p>
                <div className="space-y-2">
                  {month.items.map((e) => {
                    const color = serviceColor(e.service);
                    const cat = serviceCategory(e.service);
                    const lookupDate = e.setlistDate ?? e.date;
                    const setlistId = cat ? findSetlistId(lookupDate, cat, e.leader, e.moment) : undefined;
                    const dUntil = tab === "upcoming" ? daysUntil(e.date, todayStr) : -1;
                    const thisWeek = dUntil >= 0 && dUntil <= 6;
                    return (
                      <div
                        key={`${e.date}|${e.service}`}
                        className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-3 border-l-4 ${
                          thisWeek ? "border-border ring-1 ring-primary/20" : "border-border"
                        }`}
                        style={{ borderLeftColor: color }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground capitalize">
                              {fdJour(e.date)}
                            </p>
                            {dUntil === 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground uppercase">
                                {t("mesServices.today")}
                              </span>
                            )}
                            {dUntil > 0 && dUntil <= 14 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                {t("mesServices.inDays", { count: dUntil })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium mt-0.5" style={{ color }}>
                            {e.service}
                          </p>
                          {(e.time || e.location) && (
                            <p className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              {e.time && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {e.time}
                                </span>
                              )}
                              {e.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {e.location}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end items-center">
                          {e.roles.map((r) => (
                            <span
                              key={r}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: `${color}15`, color, border: `1px solid ${color}4d` }}
                            >
                              {r}
                            </span>
                          ))}
                          {setlistId && (
                            <Link
                              href={`/setlists/${setlistId}`}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                            >
                              <ListMusic className="h-3 w-3" />
                              {t("mesServices.setlist")}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
