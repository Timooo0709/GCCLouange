import { useState, useEffect, useCallback, useRef } from "react";
import { getAnnoncesSince } from "@/lib/firebase/annonces";
import { getSetlistsSince } from "@/lib/firebase/setlists";
import { getNotifsSince } from "@/lib/firebase/notifications";
import { useProfile } from "@/lib/firebase/users";
import { visibleCategories, isAdminUser } from "@/lib/access";

// Notifications in-app par polling REST (jamais de listener WebChannel).
// Sources : annonces + setlists des catégories du profil, ET les notifications
// push ponctuelles persistées (collection `notifications` : manuelles, rappels,
// diffusions — cf. src/lib/push/notifications.ts), filtrées sur le destinataire.
// Le « vu » est par appareil (localStorage), comme le badge annonces historique.
//
// Coût Firestore : chaque rafraîchissement est INCRÉMENTAL — il ne lit que ce
// qui est apparu depuis la dernière fois (`latestTs`), via getAnnoncesSince /
// getSetlistsSince (where createdAt/updatedAt > since + limit). Au premier
// chargement on lit un lot borné (limit), ensuite ~0 lecture quand rien de neuf.
// Le polling est espacé (cf. POLL_INTERVAL_MS) + rafraîchi au retour de focus.
//
// N.B. ciblage volontairement différent du push : la cloche montre tout ce que
// le membre PEUT voir (catégories de son profil), tandis que le push « setlist
// prête » ne vise QUE l'équipe planifiée ce jour-là (résolue par nom de
// planning, cf. notify-setlist). Deux populations distinctes, par conception.

export const NOTIFICATIONS_LAST_SEEN_KEY = "notificationsLastSeen";

// Espacé volontairement : le polling toutes les minutes rescannait les
// collections entières et faisait exploser les lectures Firestore. Le retour de
// focus/visibilité rafraîchit en plus, donc une nouveauté reste vite visible.
const POLL_INTERVAL_MS = 10 * 60_000; // 10 min
const MAX_ITEMS = 20;

export interface NotificationItem {
  id: string;
  kind: "annonce" | "setlist-created" | "setlist-updated" | "manual" | "reminder" | "broadcast";
  title: string;
  /** Catégorie d'origine (annonce/setlist) ; vide pour les push ponctuels. */
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
  // Plus grande date déjà chargée : les requêtes suivantes ne lisent que l'après.
  const latestTsRef = useRef(0);
  // Miroir des items courants, pour fusionner sans dépendre du cycle de rendu.
  const itemsRef = useRef<NotificationItem[]>([]);

  const refresh = useCallback(async () => {
    if (!user || document.visibilityState !== "visible") return;
    try {
      const since = latestTsRef.current;
      const [annonces, setlists, notifs] = await Promise.all([
        getAnnoncesSince(since, MAX_ITEMS),
        getSetlistsSince(since, MAX_ITEMS),
        getNotifsSince(since, MAX_ITEMS),
      ]);

      const admin = isAdminUser(user);
      const cats = profile ? visibleCategories(profile) : [];

      // Nouveautés depuis `since` (mêmes filtres qu'avant : pas soi-même, et
      // seulement les sections/catégories où le membre sert — admins : tout).
      const fresh: NotificationItem[] = [];

      for (const a of annonces) {
        if (a.authorId === user.uid) continue;
        if (!admin && !cats.includes(a.section)) continue;
        const ts = a.createdAt?.getTime() ?? 0;
        if (!ts) continue;
        fresh.push({
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
        fresh.push({
          id: `setlist-${s.id}`,
          kind: updated > created ? "setlist-updated" : "setlist-created",
          title: s.title,
          category: s.category,
          date: ts,
          href: `/setlists/${s.id}`,
        });
      }

      // Push ponctuels (manuels / rappels / diffusions). Ciblage côté client :
      // on ne garde que ceux qui me visent (destinataire exact) ou diffusés à tous.
      for (const n of notifs) {
        if (!n.everyone && !n.recipients.includes(user.uid)) continue;
        const ts = n.createdAt?.getTime() ?? 0;
        if (!ts) continue;
        fresh.push({
          id: `push-${n.id}`,
          kind: n.kind,
          title: n.title,
          category: "",
          date: ts,
          href: n.url,
        });
      }

      // Fusion : items existants + nouveautés ; une setlist mise à jour écrase
      // son ancienne entrée (même id). Tri décroissant, on garde le top.
      const byId = new Map<string, NotificationItem>();
      for (const it of [...itemsRef.current, ...fresh]) byId.set(it.id, it);
      const merged = [...byId.values()].sort((a, b) => b.date - a.date).slice(0, MAX_ITEMS);

      itemsRef.current = merged;
      latestTsRef.current = merged.reduce((m, i) => Math.max(m, i.date), latestTsRef.current);

      const lastSeen = readLastSeen();
      setItems(merged);
      setUnreadCount(merged.filter((i) => i.date > lastSeen).length);
    } catch {
      /* réseau indisponible — on retentera au prochain tick */
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user) {
      itemsRef.current = [];
      latestTsRef.current = 0;
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
