"use client";

import { useEffect, useState } from "react";
import { Plus, LogIn, LogOut } from "lucide-react";
import { getSetlists, ALL_CATEGORIES, type FSSetlist } from "@/lib/firebase/setlists";
import { useAuth, logOut } from "@/lib/firebase/auth";
import { DarkModeToggle } from "@/components/DarkModeToggle";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso + "T12:00:00"));
}

const LANG_LABEL: Record<string, string> = { fr: "FR", zh: "中文", mixed: "FR / 中文" };

function SetlistCard({ setlist }: { setlist: FSSetlist }) {
  return (
    <a
      href={`/setlists/${setlist.id}`}
      className="block rounded-xl border border-border bg-background hover:bg-muted/40 transition-colors p-4 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground group-hover:text-primary truncate">
              {setlist.title}
            </h2>
            {setlist.isDraft && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">
                Brouillon
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">
            {formatDate(setlist.date)}
          </p>
        </div>
        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
          {LANG_LABEL[setlist.language] ?? setlist.language}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px]">
          {setlist.category}
        </span>
        <span>{setlist.items.length} chant{setlist.items.length > 1 ? "s" : ""}</span>
        {setlist.leader && <span>— {setlist.leader}</span>}
      </div>
    </a>
  );
}

export default function SetlistsPage() {
  const { user, loading: authLoading } = useAuth();
  const [setlists, setSetlists] = useState<FSSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("Toutes");

  useEffect(() => {
    getSetlists()
      .then(setSetlists)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    categoryFilter === "Toutes"
      ? setlists
      : setlists.filter((s) => s.category === categoryFilter);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Nav */}
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:gap-4">
          {/* Ligne 1 : logo + actions */}
          <div className="flex items-center gap-4">
            <span className="font-bold text-foreground text-lg">GCC Louange</span>
            <div className="ml-auto flex items-center gap-3 sm:hidden">
              <DarkModeToggle />
              <a href="/setlists/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                <Plus className="h-4 w-4" />
                Nouvelle
              </a>
            </div>
          </div>

          {/* Ligne 2 : nav */}
          <nav className="flex gap-1">
            <a href="/songs" className="px-3 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Chants</a>
            <a href="/setlists" className="px-3 py-1.5 rounded text-sm font-medium bg-muted text-foreground">Setlists</a>
          </nav>

          {/* Actions desktop */}
          <div className="hidden sm:flex ml-auto items-center gap-3">
            <DarkModeToggle />
            {!authLoading && (user ? (
              <button onClick={() => logOut()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <LogOut className="h-3.5 w-3.5" />
                Déconnexion
              </button>
            ) : (
              <a href="/login?from=/setlists" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <LogIn className="h-3.5 w-3.5" />
                Connexion
              </a>
            ))}
            <a href="/setlists/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Plus className="h-4 w-4" />
              Nouvelle
            </a>
          </div>
        </div>

        {/* Filtre par catégorie */}
        <div className="flex gap-1.5 flex-wrap mb-5">
          {["Toutes", ...ALL_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-16">
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-16">
            {setlists.length === 0
              ? "Aucune setlist pour l'instant."
              : "Aucune setlist dans cette catégorie."}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((s) => (
              <SetlistCard key={s.id} setlist={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
