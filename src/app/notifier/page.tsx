"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Send, Megaphone, Lock, Search, X } from "lucide-react";
import { useProfile, listProfiles } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { authHeader } from "@/lib/firebase/setlists";
import type { UserProfile } from "@/types/user";
import { NOTIFY_ALL, NOTIFY_GROUPS, audienceLabel } from "@/lib/push/audiences";
import { PUBLISHABLE_PLANNINGS, canPublishPlanning } from "@/lib/planning/releases";
import { PublishPlanningPanel } from "@/components/planning/PublishPlanningPanel";

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Au-delà de ce nombre de destinataires (ou « tout le monde »), on demande confirmation.
const CONFIRM_THRESHOLD = 20;

// Destinations possibles au clic sur la notification (chemins internes sûrs).
const DESTINATIONS: { value: string; label: string }[] = [
  { value: "/mes-services", label: "Mes services" },
  { value: "/planning", label: "Planning" },
  { value: "/annonces", label: "Annonces" },
];

/** Composer une notification manuelle. On choisit une audience (tout le monde / un
 *  culte / un groupe / une classe EDD) ; la liste des personnes de cette audience
 *  s'affiche, toutes cochées par défaut — on peut en décocher pour ne viser que
 *  certaines. Réservé aux admins et aux comptes ayant des droits `notify`. */
export default function NotifierPage() {
  const { user, profile, loading } = useProfile();
  const admin = isAdminUser(user);
  const rights = useMemo(() => profile?.notify ?? [], [profile]);
  const canAll = admin || rights.includes(NOTIFY_ALL);
  const allows = (a: string) => admin || rights.includes(NOTIFY_ALL) || rights.includes(a);

  const groups = useMemo(
    () =>
      NOTIFY_GROUPS.map((g) => ({
        label: g.label,
        audiences: g.audiences.filter(allows),
      })).filter((g) => g.audiences.length > 0),
    [rights, admin] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const canPublishAny = useMemo(
    () => PUBLISHABLE_PLANNINGS.some((p) => canPublishPlanning(p, admin, rights)),
    [admin, rights]
  );

  const [mode, setMode] = useState<"notif" | "publish">("notif");
  const [audience, setAudience] = useState("");
  const [profiles, setProfiles] = useState<UserProfile[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [peopleQuery, setPeopleQuery] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dest, setDest] = useState("/mes-services");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Personnes de l'audience choisie (tout le monde = tous les profils).
  const pool = useMemo(() => {
    if (!profiles || !audience) return [];
    return audience === NOTIFY_ALL ? profiles : profiles.filter((p) => audience in p.serviceRoles);
  }, [profiles, audience]);

  const shownPool = useMemo(() => {
    const q = normalize(peopleQuery.trim());
    return q
      ? pool.filter((p) => normalize(`${p.firstName} ${p.lastName} ${p.planningName}`).includes(q))
      : pool;
  }, [pool, peopleQuery]);

  // Charge les profils dès qu'une audience est choisie.
  useEffect(() => {
    if (audience && profiles === null) {
      listProfiles().then(setProfiles).catch(() => setProfiles([]));
    }
  }, [audience, profiles]);

  // Au changement d'audience (ou au chargement des profils), tout sélectionner.
  useEffect(() => {
    if (!profiles || !audience) {
      setSelected(new Set());
      return;
    }
    const p =
      audience === NOTIFY_ALL ? profiles : profiles.filter((x) => audience in x.serviceRoles);
    setSelected(new Set(p.map((x) => x.uid)));
    setPeopleQuery("");
  }, [audience, profiles]);

  const allSelected = pool.length > 0 && selected.size === pool.length;
  const broadcast = audience === NOTIFY_ALL && allSelected;
  const canSend = !!title.trim() && !!body.trim() && !busy && selected.size > 0;
  const needsConfirm = broadcast || selected.size > CONFIRM_THRESHOLD;
  const recipLabel = broadcast ? "tout le monde" : `${selected.size} personne(s)`;

  // Toute édition referme une éventuelle confirmation en attente.
  useEffect(() => setConfirmOpen(false), [audience, selected, title, body, dest]);

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function attemptSend() {
    if (!canSend) return;
    if (needsConfirm && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    doSend();
  }

  async function doSend() {
    setBusy(true);
    setFeedback("");
    setConfirmOpen(false);
    try {
      const headers = await authHeader();
      // « Tout le monde » avec tous cochés → diffusion à tous les abonnés ; sinon, liste d'uids.
      const base = { title: title.trim(), body: body.trim(), url: dest };
      const reqBody = broadcast ? { audience: NOTIFY_ALL, ...base } : { uids: [...selected], ...base };
      const res = await fetch("/api/push/notify-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(reqBody),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback(`Envoyé (${data.sent ?? 0} notification(s)).`);
        setTitle("");
        setBody("");
      } else {
        setFeedback(data.error || "Échec de l'envoi.");
      }
    } catch {
      setFeedback("Échec de l'envoi.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!user || (!admin && rights.length === 0)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Tu n&apos;as pas l&apos;autorisation d&apos;envoyer des notifications.
        </p>
        {!user && (
          <Link href="/login?from=/notifier" className="text-sm text-primary hover:underline">
            Se connecter
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-10 space-y-5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Envoyer une notification</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Prévenir une audience d&apos;un changement de planning, ou de la mise en ligne du
          planning du trimestre.
        </p>

        {canPublishAny && (
          <div className="flex gap-2">
            {(
              [
                ["notif", "Notification"],
                ["publish", "Publier un planning"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === "publish" ? (
          <PublishPlanningPanel isAdmin={admin} notifyRights={rights} />
        ) : (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Audience
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Choisir…</option>
              {canAll && <option value={NOTIFY_ALL}>{audienceLabel(NOTIFY_ALL)}</option>}
              {groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.audiences.map((a) => (
                    <option key={a} value={a}>
                      {audienceLabel(a)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Personnes de l'audience — toutes cochées par défaut, décochables */}
          {audience && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Destinataires
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {selected.size} / {pool.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(allSelected ? new Set() : new Set(pool.map((p) => p.uid)))
                    }
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {allSelected ? "Tout décocher" : "Tout cocher"}
                  </button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={peopleQuery}
                  onChange={(e) => setPeopleQuery(e.target.value)}
                  placeholder="Filtrer la liste…"
                  className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {peopleQuery && (
                  <button
                    onClick={() => setPeopleQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {profiles === null ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Chargement…</p>
                ) : shownPool.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun membre.</p>
                ) : (
                  shownPool.map((p) => {
                    const checked = selected.has(p.uid);
                    return (
                      <button
                        key={p.uid}
                        type="button"
                        onClick={() => toggle(p.uid)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
                      >
                        <span
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 text-[10px] ${
                            checked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {checked && "✓"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-sm text-foreground truncate block">
                            {p.firstName} {p.lastName}
                          </span>
                          {p.planningName && (
                            <span className="text-xs text-muted-foreground truncate block">
                              planning : {p.planningName}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Titre
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Ex. Changement de planning"
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Ex. Le planning du Culte a été mis à jour, vérifie tes dates."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Ouvre au clic
            </label>
            <select
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {DESTINATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}

          {confirmOpen ? (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-3">
              <p className="text-sm text-foreground">
                Envoyer cette notification à <span className="font-semibold">{recipLabel}</span> ?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="h-9 px-4 rounded-lg border border-border bg-background text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </button>
                <button
                  onClick={doSend}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {busy ? "Envoi…" : "Confirmer"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={attemptSend}
                disabled={!canSend}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {busy ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
