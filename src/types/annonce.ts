export const ANNONCE_SECTIONS = [
  "Culte Francophone",
  "Groupe Paix",
  "Groupe Fidélité",
  "Groupe Bonté",
] as const;
export type AnnonceSection = (typeof ANNONCE_SECTIONS)[number];

export interface AnnonceLink {
  label: string;
  url: string;
}

export interface Annonce {
  id: string;
  section: AnnonceSection;
  title: string;
  /** Texte de l'annonce — les URLs y sont cliquables à l'affichage */
  body: string;
  links: AnnonceLink[];
  /** Images compressées côté navigateur, stockées en data-URL */
  images: string[];
  pinned: boolean;
  /** YYYY-MM-DD — l'annonce est masquée après cette date (null = jamais) */
  expiresAt: string | null;
  authorId: string;
  authorName: string;
  createdAt: Date | null;
}
