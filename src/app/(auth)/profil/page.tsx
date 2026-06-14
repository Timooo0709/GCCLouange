"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile, saveProfile } from "@/lib/firebase/users";
import { canEditProfile } from "@/lib/access";
import {
  loadPlanningData,
  collectPlanningNames,
  deriveServiceRolesFromPlanning,
  type PlanningData,
} from "@/lib/planning/names";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ProfileFields,
  EMPTY_PROFILE_FORM,
  type ProfileFormValue,
} from "@/components/auth/ProfileFields";
import { PushToggle } from "@/components/push/PushToggle";

export default function ProfilPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, loading } = useProfile();

  const [form, setForm] = useState<ProfileFormValue | null>(null);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlanningData().then((d) => {
      setPlanningData(d);
      setPlanningNames(collectPlanningNames(d));
    });
  }, []);

  // Redirection si non connecté
  useEffect(() => {
    if (!loading && !user) router.replace("/login?from=/profil");
  }, [loading, user, router]);

  // Initialisation du formulaire une fois le profil chargé
  useEffect(() => {
    if (loading || form) return;
    if (profile) {
      setForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        planningName: profile.planningName,
        serviceRoles: profile.serviceRoles,
      });
    } else {
      setForm(EMPTY_PROFILE_FORM);
    }
  }, [loading, profile, form]);

  if (loading || !user || !form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form || !canEditProfile(user, profile)) return;
    setError("");
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError(t("profile.errorName"));
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        uid: user.uid,
        email: user.email ?? "",
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        planningName: form.planningName.trim(),
        // Droits de publication d'annonces : attribués par les admins, on les conserve tels quels
        annonces: profile?.annonces ?? [],
        // Droits d'envoi de notifications : idem, attribués par les admins
        notify: profile?.notify ?? [],
      });
      router.push("/setlists");
    } catch {
      setError(t("profile.saveError"));
      setSaving(false);
    }
  }

  const canEdit = canEditProfile(user, profile);
  const deriveFromPlanning = planningData
    ? (name: string) => deriveServiceRolesFromPlanning(planningData, name)
    : undefined;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-foreground">{t("profile.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </div>

        {!profile && (
          <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
            <AlertDescription className="text-inherit">
              {t("profile.welcome")}
            </AlertDescription>
          </Alert>
        )}

        {!canEdit && (
          <Alert className="mb-5">
            <AlertDescription>{t("profile.locked")}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <fieldset disabled={!canEdit} className={!canEdit ? "opacity-60" : undefined}>
                <ProfileFields
                  value={form}
                  onChange={setForm}
                  planningNames={planningNames}
                  deriveFromPlanning={deriveFromPlanning}
                />
              </fieldset>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {canEdit && (
            <Button type="submit" disabled={saving} className="w-full h-11">
              {saving ? t("profile.saving") : t("profile.save")}
            </Button>
          )}
        </form>

        {/* Notifications push — disponible une fois le profil créé */}
        {profile && (
          <div className="mt-5">
            <PushToggle />
          </div>
        )}
      </div>
    </div>
  );
}
