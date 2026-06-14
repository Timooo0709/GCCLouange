"use client";

import { useEffect, useState, useMemo } from "react";
import { ALL_CATEGORIES, getSetlists, getMySetlists, type FSSetlist } from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { visibleCategories, canCreateSetlist, isAdminUser } from "@/lib/access";
import {
  loadPlanningData,
  findMyServices,
  serviceCategory,
  type PlanningData,
} from "@/lib/planning/names";
import { useTranslation } from "react-i18next";
import { Search, X, Plus, Lock, LogIn, UserPen } from "lucide-react";
import Link from "next/link";
import { SetlistCard } from "@/components/setlists/SetlistCard";
import { useSetlistsNavState } from "@/hooks/useSetlistsNavState";

type Tab = "upcoming" | "archived" | "mine";

export default function SetlistsPage() {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useProfile();
  const [setlists, setSetlists] = useState<FSSetlist[]>([]);
  const [mySetlists, setMySetlists] = useState<FSSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(true);
  const [planning, setPlanning] = useState<PlanningData | null>(null);
  const { categoryFilter, setCategoryFilter } = useSetlistsNavState();

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    loadPlanningData().then(setPlanning);
  }, []);

  // Clés `${date}|${catégorie}` des services réels de l'utilisateur (filtre « Mes services »).
  const myServiceKeys = useMemo(() => {
    const set = new Set<string>();
    if (!planning || !profile?.planningName) return set;
    for (const e of findMyServices(planning, profile.planningName)) {
      const cat = serviceCategory(e.service);
      if (cat) set.add(`${e.setlistDate ?? e.date}|${cat}`);
    }
    return set;
  }, [planning, profile]);

  // Catégories accessibles selon le profil (services + EDD + groupe) — admins : toutes
  const admin = isAdminUser(user);
  const myCategories = useMemo(
    () => (admin ? [...ALL_CATEGORIES] : profile ? visibleCategories(profile) : []),
    [profile, admin]
  );
  // Bouton « Créer » : caché pour une régie pure (aucune catégorie créable)
  const canCreate = canCreateSetlist(user, profile);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setSetlists([]); setLoading(false); return; }
    setLoading(true);
    getSetlists()
      .then(setSetlists)
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) { setMySetlists([]); return; }
    getMySetlists(user.uid).then(setMySetlists);
  }, [user]);

  // Filtre commun : catégorie + recherche
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (s: FSSetlist) =>
      (categoryFilter === "Toutes" || s.category === categoryFilter) &&
      (!q ||
        s.title.toLowerCase().includes(q) ||
        (s.leader ?? "").toLowerCase().includes(q) ||
        s.date.includes(q));
  }, [categoryFilter, query]);

  const displayed = useMemo(() => {
    if (tab === "mine") return mySetlists.filter(matches);
    const useMine = onlyMine && !!profile?.planningName;
    // Visibilité : setlists de ses services/groupe (+ celles qu'on a créées). Le filtre
    // « Mes services » restreint en plus aux dates où l'on sert réellement (accès conservé).
    const list = setlists.filter(
      (s) =>
        (myCategories.includes(s.category) || s.ownerId === user?.uid) &&
        matches(s) &&
        (!useMine || myServiceKeys.has(`${s.date}|${s.category}`) || s.ownerId === user?.uid)
    );
    return tab === "upcoming"
      ? list.filter((s) => s.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))
      : list.filter((s) => s.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));
  }, [tab, setlists, mySetlists, matches, todayStr, myCategories, user, onlyMine, profile, myServiceKeys]);

  const emptyMessage = query
    ? "Aucun résultat pour cette recherche."
    : tab === "mine"
    ? t("setlists.list.emptyPrivate")
    : tab === "upcoming"
    ? "Aucun culte à venir."
    : "Aucune archive.";

  const tabBtnClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 font-medium transition-colors text-sm ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-background text-muted-foreground hover:bg-muted/50"
    }`;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  // Non connecté : les setlists sont réservées aux membres
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("setlists.list.loginRequired")}</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/login?from=/setlists"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              {t("common.header.login")}
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
            >
              {t("common.header.signup")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Connecté mais profil incomplet (les admins passent quand même)
  if (!profile && !admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <UserPen className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("setlists.list.profileRequired")}</p>
          <Link
            href="/profil"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {t("common.header.profile")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">

        {/* ── Onglets ── */}
        <div className="flex rounded-xl border border-border overflow-hidden text-sm mb-4">
          <button onClick={() => setTab("upcoming")} className={tabBtnClass(tab === "upcoming")}>
            {t("setlists.list.upcoming", { defaultValue: "À venir" })}
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`${tabBtnClass(tab === "archived")} border-l border-border`}
          >
            {t("setlists.list.archived", { defaultValue: "Archives" })}
          </button>
          {!authLoading && user && (
            <button
              onClick={() => setTab("mine")}
              className={`${tabBtnClass(tab === "mine")} border-l border-border`}
            >
              <Lock className="h-3.5 w-3.5" />
              {t("setlists.list.mySetlists")}
              {mySetlists.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  tab === "mine" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {mySetlists.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── Barre de filtres partagée ── */}
        <div className="space-y-3 mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par titre, leader, date…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {profile?.planningName && tab !== "mine" && (
            <button
              type="button"
              onClick={() => setOnlyMine((v) => !v)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                onlyMine
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {onlyMine ? "✓ Mes services" : "Mes services"}
            </button>
          )}

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 h-9 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="Toutes">{t("setlists.list.allCategories")}</option>
              <optgroup label="Réunions principales">
                {ALL_CATEGORIES.slice(0, 4).filter((cat) => myCategories.includes(cat)).map((cat) => (
                  <option key={cat} value={cat}>
                    {t("categories." + cat, { defaultValue: cat })}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Groupes">
                {ALL_CATEGORIES.slice(4).filter((cat) => myCategories.includes(cat)).map((cat) => (
                  <option key={cat} value={cat}>
                    {t("categories." + cat, { defaultValue: cat })}
                  </option>
                ))}
              </optgroup>
            </select>
            {canCreate && (
              <Link
                href="/setlists/new"
                className="shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("setlists.list.newButton")}</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Contenu ── */}
        {loading && tab !== "mine" ? (
          <div className="text-sm text-muted-foreground text-center py-16">
            {t("common.loading")}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl space-y-3">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            {tab === "upcoming" && !query && canCreate && (
              <Link
                href="/setlists/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t("setlists.list.newButton")}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayed.map((s) => (
              <SetlistCard key={s.id} setlist={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
