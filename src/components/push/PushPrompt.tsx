"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import {
  isPushSupported,
  isStandalone,
  isIOS,
  isSubscribed,
  subscribeToPush,
} from "@/lib/push/client";

const DISMISS_KEY = "pushPromptDismissed";

/** Invite à activer les notifications push, affichée aux personnes qui servent
 *  (serviceRoles non vide) mais pas encore abonnées. Push uniquement → c'est le
 *  levier d'adoption. Rejetable (localStorage). Gère la contrainte iOS (PWA). */
export function PushPrompt() {
  const { user, profile } = useProfile();
  const [show, setShow] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const hasServices = !!profile && Object.keys(profile.serviceRoles).length > 0;

  useEffect(() => {
    if (!user || !hasServices || !isPushSupported()) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* stockage indisponible */
    }
    if (dismissed) return;
    setNeedsInstall(isIOS() && !isStandalone());
    isSubscribed()
      .then((sub) => setShow(!sub))
      .catch(() => {});
  }, [user, hasServices]);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* stockage indisponible */
    }
    setShow(false);
  }

  async function enable() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await subscribeToPush(user.uid);
      setShow(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <BellRing className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Active les rappels de service</p>
          {needsInstall ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Sur iPhone/iPad : ajoute d&apos;abord le site à l&apos;écran d&apos;accueil (Partager →
              « Sur l&apos;écran d&apos;accueil »), puis rouvre-le depuis l&apos;icône pour activer les
              notifications.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Reçois un rappel avant chaque service et une alerte quand une setlist est prête.
            </p>
          )}
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          {!needsInstall && (
            <button
              onClick={enable}
              disabled={busy}
              className="mt-2 h-8 px-3 rounded-[8px] bg-primary text-primary-foreground text-[12.5px] font-semibold disabled:opacity-50"
            >
              {busy ? "…" : "Activer les notifications"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
