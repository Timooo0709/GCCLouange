"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import { SetlistForm } from "@/components/setlists/SetlistForm";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";

export function CreateSetlistClient() {
  const { t } = useTranslation();
  const { user, profile, loading } = useProfile();
  const [songs, setSongs] = useState<SongIndexEntry[]>([]);

  useEffect(() => {
    fetch("/songs-index.json")
      .then((r) => r.json())
      .then((data) => setSongs(data.songs ?? []));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.list.loginRequired")}</p>
        <Link href="/login?from=/setlists/new" className="text-sm text-primary hover:underline">
          {t("common.header.login")}
        </Link>
      </div>
    );
  }

  if (!profile && !isAdminUser(user)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.list.profileRequired")}</p>
        <Link href="/profil" className="text-sm text-primary hover:underline">
          {t("common.header.profile")}
        </Link>
      </div>
    );
  }

  return <SetlistForm mode="create" songs={songs} />;
}
