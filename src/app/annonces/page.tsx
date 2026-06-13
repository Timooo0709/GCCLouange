"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Megaphone, Pencil, Pin, Plus, Trash2, X } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { getAnnonces, createAnnonce, updateAnnonce, deleteAnnonce, ANNONCES_LAST_SEEN_KEY } from "@/lib/firebase/annonces";
import { canPublishAnnonce, isAdminUser } from "@/lib/access";
import { ANNONCE_SECTIONS, type Annonce, type AnnonceSection } from "@/types/annonce";
import { categoryColor } from "@/lib/serviceColors";
import { AnnonceForm, annonceToForm, type AnnonceFormValue } from "@/components/annonces/AnnonceForm";

function sectionLabel(s: string): string {
  return s === "Culte Francophone" ? "Culte Franco" : s.replace("Groupe ", "");
}

function formatCreatedAt(a: Annonce): string {
  if (!a.createdAt) return "";
  return a.createdAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Rend le texte avec les URLs cliquables. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function AnnoncesPage() {
  const { user, profile, loading: authLoading } = useProfile();
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"Toutes" | AnnonceSection>("Toutes");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Marque les annonces comme vues (badge « non lu » de la Navbar)
  useEffect(() => {
    localStorage.setItem(ANNONCES_LAST_SEEN_KEY, String(Date.now()));
  }, [annonces]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    getAnnonces().then(setAnnonces).finally(() => setLoading(false));
  }, [user, authLoading]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const allowedSections = useMemo(
    () => ANNONCE_SECTIONS.filter((s) => canPublishAnnonce(user, profile, s)),
    [user, profile]
  );

  const displayed = useMemo(() => {
    return annonces
      .filter((a) => !a.expiresAt || a.expiresAt >= todayStr)
      .filter((a) => filter === "Toutes" || a.section === filter)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
      });
  }, [annonces, filter, todayStr]);

  async function refresh() {
    const list = await getAnnonces();
    setAnnonces(list);
  }

  async function handleCreate(value: AnnonceFormValue) {
    if (!user) return;
    await createAnnonce({
      ...value,
      authorId: user.uid,
      authorName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : (user.email ?? ""),
    });
    setCreating(false);
    await refresh();
  }

  async function handleUpdate(id: string, value: AnnonceFormValue) {
    await updateAnnonce(id, value);
    setEditingId(null);
    await refresh();
  }

  async function handleDelete(id: string) {
    await deleteAnnonce(id);
    setConfirmDeleteId(null);
    await refresh();
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Connecte-toi pour voir les annonces.</p>
        <Link href="/login?from=/annonces" className="text-sm text-primary hover:underline">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Annonces</h1>
          </div>
          {allowedSections.length > 0 && !creating && (
            <button
              onClick={() => { setCreating(true); setEditingId(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nouvelle annonce
            </button>
          )}
        </div>

        {/* Filtres par section */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(["Toutes", ...ANNONCE_SECTIONS] as const).map((s) => {
            const active = filter === s;
            const color = s === "Toutes" ? undefined : categoryColor(s);
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active && !color
                    ? "bg-primary text-primary-foreground border-transparent"
                    : active
                    ? "text-white border-transparent"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
                style={active && color ? { background: color } : undefined}
              >
                {s === "Toutes" ? "Toutes" : sectionLabel(s)}
              </button>
            );
          })}
        </div>

        {/* Formulaire de création */}
        {creating && (
          <AnnonceForm
            allowedSections={allowedSections}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
            submitLabel="Publier l'annonce"
          />
        )}

        {/* Liste */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-16">Chargement…</p>
        ) : displayed.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16 border border-dashed border-border rounded-xl">
            Aucune annonce {filter !== "Toutes" ? `pour ${sectionLabel(filter)} ` : ""}pour l&apos;instant.
          </p>
        ) : (
          <div className="space-y-3">
            {displayed.map((a) => {
              const color = categoryColor(a.section);
              const canEdit = a.authorId === user.uid || isAdminUser(user);
              if (editingId === a.id) {
                return (
                  <AnnonceForm
                    key={a.id}
                    initial={annonceToForm(a)}
                    allowedSections={
                      allowedSections.includes(a.section)
                        ? allowedSections
                        : [a.section, ...allowedSections]
                    }
                    onSubmit={(v) => handleUpdate(a.id, v)}
                    onCancel={() => setEditingId(null)}
                    submitLabel="Enregistrer"
                  />
                );
              }
              return (
                <article
                  key={a.id}
                  className="rounded-xl border border-border border-l-4 bg-card p-4 space-y-3"
                  style={{ borderLeftColor: color }}
                >
                  {/* En-tête */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}15`, color, border: `1px solid ${color}4d` }}
                        >
                          {sectionLabel(a.section)}
                        </span>
                        {a.pinned && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Pin className="h-2.5 w-2.5" />
                            Épinglée
                          </span>
                        )}
                      </div>
                      <h2 className="text-sm font-bold text-foreground">{a.title}</h2>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingId(a.id); setCreating(false); }}
                          className="h-7 w-7 rounded-lg border border-border text-muted-foreground hover:text-foreground flex items-center justify-center"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {confirmDeleteId === a.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(a.id)}
                              className="h-7 px-2 rounded-lg bg-destructive text-white text-xs font-semibold"
                            >
                              Oui
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="h-7 px-2 rounded-lg border border-border text-xs text-muted-foreground"
                            >
                              Non
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(a.id)}
                            className="h-7 w-7 rounded-lg border border-border text-muted-foreground hover:text-destructive flex items-center justify-center"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Texte */}
                  {a.body && (
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      <Linkified text={a.body} />
                    </p>
                  )}

                  {/* Liens */}
                  {a.links.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {a.links.map((l, i) => (
                        <a
                          key={i}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                        >
                          🔗 {l.label || l.url}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Images */}
                  {a.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {a.images.map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={img}
                          alt={`${a.title} — image ${i + 1}`}
                          onClick={() => setLightbox(img)}
                          className="h-28 w-28 sm:h-36 sm:w-36 object-cover rounded-lg border border-border cursor-zoom-in hover:opacity-90 transition-opacity"
                        />
                      ))}
                    </div>
                  )}

                  {/* Pied */}
                  <p className="text-xs text-muted-foreground">
                    {a.authorName && <span className="font-medium">{a.authorName}</span>}
                    {a.authorName && formatCreatedAt(a) && " · "}
                    {formatCreatedAt(a)}
                    {a.expiresAt && (
                      <span className="text-muted-foreground/70"> · visible jusqu&apos;au {a.expiresAt.split("-").reverse().join("/")}</span>
                    )}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-full rounded-lg" />
          <button
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
