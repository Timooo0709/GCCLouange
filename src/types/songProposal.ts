export const SONG_PROPOSAL_STATUSES = ["pending", "accepted", "rejected"] as const;
export type SongProposalStatus = (typeof SONG_PROPOSAL_STATUSES)[number];

export interface SongProposal {
  id: string;
  /** Nom du chant proposé */
  title: string;
  /** Lien YouTube (obligatoire) */
  youtubeUrl: string;
  /** Lien vers une partition PDF (optionnel — URL, pas de fichier stocké) */
  pdfUrl: string;
  status: SongProposalStatus;
  /** uid de l'auteur de la proposition */
  authorId: string;
  /** Nom + prénom de l'auteur (affiché aux admins), email en repli */
  authorName: string;
  createdAt: Date | null;
}
