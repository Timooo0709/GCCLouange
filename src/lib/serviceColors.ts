// Couleurs des services — alignées sur les pages planning
// (culte, campus, EDD, table, groupes) pour une identité visuelle cohérente.

export const CATEGORY_COLORS: Record<string, string> = {
  "Culte Francophone": "#2d5a65",
  "Intergroupe": "#a87b0f",
  "Interfranco": "#9d3c63",
  "Campus": "#2471a3",
  "Groupe Paix": "#6b4a8e",
  "Groupe Fidélité": "#a03030",
  "Groupe Bonté": "#8b4a2e",
  "中班": "#3b6d11",
  "大班": "#3b6d11",
  "高班": "#3b6d11",
};

/** Couleur d'une catégorie de setlist. */
export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#64748b";
}

/** Libellé court d'une catégorie de setlist/service pour l'affichage (pastilles,
 *  sélecteurs, notifications). Seul « Culte Francophone » est raccourci ; les
 *  autres catégories (Interfranco, groupes, classes EDD…) s'affichent telles
 *  quelles. Source unique — évite les abréviations divergentes ("Intergroupe fr."
 *  était ambigu face à la catégorie « Intergroupe »). */
export function categoryLabel(category: string): string {
  return category === "Culte Francophone" ? "Culte Franco" : category;
}

/** Couleur d'un service tel qu'affiché dans Mes Services ("Culte Franco", "EDD 中班"…). */
export function serviceColor(service: string): string {
  if (service.startsWith("EDD")) return "#3b6d11";
  if (service.startsWith("Campus")) return "#2471a3";
  if (service === "Culte Franco") return "#2d5a65";
  if (service === "Prépa. Table") return "#c87941";
  return CATEGORY_COLORS[service] ?? "#64748b";
}
