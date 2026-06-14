"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Send, Megaphone, Lock } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { authHeader } from "@/lib/firebase/setlists";
import { NOTIFY_ALL, NOTIFY_GROUPS, audienceLabel } from "@/lib/push/audiences";

/** Composer une notification manuelle vers une audience (tout le monde / un culte /
 *  un groupe / une classe EDD). Réservé aux admins et aux comptes ayant des droits
 *  `notify`. Sert aux annonces de changement de planning et de planning du trimestre. */
export default function NotifierPage() {
  const { user, profile, loading } = useProfile();
  const admin = isAdminUser(user);
  const rights = useMemo(() => profile?.notify ?? [], [profile]);
  const canAll = admin || rights.includes(NOTIFY_ALL);
  const allows = (a: string) => admin || rights.includes(NOTIFY_ALL) || rights.includes(a);

  // Audiences proposées dans le sélecteur (selon les droits).
  const groups = useMemo(
    () =>
      NOTIFY_GROUPS.map((g) => ({
        label: g.label,
        audiences: g.audiences.filter(allows),
      })).filter((g) => g.audiences.length > 0),
    [rights, admin] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [audience, setAudience] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const canSend = !!audience && !!title.trim() && !!body.trim() && !busy;

  async function send() {
    if (!canSend) return;
    setBusy(true);
    setFeedback("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/push/notify-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ audience, title: title.trim(), body: body.trim() }),
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

          {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}

          <div className="flex justify-end">
            <button
              onClick={send}
              disabled={!canSend}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {busy ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
