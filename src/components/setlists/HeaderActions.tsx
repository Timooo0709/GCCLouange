"use client";

import Link from "next/link";
import { Plus, LogIn, LogOut } from "lucide-react";
import { useAuth, logOut } from "@/lib/firebase/auth";
import { useTranslation } from "react-i18next";

export function HeaderActions() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();

  return (
    <div className="flex items-center gap-3 ml-auto">
      {!authLoading && (
        user ? (
          <button
            onClick={() => logOut()}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("common.header.logout")}
          </button>
        ) : (
          <Link
            href="/login?from=/setlists"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogIn className="h-3.5 w-3.5" />
            {t("common.header.login")}
          </Link>
        )
      )}
      <Link
        href="/setlists/new"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
      >
        <Plus className="h-4 w-4" />
        {t("setlists.list.newButton")}
      </Link>
    </div>
  );
}