export const SERVICE_ROLES = ["chanteur", "musicien", "presidence", "regie"] as const;
export type ServiceRole = (typeof SERVICE_ROLES)[number];

// Rôles « exécutants » : donnent le droit de créer/éditer des setlists du culte
// où l'on sert. La régie en est exclue (accès en lecture seule aux cultes).
export const PERFORMER_ROLES: ServiceRole[] = ["chanteur", "musicien", "presidence"];

export const SERVICE_ROLE_LABELS: Record<ServiceRole, string> = {
  chanteur: "Chanteur",
  musicien: "Musicien",
  presidence: "Présidence",
  regie: "Régie",
};

export const SERVICE_LIEUX = [
  "Culte Francophone",
  "Intergroupe",
  "Interfranco",
  "Campus",
] as const;
export type ServiceLieu = (typeof SERVICE_LIEUX)[number];

export const EDD_ROLES = ["musicien", "presidence"] as const;
export type EddRole = (typeof EDD_ROLES)[number];

export const GROUPES = ["Groupe Paix", "Groupe Fidélité", "Groupe Bonté"] as const;
export type Groupe = (typeof GROUPES)[number];

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Nom tel qu'il apparaît dans les plannings (ex. "David C.") — vide si pas encore dans les plannings */
  planningName: string;
  /** Rôles de service à l'église (vide si la personne ne sert pas) */
  roles: ServiceRole[];
  /** Lieux où la personne sert */
  lieux: ServiceLieu[];
  /** Sert à l'École du Dimanche */
  edd: boolean;
  eddRoles: EddRole[];
  groupe: Groupe | null;
  /** Musicien dans son groupe */
  groupeMusicien: boolean;
  /** Sections où la personne peut publier des annonces — attribué par les admins uniquement */
  annonces: string[];
}
