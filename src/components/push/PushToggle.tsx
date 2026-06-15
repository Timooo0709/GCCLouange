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
