"use client";

// Garde d'accès des pages réservées aux membres : redirige les visiteurs
// non connectés vers /login (avec retour vers la page demandée).

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?from=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
