"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, X, Send } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { authHeader } from "@/lib/firebase/setlists";
import { REPORT_LIMITS } from "@/lib/report/reportValidator";
import type { ReportKind } from "@/types/report";

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  kind: ReportKind;
  /** kind === "song" : chant concerné */
  songSlug?: string;
  songTitle?: string;
}

/**
 * Modal de signalement partagé (problème chant ou site). Réservé aux membres
 * connectés : enregistre le signalement (→ inbox /admin) et notifie les admins.
 */
export function ReportDialog({ open, onClose, kind, songSlug, songTitle }: ReportDialogProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  // Le composant reste monté entre deux ouvertures → on repart d'un formulaire vierge.
  useEffect(() => {
    if (open) setStatus("idle");
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const headers = await authHeader();
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          kind,
          songSlug: kind === "song" ? songSlug ?? "" : "",
          songTitle: kind === "song" ? songTitle ?? "" : "",
        }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-background border border-border rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Signaler un problème</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corps */}
        {!user ? (
          <div className="px-4 py-6 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Connecte-toi pour signaler un problème.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Se connecter
            </Link>
          </div>
        ) : status === "done" ? (
          <p className="px-4 py-6 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <span className="text-green-500">✓</span> Signalement envoyé, merci !
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Résumé</label>
              <input
                name="title"
                defaultValue={kind === "song" && songTitle ? `Problème avec : ${songTitle}` : ""}
                placeholder={kind === "site" ? "Décris le problème en une phrase…" : undefined}
                required
                minLength={3}
                maxLength={REPORT_LIMITS.title}
                className="w-full px-3 py-1.5 text-sm border border-border rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Détails <span className="font-normal">(optionnel)</span>
              </label>
              <textarea
                name="description"
                placeholder="Décris le problème…"
                rows={3}
                maxLength={REPORT_LIMITS.description}
                className="w-full px-3 py-1.5 text-sm border border-border rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {status === "error" && (
              <p className="text-xs text-destructive">Échec de l&apos;envoi. Réessaie plus tard.</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {status === "loading" ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
