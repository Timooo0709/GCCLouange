"use client";

import { useEffect, useMemo, useState } from "react";
import { Send, Check, EyeOff } from "lucide-react";
import { authHeader } from "@/lib/firebase/setlists";
import { getCurrentTri } from "@/lib/planning/utils";
import { audienceLabel } from "@/lib/push/audiences";
import {
  PUBLISHABLE_PLANNINGS,
  canPublishPlanning,
  getPublishedQuarters,
  TRI_ORDER,
  triRank,
} from "@/lib/planning/releases";

/**
 * Panneau « Publier un planning » (intégré à /notifier). Pour le planning choisi
 * (parmi ceux que l'utilisateur a le droit de publier), liste les trimestres de
 * l'année courante avec leur statut. Publier un trimestre futur le révèle à tous
 * les membres et envoie une notification à l'audience du planning. Le trimestre
 * courant et les passés sont déjà visibles automatiquement.
 */
export function PublishPlanningPanel({
  isAdmin,
  notifyRights,
}: {
  isAdmin: boolean;
  notifyRights: string[];
}) {
  const year = new Date().getFullYear();
  const current = getCurrentTri();

  const plannings = useMemo(
    () => PUBLISHABLE_PLANNINGS.filter((p) => canPublishPlanning(p, isAdmin, notifyRights)),
    [isAdmin, notifyRights]
  );
  const [key, setKey] = useState(plannings[0]?.key ?? "");
  const planning = plannings.find((p) => p.key === key);

  const [published, setPublished] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyTri, setBusyTri] = useState("");
  const [confirmTri, setConfirmTri] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!key) return;
    setLoading(true);
    setFeedback("");
    setConfirmTri("");
    getPublishedQuarters(key, year)
      .then(setPublished)
      .finally(() => setLoading(false));
  }, [key, year]);

  async function act(tri: string, publish: boolean) {
    setBusyTri(tri);
    setFeedback("");
    setConfirmTri("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/planning/release", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ key, tri, publish, year }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPublished(data.published ?? []);
        setFeedback(
          publish
            ? data.notified
              ? `Trimestre ${tri} publié — notification envoyée (${data.sent ?? 0}).`
              : `Trimestre ${tri} publié.`
            : `Trimestre ${tri} masqué de nouveau.`
        );
      } else {
        setFeedback(data.error || "Échec.");
      }
    } catch {
      setFeedback("Échec — vérifie ta connexion.");
    } finally {
      setBusyTri("");
    }
  }

  if (!planning) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Tu n&apos;as pas l&apos;autorisation de publier un planning.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Planning
        </label>
        <select
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {plannings.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted-foreground">
        Publier un trimestre le rend visible par tous les membres et envoie une
        notification à{" "}
        <span className="font-semibold text-foreground">
          {audienceLabel(planning.notifyAudience)}
        </span>
        . Le trimestre courant et les passés sont déjà visibles automatiquement.
      </p>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>
        ) : (
          TRI_ORDER.map((tri) => {
            const isPublished = published.includes(tri);
            const isPastOrCurrent = triRank(tri) <= triRank(current);
            const busy = busyTri === tri;
            return (
              <div
                key={tri}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold text-foreground">
                    {tri} {year}
                  </span>
                  {isPublished ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700">
                      <Check className="h-3.5 w-3.5" /> Publié
                    </span>
                  ) : isPastOrCurrent ? (
                    <span className="text-[11px] text-muted-foreground">Visible (auto)</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <EyeOff className="h-3.5 w-3.5" /> Masqué
                    </span>
                  )}
                </div>

                {isPublished ? (
                  <button
                    onClick={() => act(tri, false)}
                    disabled={busy}
                    className="h-8 px-3 rounded-lg border border-border bg-background text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {busy ? "…" : "Masquer"}
                  </button>
                ) : isPastOrCurrent ? null : confirmTri === tri ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmTri("")}
                      className="h-8 px-3 rounded-lg border border-border bg-background text-xs font-semibold text-muted-foreground"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => act(tri, true)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {busy ? "Publication…" : "Confirmer"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmTri(tri)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                  >
                    Publier
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {confirmTri && (
        <p className="text-xs text-muted-foreground">
          Publier{" "}
          <span className="font-semibold text-foreground">
            {confirmTri} {year}
          </span>{" "}
          de {planning.label} → visible par tous + notification à{" "}
          {audienceLabel(planning.notifyAudience)}.
        </p>
      )}

      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </div>
  );
}
