export const REPORT_STATUSES = ["pending", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// "song" : problème sur un chant précis · "site" : problème général sur le site.
export const REPORT_KINDS = ["song", "site"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export interface Report {
  id: string;
  kind: ReportKind;
  /** Résumé court (sujet du signalement) */
  title: string;
  /** Détails libres (optionnel) */
  description: string;
  /** Chant concerné — uniquement si kind === "song" */
  songSlug: string;
  songTitle: string;
  /** Page d'où le signalement a été envoyé */
  pageUrl: string;
  status: ReportStatus;
  /** uid de l'auteur (connecté) */
  authorId: string;
  /** Nom + prénom de l'auteur (affiché aux admins), email en repli */
  authorName: string;
  authorEmail: string;
  createdAt: Date | null;
}
