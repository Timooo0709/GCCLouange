"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, ExternalLink, FileText, Search, ShieldCheck, Trash2, UserRound, X, Youtube } from "lucide-react";
import { useProfile, listProfiles, saveProfile, getRegistrationOpen, setRegistrationOpen } from "@/lib/firebase/users";
import { getSongProposals, setProposalStatus, deleteSongProposal } from "@/lib/firebase/songProposals";
import type { SongProposal } from "@/types/songProposal";
import { isAdminUser } from "@/lib/access";
import {
  loadPlanningData,
  collectPlanningNames,
  deriveServiceRolesFromPlanning,
  type PlanningData,
} from "@/lib/planning/names";
import { ProfileFields, type ProfileFormValue } from "@/components/auth/ProfileFields";
import { SERVICE_ROLE_LABELS, SERVICE_LIEUX, GROUPES, type ServiceRole, type UserProfile } from "@/types/user";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { ANNONCE_SECTIONS } from "@/types/annonce";
import { NOTIFY_ALL, NOTIFY_GROUPS, audienceLabel } from "@/lib/push/audiences";
import { categoryColor, categoryLabel } from "@/lib/serviceColors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

function profileToForm(p: UserProfile): ProfileFormValue {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    planningName: p.planningName,
    serviceRoles: p.serviceRoles,
  };
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function Pill({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        color ? "" : "bg-muted text-muted-foreground"
      }`}
      style={color ? { background: `${color}15`, color, border: `1px solid ${color}4d` } : undefined}
    >
      {label}
    </span>
  );
}

const FILTERS = ["Tous", ...SERVICE_LIEUX, "EDD", ...GROUPES, "Ne sert pas"] as const;

export default function AdminPage() {
  const { user, loading } = useProfile();
  const admin = isAdminUser(user);

  const [regOpen, setRegOpen] = useState<boolean | null>(null);
  const [togglingReg, setTogglingReg] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [proposals, setProposals] = useState<SongProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [proposalBusy, setProposalBusy] = useState<string | null>(null);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormValue | null>(null);
  const [annonceRights, setAnnonceRights] = useState<string[]>([]);
  const [notifyRights, setNotifyRights] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tous");

  useEffect(() => {
    if (!admin) return;
    getRegistrationOpen().then(setRegOpen);
    listProfiles().then(setProfiles).finally(() => setLoadingProfiles(false));
    getSongProposals().then(setProposals).finally(() => setLoadingProposals(false));
    loadPlanningData().then((d) => {
      setPlanningData(d);
      setPlanningNames(collectPlanningNames(d));
    });
  }, [admin]);

  const deriveFromPlanning = planningData
    ? (name: string) => deriveServiceRolesFromPlanning(planningData, name)
    : undefined;

  const displayed = useMemo(() => {
    const q = normalize(query.trim());
    return profiles.filter((p) => {
      if (q) {
        const hay = normalize(`${p.firstName} ${p.lastName} ${p.email} ${p.planningName}`);
        if (!hay.includes(q)) return false;
      }
      if (filter === "Tous") return true;
      if (filter === "EDD") return (EDD_CLASSES as readonly string[]).some((c) => c in p.serviceRoles);
      if (filter === "Ne sert pas") return Object.keys(p.serviceRoles).length === 0;
      // Lieux + groupes : la catégorie est une clé de serviceRoles
      return filter in p.serviceRoles;
    });
  }, [profiles, query, filter]);

  const stats = useMemo(() => {
    const allRoles = (p: UserProfile): ServiceRole[] => Object.values(p.serviceRoles).flat();
    const musiciens = profiles.filter((p) => allRoles(p).includes("musicien")).length;
    const chanteurs = profiles.filter((p) => allRoles(p).includes("chanteur")).length;
    const presidences = profiles.filter((p) => allRoles(p).includes("presidence")).length;
    return { musiciens, chanteurs, presidences };
  }, [profiles]);

  // Noms présents dans les plannings mais liés à aucun compte (planningName) :
  // ces personnes échappent aux rappels et aux notifs « setlist prête » (ciblage
  // par nom de planning, cf. src/lib/push/recipients.ts). Visibilité pour l'admin.
  const unlinkedNames = useMemo(() => {
    const linked = new Set(
      profiles.map((p) => normalize(p.planningName.trim())).filter(Boolean)
    );
    return planningNames.filter((n) => !linked.has(normalize(n.trim())));
  }, [planningNames, profiles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!user || !admin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Page réservée aux administrateurs.</p>
        {!user && (
          <Link href="/login?from=/admin" className="text-sm text-primary hover:underline">
            Se connecter
          </Link>
        )}
      </div>
    );
  }

  async function toggleRegistration() {
    if (regOpen === null) return;
    setTogglingReg(true);
    setError("");
    try {
      await setRegistrationOpen(!regOpen);
      setRegOpen(!regOpen);
    } catch {
      setError("Impossible de modifier l'état des inscriptions. Vérifie que les règles Firestore sont publiées.");
    } finally {
      setTogglingReg(false);
    }
  }

  function startEdit(p: UserProfile) {
    setEditingUid(p.uid);
    setForm(profileToForm(p));
    setAnnonceRights(p.annonces ?? []);
    setNotifyRights(p.notify ?? []);
    setError("");
  }

  async function saveEdit(p: UserProfile) {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const updated: UserProfile = { ...p, ...form, annonces: annonceRights, notify: notifyRights };
      await saveProfile(updated);
      setProfiles((prev) => prev.map((x) => (x.uid === p.uid ? updated : x)));
      setEditingUid(null);
      setForm(null);
    } catch {
      setError("Erreur lors de l'enregistrement du profil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleProposalStatus(p: SongProposal, status: SongProposal["status"]) {
    setProposalBusy(p.id);
    setError("");
    try {
      await setProposalStatus(p.id, status);
      setProposals((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
    } catch {
      setError("Impossible de mettre à jour la proposition. Règles Firestore publiées ?");
    } finally {
      setProposalBusy(null);
    }
  }

  async function handleProposalDelete(p: SongProposal) {
    setProposalBusy(p.id);
    setError("");
    try {
      await deleteSongProposal(p.id);
      setProposals((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      setError("Impossible de supprimer la proposition. Règles Firestore publiées ?");
    } finally {
      setProposalBusy(null);
    }
  }

  const pendingProposals = proposals.filter((p) => p.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Administration</h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Inscriptions ── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Inscriptions
          </h2>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  regOpen === null ? "bg-muted" : regOpen ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <p className="text-sm text-foreground">
                {regOpen === null
                  ? "Chargement…"
                  : regOpen
                  ? "Les inscriptions sont ouvertes."
                  : "Les inscriptions sont fermées."}
              </p>
            </div>
            <Button
              onClick={toggleRegistration}
              disabled={regOpen === null || togglingReg}
              variant={regOpen ? "outline" : "default"}
              className={`shrink-0 h-11 ${regOpen ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}`}
            >
              {togglingReg ? "…" : regOpen ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}
            </Button>
          </div>
        </div>

        {/* ── Propositions de chants ── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Propositions de chants
            </h2>
            {pendingProposals.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {pendingProposals.length} en attente
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Chants proposés par les membres. Après ajout au répertoire, marque la
            proposition comme traitée.
          </p>

          {loadingProposals ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
          ) : proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
              Aucune proposition pour l&apos;instant.
            </p>
          ) : (
            <div className="space-y-2">
              {proposals.map((p) => {
                const busy = proposalBusy === p.id;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border border-border bg-background p-4 space-y-2 ${
                      p.status !== "pending" ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Proposé par {p.authorName}
                          {p.createdAt ? ` · ${p.createdAt.toLocaleDateString("fr-FR")}` : ""}
                        </p>
                      </div>
                      {p.status === "accepted" && <Pill label="Traité" color="#16a34a" />}
                      {p.status === "rejected" && <Pill label="Refusé" color="#dc2626" />}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={p.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <Youtube className="h-3.5 w-3.5" />
                        YouTube
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {p.pdfUrl && (
                        <a
                          href={p.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Partition PDF
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {p.status !== "accepted" && (
                        <Button
                          variant="outline"
                          onClick={() => handleProposalStatus(p, "accepted")}
                          disabled={busy}
                          className="h-9 text-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Marquer traité
                        </Button>
                      )}
                      {p.status === "pending" && (
                        <Button
                          variant="outline"
                          onClick={() => handleProposalStatus(p, "rejected")}
                          disabled={busy}
                          className="h-9 text-xs"
                        >
                          Refuser
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleProposalDelete(p)}
                        disabled={busy}
                        className="h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-destructive flex items-center justify-center disabled:opacity-50"
                        aria-label="Supprimer la proposition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Membres ── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Membres
            </h2>
            <span className="text-xs text-muted-foreground">
              {profiles.length} inscrit(s) · {stats.musiciens} musicien(s) · {stats.chanteurs}{" "}
              chanteur(s) · {stats.presidences} présidence(s)
            </span>
          </div>

          {/* Recherche + filtre */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un membre (nom, email, nom de planning)…"
                className="h-11 pl-9 pr-9"
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
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {FILTERS.map((f) => {
                const active = filter === f;
                const color =
                  f === "EDD" ? "#3b6d11" : f !== "Tous" && f !== "Ne sert pas" ? categoryColor(f) : undefined;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      active && !color
                        ? "bg-primary text-primary-foreground border-transparent"
                        : active
                        ? "border-transparent text-white"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                    style={active && color ? { background: color } : undefined}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {loadingProfiles ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
              {profiles.length === 0 ? "Aucun profil pour l'instant." : "Aucun membre ne correspond."}
            </p>
          ) : (
            <div className="space-y-2">
              {displayed.map((p) => {
                const isEditing = editingUid === p.uid;
                return (
                  <div key={p.uid} className="rounded-xl border border-border bg-background">
                    <button
                      onClick={() => (isEditing ? setEditingUid(null) : startEdit(p))}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left"
                    >
                      <span className="h-8 w-8 mt-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 uppercase">
                        {(p.firstName[0] ?? "") + (p.lastName[0] ?? "") || <UserRound className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {p.firstName} {p.lastName}
                          {isAdminUser(p) && (
                            <span className="ml-2 text-[10px] font-bold text-primary uppercase">admin</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.email}
                          {p.planningName ? ` · planning : ${p.planningName}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(p.serviceRoles).map(([cat, roles]) => (
                            <Pill
                              key={cat}
                              label={`${categoryLabel(cat)}${
                                roles.length ? " · " + roles.map((r) => SERVICE_ROLE_LABELS[r]).join("/") : ""
                              }`}
                              color={categoryColor(cat)}
                            />
                          ))}
                          {Object.keys(p.serviceRoles).length === 0 && <Pill label="Ne sert pas" />}
                        </div>
                      </div>
                      {isEditing ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                      )}
                    </button>

                    {isEditing && form && (
                      <div className="border-t border-border px-4 py-4 space-y-4">
                        <ProfileFields
                          value={form}
                          onChange={setForm}
                          planningNames={planningNames}
                          deriveFromPlanning={deriveFromPlanning}
                        />

                        {/* Droits de publication d'annonces — réservé aux admins */}
                        <div className="rounded-lg border border-dashed border-border p-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                            Peut publier des annonces pour :
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ANNONCE_SECTIONS.map((s) => {
                              const checked = annonceRights.includes(s);
                              const color = categoryColor(s);
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() =>
                                    setAnnonceRights((prev) =>
                                      checked ? prev.filter((x) => x !== s) : [...prev, s]
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                    checked ? "" : "bg-background border-border text-muted-foreground hover:text-foreground"
                                  }`}
                                  style={checked ? { background: `${color}15`, borderColor: color, color } : undefined}
                                >
                                  {checked ? "✓ " : ""}{categoryLabel(s)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Droits d'envoi de notifications manuelles — réservé aux admins */}
                        <div className="rounded-lg border border-dashed border-border p-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                            Peut envoyer des notifications à :
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {[NOTIFY_ALL, ...NOTIFY_GROUPS.flatMap((g) => g.audiences)].map((a) => {
                              const checked = notifyRights.includes(a);
                              const color = a === NOTIFY_ALL ? undefined : categoryColor(a);
                              return (
                                <button
                                  key={a}
                                  type="button"
                                  onClick={() =>
                                    setNotifyRights((prev) =>
                                      checked ? prev.filter((x) => x !== a) : [...prev, a]
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                    !checked
                                      ? "bg-background border-border text-muted-foreground hover:text-foreground"
                                      : color
                                      ? ""
                                      : "bg-primary/10 border-primary text-primary"
                                  }`}
                                  style={checked && color ? { background: `${color}15`, borderColor: color, color } : undefined}
                                >
                                  {checked ? "✓ " : ""}{audienceLabel(a)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => { setEditingUid(null); setForm(null); }}
                            className="h-11"
                          >
                            Annuler
                          </Button>
                          <Button onClick={() => saveEdit(p)} disabled={saving} className="h-11">
                            {saving ? "Enregistrement…" : "Enregistrer"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Noms du planning sans compte ── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Planning sans compte ({unlinkedNames.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Ces noms apparaissent dans les plannings mais ne sont liés à aucun compte —
            ces personnes ne reçoivent ni rappels ni notification « setlist prête ».
          </p>
          {planningData == null ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : unlinkedNames.length === 0 ? (
            <p className="text-sm text-foreground">
              ✅ Tous les noms du planning sont liés à un compte.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {unlinkedNames.map((n) => (
                <span
                  key={n}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
