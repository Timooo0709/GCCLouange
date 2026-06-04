"use client";

import Link from "next/link";
import { Plus} from "lucide-react";
import { useTranslation } from "react-i18next";

export function HeaderActions() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 ml-auto">
      <Link
        href="/setlists/new"
        className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-[8px] border border-border bg-card text-muted-foreground hover:text-foreground text-[12.5px] font-semibold transition-all duration-150"
      >
        <Plus className="h-4 w-4" />
        {t("setlists.list.newButton")}
      </Link>
    </div>
  );
}