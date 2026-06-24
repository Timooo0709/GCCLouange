export const SERVICE_ROLES = ["chanteur", "musicien", "presidence", "regie"] as const;
export type ServiceRole = (typeof SERVICE_ROLES)[number];

// Rôles « exécutants » : donnent le droit de créer/éditer des setlists du service
// où l'on sert. La régie en est exclue (accès en lecture seule aux cultes).
export const PERFORMER_ROLES: ServiceRole[] = ["chanteur", "musicien", "presidence"];

export const SERVICE_ROLE_LABELS: Record<ServiceRole, string> = {
  chanteur: "Choriste",
  musicien: "Musicien",
  presidence: "Présidence",
  regie: "Régie",
};

// Niveau d'accès à une catégorie de setlist, dérivé des rôles (cf. src/lib/access.ts).
export type AccessLevel = "view" | "create" | "edit";

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
  /** Rôles de service par catégorie de setlist (Culte Francophone, Campus, Groupe Paix,
   *  中班…). La présence d'une clé = la personne sert dans cette catégorie ; le tableau
   *  précise ses rôles (présidence / choriste / musicien / régie). Source unique des
   *  permissions — le niveau view/create/edit en est dérivé (cf. src/lib/access.ts). */
  serviceRoles: Record<string, ServiceRole[]>;
  /** Sections où la personne peut publier des annonces — attribué par les admins uniquement */
  annonces: string[];
  /** Audiences vers lesquelles la personne peut envoyer une notification manuelle
   *  (catégories culte/groupe/EDD, ou "*" pour tout le monde) — attribué par les
   *  admins uniquement. Cf. src/lib/push/audiences.ts. */
  notify: string[];
  /** Date d'inscription, écrite à la création du compte. Absent pour les comptes
   *  créés avant l'ajout de ce champ (juin 2026). */
  createdAt?: Date;
}

// ─── Préférences de notification push (par type) ─────────────────────────────
// Stockées dans un doc auto-géré notifPrefs/{uid} (le profil est verrouillé en
// édition). Le serveur filtre les envois automatiques selon ces préférences ;
// absence de doc/champ = activé. Les envois manuels (notifier/broadcast) ne sont
// PAS filtrés. Cf. src/lib/firebase/notifPrefs.ts + src/lib/push/recipients.ts.
export const NOTIF_TYPES = ["reminders", "setlists", "annonces"] as const;
export type NotifType = (typeof NOTIF_TYPES)[number];
export type NotifPrefs = Record<NotifType, boolean>;

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  reminders: true,
  setlists: true,
  annonces: true,
};

export const NOTIF_TYPE_LABELS: Record<NotifType, string> = {
  reminders: "Rappels de service",
  setlists: "Setlist prête",
  annonces: "Annonces",
};
