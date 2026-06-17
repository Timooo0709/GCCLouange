import { EDD_CLASSES } from "@/lib/planning/utils";
import type { FSSetlist } from "@/lib/firebase/setlists";
import {
  GROUPES,
  type AccessLevel,
  type ServiceRole,
  type UserProfile,
} from "@/types/user";

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

/** Modification du profil : autorisée tant qu'il n'existe pas encore (première
 *  complétion par l'intéressé) ; une fois complété, réservé aux admins.
 *  Miroir serveur dans firestore.rules (users/{uid} : create libre, update admin). */
export function canEditProfile(
  user: { email?: string | null } | null,
  profile: UserProfile | null
): boolean {
  return isAdminUser(user) || !profile;
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

const LEVEL_RANK: Record<AccessLevel, number> = { view: 0, create: 1, edit: 2 };

const isGroupeOrEdd = (category: string): boolean =>
  (GROUPES as readonly string[]).includes(category) ||
  (EDD_CLASSES as readonly string[]).includes(category);

/** Niveau d'accès d'une personne à une catégorie, dérivé de ses rôles dans cette
 *  catégorie. Échelon view < create < edit :
 *   - musicien → edit ;
 *   - choriste / présidence → create ;
 *   - sans rôle exécutant : groupe & EDD = membre (create) ; culte = view
 *     (régie, observateur — le lieu donne la visibilité). */
export function categoryLevel(category: string, roles: ServiceRole[]): AccessLevel {
  if (roles.includes("musicien")) return "edit";
  if (roles.includes("chanteur") || roles.includes("presidence")) return "create";
  return isGroupeOrEdd(category) ? "create" : "view";
}

/** Catégories visibles (la personne y sert, tout niveau) : la régie voit ses cultes en lecture seule. */
export function visibleCategories(profile: UserProfile): string[] {
  return Object.keys(profile.serviceRoles);
}

/** Catégories où la personne peut CRÉER une setlist (niveau ≥ create — la régie en est exclue). */
export function creatableCategories(profile: UserProfile): string[] {
  return Object.keys(profile.serviceRoles).filter(
    (c) => LEVEL_RANK[categoryLevel(c, profile.serviceRoles[c])] >= LEVEL_RANK.create
  );
}

/** Peut-on créer au moins une setlist (bouton « Créer ») ? Admins toujours. */
export function canCreateSetlist(
  user: { email?: string | null } | null,
  profile: UserProfile | null
): boolean {
  if (isAdminUser(user)) return true;
  return !!profile && creatableCategories(profile).length > 0;
}

/** Peut-on dupliquer cette setlist ? Dupliquer crée une copie dans la même catégorie,
 *  donc réservé à qui peut créer dans cette catégorie (la régie en est exclue). */
export function canDuplicateSetlist(
  user: { email?: string | null } | null,
  profile: UserProfile | null,
  setlist: FSSetlist
): boolean {
  if (isAdminUser(user)) return true;
  return !!profile && creatableCategories(profile).includes(setlist.category);
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

/** Modification : créateur de la setlist + niveau « edit » sur la catégorie (musicien) (+ admins). */
export function canEditSetlist(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist
): boolean {
  if (setlist.ownerId === user.uid) return true;
  if (setlist.isPrivate) return false;
  if (isAdminUser(user)) return true;
  const roles = profile?.serviceRoles[setlist.category];
  return roles ? categoryLevel(setlist.category, roles) === "edit" : false;
}
