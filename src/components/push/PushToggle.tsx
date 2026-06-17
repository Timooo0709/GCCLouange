"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useProfile } from "@/lib/firebase/users";
import {
  isPushSupported,
  isStandalone,
  isIOS,
  isSubscribed,
  permissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";
import { getNotifPrefs, saveNotifPrefs } from "@/lib/firebase/notifPrefs";
import {
  NOTIF_TYPES,
  NOTIF_TYPE_LABELS,
  DEFAULT_NOTIF_PREFS,
  type NotifPrefs,
  type NotifType,
} from "@/types/user";

/** Réglage d'abonnement aux notifications push (rappels de service + setlist prête).
 *  Affiché sur la page profil. Gère la contrainte iOS (PWA installée requise). */
export function PushToggle() {
  const { t } = useTranslation();
  const { user } = useProfile();

  const [supported, setSupported] = useState(true);
  const [needsInstall, setNeedsInstall] = useState(false);
  // Le navigateur a bloqué les notifs pour ce site (permission « denied ») :
  // requestPermission() ne redemandera plus, il faut réautoriser à la main.
  const [denied, setDenied] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Préférences par type (chargées quand les notifs sont activées).
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [prefBusy, setPrefBusy] = useState<NotifType | null>(null);

  useEffect(() => {
    const ok = isPushSupported();
    setSupported(ok);
    // Sur iOS, le push n'existe qu'en PWA installée sur l'écran d'accueil.
    setNeedsInstall(isIOS() && !isStandalone());
    if (ok) {
      setDenied(permissionState() === "denied");
      isSubscribed().then(setEnabled).catch(() => {});
    }
  }, []);

  // Charge les préférences par type une fois les notifs activées.
  useEffect(() => {
    if (enabled && user && prefs === null) {
      getNotifPrefs(user.uid)
        .then(setPrefs)
        .catch(() => setPrefs({ ...DEFAULT_NOTIF_PREFS }));
    }
  }, [enabled, user, prefs]);

  if (!user) return null;

  async function toggle(next: boolean) {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      if (next) await subscribeToPush(user.uid);
      else await unsubscribeFromPush(user.uid);
      setEnabled(next);
    } catch (e) {
      // Si l'utilisateur vient de bloquer la pop-up, on bascule sur le message
      // « réautoriser » plutôt que l'erreur brute « Permission refusée ».
      const isDenied = permissionState() === "denied";
      setDenied(isDenied);
      if (!isDenied) {
        setError(e instanceof Error ? e.message : t("push.error", { defaultValue: "Une erreur est survenue" }));
      }
    } finally {
      setBusy(false);
    }
  }

  async function togglePref(type: NotifType, next: boolean) {
    if (!user || !prefs) return;
    const updated = { ...prefs, [type]: next };
    setPrefs(updated); // optimiste
    setPrefBusy(type);
    try {
      await saveNotifPrefs(user.uid, updated);
    } catch {
      setPrefs((p) => (p ? { ...p, [type]: !next } : p)); // rollback
    } finally {
      setPrefBusy(null);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">
              {t("push.title", { defaultValue: "Notifications" })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("push.description", {
                defaultValue:
                  "Rappels avant un service (1 semaine puis 3 jours) et alerte quand une setlist est prête.",
              })}
            </p>
          </div>
          {supported && !needsInstall && !denied && (
            <Switch
              checked={enabled}
              disabled={busy}
              onCheckedChange={toggle}
              aria-label={t("push.title", { defaultValue: "Notifications" })}
            />
          )}
        </div>

        {supported && !needsInstall && !denied && enabled && prefs && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Recevoir
            </p>
            {NOTIF_TYPES.map((type) => (
              <div key={type} className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{NOTIF_TYPE_LABELS[type]}</span>
                <Switch
                  checked={prefs[type]}
                  disabled={prefBusy === type}
                  onCheckedChange={(v) => togglePref(type, v)}
                  aria-label={NOTIF_TYPE_LABELS[type]}
                />
              </div>
            ))}
          </div>
        )}

        {!supported && (
          <p className="text-xs text-muted-foreground mt-3">
            {t("push.unsupported", {
              defaultValue: "Cet appareil ou ce navigateur ne supporte pas les notifications.",
            })}
          </p>
        )}

        {supported && needsInstall && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            {t("push.iosInstall", {
              defaultValue:
                "Sur iPhone/iPad : ajoute d'abord le site à l'écran d'accueil (Partager → « Sur l'écran d'accueil »), puis ouvre-le depuis l'icône pour activer les notifications.",
            })}
          </p>
        )}

        {supported && !needsInstall && denied && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            {t("push.blocked", {
              defaultValue:
                "Les notifications sont bloquées pour ce site dans ton navigateur. Pour les réactiver : clique sur l'icône à gauche de l'adresse (🔒) → Notifications → Autoriser, puis recharge la page.",
            })}
          </p>
        )}

        {error && <p className="text-xs text-destructive mt-3">{error}</p>}
      </CardContent>
    </Card>
  );
}
