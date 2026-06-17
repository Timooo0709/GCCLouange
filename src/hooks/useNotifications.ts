import { useState, useEffect, useCallback } from "react";
import { getAnnonces, invalidateAnnonces } from "@/lib/firebase/annonces";
import { getSetlists } from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { visibleCategories, isAdminUser } from "@/lib/access";

// Notifications in-app par polling REST (jamais de listener WebChannel).
// Sources : annonces + setlists des catégories du profil. Le « vu » est
// par appareil (localStorage), comme le badge annonces historique.
//
// N.B. ciblage volontairement différent du push : la cloche montre tout ce que
// le membre PEUT voir (catégories de son profil), tandis que le push « setlist
// prête » ne vise QUE l'équipe planifiée ce jour-là (résolue par nom de
// planning, cf. notify-setlist). Deux populations distinctes, par conception.

export const NOTIFICATIONS_LAST_SEEN_KEY = "notificationsLastSeen";

const POLL_INTERVAL_MS = 60_000;
const MAX_ITEMS = 20;

export interface NotificationItem {
  id: string;
  kind: "annonce" | "setlist-created" | "setlist-updated";
  title: string;
  category: string;
  date: number; // millis
  href: string;
}

function readLastSeen(): number {
  try {
    return Number(localStorage.getItem(NOTIFICATIONS_LAST_SEEN_KEY) ?? 0);
  } catch {
    return 0;
  }
}

export function useNotifications() {
  const { user, profile } = useProfile();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user || document.visibilityState !== "visible") return;
    try {
      invalidateAnnonces();
      const [annonces, setlists] = await Promise.all([getAnnonces(), getSetlists()]);

      const admin = isAdminUser(user);
      const cats = profile ? visibleCategories(profile) : [];

      const list: NotificationItem[] = [];

      for (const a of annonces) {
        if (a.authorId === user.uid) continue; // pas de notification pour soi-même
        // Comme les setlists : seulement les sections où le membre sert (admins : tout).
        if (!admin && !cats.includes(a.section)) continue;
        const ts = a.createdAt?.getTime() ?? 0;
        if (!ts) continue;
        list.push({
          id: `annonce-${a.id}`,
          kind: "annonce",
          title: a.title,
          category: a.section,
          date: ts,
          href: "/annonces",
        });
      }

      for (const s of setlists) {
        if (s.ownerId === user.uid) continue;
        if (!admin && !cats.includes(s.category)) continue;
        const created = s.createdAt?.getTime() ?? 0;
        const updated = s.updatedAt?.getTime() ?? 0;
        const ts = Math.max(created, updated);
        if (!ts) continue;
        list.push({
          id: `setlist-${s.id}`,
          kind: updated > created ? "setlist-updated" : "setlist-created",
          title: s.title,
          category: s.category,
          date: ts,
          href: `/setlists/${s.id}`,
        });
      }

      list.sort((a, b) => b.date - a.date);
      const top = list.slice(0, MAX_ITEMS);
      const lastSeen = readLastSeen();
      setItems(top);
      setUnreadCount(top.filter((i) => i.date > lastSeen).length);
    } catch {
      /* réseau indisponible — on retentera au prochain tick */
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [user, refresh]);

  const markAllSeen = useCallback(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, String(Date.now()));
    } catch {
      /* stockage indisponible */
    }
    setUnreadCount(0);
  }, []);

  return { items, unreadCount, markAllSeen };
}
