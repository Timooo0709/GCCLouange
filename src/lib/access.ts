import { EDD_CLASSES } from "@/lib/planning/utils";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { UserProfile } from "@/types/user";

// Comptes administrateurs (doivent aussi figurer dans firestore.rules)
export const ADMIN_EMAILS = [
  "tc328829@gmail.com",
  "gcccfranco@gmail.com",
  "david.code999@gmail.com",
];

type AuthUser = { uid: string; email?: string | null };

export function isAdminUser(user: { email?: string | null } | null): boolean {
  return !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

/** Publication d'annonces : droit attribué par les admins (par section) — admins toujours autorisés. */
export function canPublishAnnonce(
  user: { email?: string | null } | null,
  profile: { annonces?: string[] } | null,
  section: string
): boolean {
  if (isAdminUser(user)) return true;
  return (profile?.annonces ?? []).includes(section);
}

/** Catégories de setlists visibles selon le profil : lieux de service + classes EDD + groupe. */
export function visibleCategories(profile: UserProfile): string[] {
  const cats: string[] = [...profile.lieux];
  if (profile.edd) cats.push(...EDD_CLASSES);
  if (profile.groupe) cats.push(profile.groupe);
  return cats;
}

export function canSeeSetlist(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist
): boolean {
  if (setlist.ownerId === user.uid) return true;
  if (setlist.isPrivate) return false;
  if (isAdminUser(user)) return true;
  return profile ? visibleCategories(profile).includes(setlist.category) : false;
}

/** La personne est-elle musicienne dans le service correspondant à cette catégorie ? */
export function isMusicienOf(profile: UserProfile, category: string): boolean {
  if (
    profile.roles.includes("musicien") &&
    (profile.lieux as readonly string[]).includes(category)
  ) {
    return true;
  }
  if (
    profile.edd &&
    profile.eddRoles.includes("musicien") &&
    (EDD_CLASSES as readonly string[]).includes(category)
  ) {
    return true;
  }
  return profile.groupe === category && profile.groupeMusicien;
}

/** Modification : créateur de la setlist + musiciens du même service (+ admins). */
export function canEditSetlist(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist
): boolean {
  if (setlist.ownerId === user.uid) return true;
  if (setlist.isPrivate) return false;
  if (isAdminUser(user)) return true;
  return profile ? isMusicienOf(profile, setlist.category) : false;
}
