import type { CampusSeance, EddDataStructure } from "./utils"
import { EDD_CLASSES, EDD_PERIODES } from "./utils"
import {
  CULTE_FALLBACK, DEJEUNER_FALLBACK, PAIX_FALLBACK, FIDELITE_FALLBACK,
  FIDELITE_MUSIC_FALLBACK, BONTE_FALLBACK, EDD_FALLBACK, CAMP_LOUANGE_FALLBACK,
} from "./data"
import {
  fetchCulte, fetchDejeuner, fetchPaix, fetchFidelite,
  fetchFideliteMusic, fetchBonte, fetchEDD, fetchCampus, inferYear,
} from "./sheets"
import type { ServiceRole } from "@/types/user"

export interface PlanningData {
  culte: string[][]
  dejeuner: string[][]
  paix: string[][]
  fidelite: string[][]
  fideliteMusic: string[][]
  bonte: string[][]
  edd: EddDataStructure
  campus: CampusSeance[]
}

export async function loadPlanningData(): Promise<PlanningData> {
  const [culte, dejeuner, paix, fidelite, fideliteMusic, bonte, edd, campus] =
    await Promise.all([
      fetchCulte(), fetchDejeuner(), fetchPaix(), fetchFidelite(),
      fetchFideliteMusic(), fetchBonte(), fetchEDD(),
      fetchCampus().then(c => c.louange).catch(() => [] as CampusSeance[]),
    ])
  return {
    culte: culte.length ? culte : CULTE_FALLBACK,
    dejeuner: dejeuner.length ? dejeuner : DEJEUNER_FALLBACK,
    paix: paix.length ? paix : PAIX_FALLBACK,
    fidelite: fidelite.length ? fidelite : FIDELITE_FALLBACK,
    fideliteMusic: fideliteMusic.length ? fideliteMusic : FIDELITE_MUSIC_FALLBACK,
    bonte: bonte.length ? bonte : BONTE_FALLBACK,
    edd: Object.values(edd).some(p => Object.values(p.classes).some(r => r.length)) ? edd : EDD_FALLBACK,
    campus: campus.length ? campus : CAMP_LOUANGE_FALLBACK,
  }
}

// ─── Extraction des noms ──────────────────────────────────────────────────────

// Valeurs des colonnes "personnes" qui ne sont pas des noms
const NON_NAMES = new Set([
  "", "—", "---", "intergroupe", "inter franco", "interfranco", "louange",
  "gr louange", "grp louange", "activites", "activités", "sermon",
  "anniversaire grace church", "communion fraternelle", "equipe", "équipe",
])

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

/** Normalisation publique d'un nom de planning (accents/casse/espaces) \u2014 sert \u00e0
 *  apparier `planningName` d'un profil aux noms du Google Sheet c\u00f4t\u00e9 serveur. */
export function normalizeName(s: string): string {
  return normalize(s)
}

/** Découpe une cellule de planning en noms : gère "A, B", "Piano: X, Guitare: Y"… */
function splitNames(cell: string): string[] {
  return cell
    .replace(/"+/g, "")
    .split(/[,，;；/]/)
    .map(part => part.replace(/^[^:：]{1,12}[:：]\s*/, "").trim())
    .filter(name =>
      name.length > 1 &&
      !/\d/.test(name) &&
      !NON_NAMES.has(normalize(name))
    )
}

function cellHasName(cell: string | undefined, name: string): boolean {
  if (!cell) return false
  const target = normalize(name)
  return splitNames(cell).some(n => normalize(n) === target)
}

// Colonnes "personnes" de chaque planning : index → rôle affiché
const CULTE_ROLES: [number, string][] = [
  [1, "Présidence"], [2, "Choriste"], [3, "Choriste"], [4, "Piano"],
  [5, "Guitare"], [6, "Batterie"], [7, "Sono"], [8, "PPT"],
  [9, "Orateur"], [10, "Traduction"],
]

const GROUPE_ROLES: [number, string][] = [[1, "Présidence"], [2, "Musicien"], [3, "Orateur"]]
const FIDELITE_ROLES: [number, string][] = [[1, "Présidence"], [2, "Orateur"], [4, "Piano"]]
const FIDELITE_MUSIC_ROLES: [number, string][] = [[1, "Présidence"], [2, "Piano"], [3, "Guitare"], [4, "Batterie"]]
const EDD_ROLES_COLS: [number, string][] = [[1, "Présidence"], [2, "Suppléant"], [3, "Piano"], [4, "Cajon"], [5, "Guitare"]]

/** Liste alphabétique de tous les noms apparaissant dans les plannings (pour le formulaire d'inscription). */
export function collectPlanningNames(data: PlanningData): string[] {
  const seen = new Map<string, string>() // normalisé → première graphie rencontrée
  const add = (cell: string | undefined) => {
    if (!cell) return
    for (const name of splitNames(cell)) {
      const key = normalize(name)
      if (!seen.has(key)) seen.set(key, name)
    }
  }

  for (const r of data.culte) for (const [i] of CULTE_ROLES) add(r[i])
  for (const r of data.dejeuner) add(r[1])
  for (const r of data.paix) for (const [i] of GROUPE_ROLES) add(r[i])
  for (const r of data.bonte) for (const [i] of GROUPE_ROLES) add(r[i])
  for (const r of data.fidelite) for (const [i] of FIDELITE_ROLES) add(r[i])
  for (const r of data.fideliteMusic) for (const [i] of FIDELITE_MUSIC_ROLES) add(r[i])
  for (const pk of EDD_PERIODES) {
    const classes = data.edd[pk]?.classes ?? {}
    for (const cls of EDD_CLASSES) {
      for (const r of classes[cls] ?? []) for (const [i] of EDD_ROLES_COLS) add(r[i])
    }
  }
  for (const s of data.campus) { add(s.ch); add(s.mu); add(s.rg) }

  return [...seen.values()].sort((a, b) => a.localeCompare(b, "fr"))
}

// ─── Dérivation des rôles de service depuis le planning (pré-remplissage profil) ──

// Colonnes « personnes » → ServiceRole (null = présence sans rôle setlist : orateur
// de groupe = simple membre). Les colonnes culte Orateur/Traduction ne sont pas
// listées (pas d'accès setlist). Mêmes index que les *_ROLES ci-dessus.
const CULTE_ROLE_MAP: [number, ServiceRole | null][] = [
  [1, "presidence"], [2, "chanteur"], [3, "chanteur"], [4, "musicien"],
  [5, "musicien"], [6, "musicien"], [7, "regie"], [8, "regie"],
]
const GROUPE_ROLE_MAP: [number, ServiceRole | null][] = [[1, "presidence"], [2, "musicien"], [3, null]]
const FIDELITE_ROLE_MAP: [number, ServiceRole | null][] = [[1, "presidence"], [2, null], [4, "musicien"]]
const FIDELITE_MUSIC_ROLE_MAP: [number, ServiceRole | null][] = [[1, "presidence"], [2, "musicien"], [3, "musicien"], [4, "musicien"]]
const EDD_ROLE_MAP: [number, ServiceRole | null][] = [[1, "presidence"], [2, null], [3, "musicien"], [4, "musicien"], [5, "musicien"]]

/** Rôles de service par catégorie déduits du planning pour `name` (union sur l'année
 *  des feuilles chargées). Sert à pré-remplir le profil — l'utilisateur/admin ajuste
 *  ensuite. Une présence dans une colonne ajoute la catégorie (membership) même sans
 *  rôle précis (null). Intergroupe/Interfranco absents du planning → non pré-remplis. */
export function deriveServiceRolesFromPlanning(
  data: PlanningData,
  name: string
): Record<string, ServiceRole[]> {
  const sr: Record<string, ServiceRole[]> = {}
  if (!name.trim()) return sr
  const ensure = (cat: string) => { if (!(cat in sr)) sr[cat] = [] }
  const addRole = (cat: string, role: ServiceRole | null) => {
    ensure(cat)
    if (role && !sr[cat].includes(role)) sr[cat].push(role)
  }
  const scan = (rows: string[][], cat: string, cols: [number, ServiceRole | null][]) => {
    for (const r of rows) for (const [i, role] of cols) if (cellHasName(r[i], name)) addRole(cat, role)
  }

  scan(data.culte, "Culte Francophone", CULTE_ROLE_MAP)
  scan(data.paix, "Groupe Paix", GROUPE_ROLE_MAP)
  scan(data.bonte, "Groupe Bonté", GROUPE_ROLE_MAP)
  scan(data.fidelite, "Groupe Fidélité", FIDELITE_ROLE_MAP)
  scan(data.fideliteMusic, "Groupe Fidélité", FIDELITE_MUSIC_ROLE_MAP)
  for (const pk of EDD_PERIODES) {
    const classes = data.edd[pk]?.classes ?? {}
    for (const cls of EDD_CLASSES) scan(classes[cls] ?? [], cls, EDD_ROLE_MAP)
  }
  for (const s of data.campus) {
    if (cellHasName(s.ch, name)) addRole("Campus", "chanteur")
    if (cellHasName(s.mu, name)) addRole("Campus", "musicien")
    if (cellHasName(s.rg, name)) addRole("Campus", "regie")
  }

  return sr
}

// ─── Mes Services ─────────────────────────────────────────────────────────────

export interface ServiceEntry {
  /** Date ISO (YYYY-MM-DD) */
  date: string
  /** Ex. "Culte Franco", "Groupe Paix", "EDD 中班" */
  service: string
  /** Ex. "Piano", "Présidence" */
  role: string
  /** Heure (répétitions campus uniquement, ex. "17:00") */
  time?: string
  /** Lieu (répétitions campus uniquement, ex. "Grande Salle") */
  location?: string
  /** Date à utiliser pour retrouver la setlist quand elle diffère de `date`
   *  (répétitions campus : pointe vers la setlist de la séance). */
  setlistDate?: string
  /** Président de la séance — désambiguïse les setlists campus matin/soir
   *  d'un même jour (même date + catégorie, présidents différents). */
  leader?: string
}

/** Date d'une séance campus ("12/3 Matin") → ISO, même convention d'année que parseDate. */
function campusDate(label: string): string | null {
  const m = label.match(/^(\d{1,2})\/(\d{1,2})/)
  if (!m) return null
  return `${inferYear(+m[1], +m[2])}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
}

/** Toutes les dates où `name` apparaît dans les plannings, triées chronologiquement. */
export function findMyServices(data: PlanningData, name: string): ServiceEntry[] {
  if (!name.trim()) return []
  const out: ServiceEntry[] = []
  const scan = (rows: string[][], service: string, roles: [number, string][]) => {
    // Colonne « Présidence » du planning → président de la séance, qui sert à
    // retrouver la bonne setlist quand plusieurs existent le même jour.
    const presCol = roles.find(([, role]) => role === "Présidence")?.[0]
    for (const r of rows) {
      const leader = presCol != null ? (splitNames(r[presCol] ?? "")[0] ?? "") : ""
      for (const [i, role] of roles) {
        if (cellHasName(r[i], name)) out.push({ date: r[0], service, role, leader })
      }
    }
  }

  scan(data.culte, "Culte Franco", CULTE_ROLES)
  scan(data.dejeuner, "Prépa. Table", [[1, "Équipe"]])
  scan(data.paix, "Groupe Paix", GROUPE_ROLES)
  scan(data.bonte, "Groupe Bonté", GROUPE_ROLES)
  scan(data.fidelite, "Groupe Fidélité", FIDELITE_ROLES)
  scan(data.fideliteMusic, "Groupe Fidélité", FIDELITE_MUSIC_ROLES)
  for (const pk of EDD_PERIODES) {
    const classes = data.edd[pk]?.classes ?? {}
    for (const cls of EDD_CLASSES) {
      scan(classes[cls] ?? [], `EDD ${cls}`, EDD_ROLES_COLS)
    }
  }
  for (const s of data.campus) {
    const dt = campusDate(s.d)
    if (!dt) continue
    const moment = s.d.includes("Soir") ? "Campus (soir)" : "Campus (matin)"
    // Président de la séance (1ʳᵉ personne de `ch`) : matin et soir d'un même
    // jour ont des présidents différents → sert à retrouver la bonne setlist.
    const leader = s.ch.split(",")[0]?.trim() || ""
    const roles: string[] = []
    if (cellHasName(s.ch, name)) roles.push("Chant")
    if (cellHasName(s.mu, name)) roles.push("Musicien")
    if (cellHasName(s.rg, name)) roles.push("Régie")
    for (const role of roles) {
      out.push({ date: dt, service: moment, role, leader })
      // Répétition associée : date / heure / lieu propres, distincts de la séance.
      // setlistDate = date de la séance pour lier la setlist (chants à réviser).
      if (s.ent) out.push({ date: s.ent, service: "Campus (répét.)", role, time: s.entTime, location: s.entLieu, setlistDate: dt, leader })
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.service.localeCompare(b.service))
}

/** Catégorie de setlist correspondant à un libellé de service de findMyServices
 *  (null si pas de setlists pour ce service, ex. Prépa. Table). */
export function serviceCategory(service: string): string | null {
  if (service === "Culte Franco") return "Culte Francophone"
  if (service.startsWith("Groupe ")) return service
  if (service.startsWith("EDD ")) return service.slice(4)
  if (service.startsWith("Campus")) return "Campus"
  return null
}

// ─── Personnes de service à une date — tous services (côté serveur) ────────────

// Colonnes culte pour le ciblage notifications : CULTE_ROLE_MAP + Orateur/Traduction
// (inclus pour les rappels « tu sers » ; serviceRole null → exclus de « setlist prête »).
const CULTE_NOTIFY_MAP: [number, ServiceRole | null][] = [...CULTE_ROLE_MAP, [9, null], [10, null]]

export interface Servant {
  /** Graphie du nom telle qu'écrite dans le planning */
  name: string
  /** Catégorie de setlist (Culte Francophone, Groupe Paix, 中班, Campus…) ;
   *  null = Prépa. Table (présence sans catégorie de setlist) */
  category: string | null
  /** Rôle de service ; null = présence sans rôle exécutant (orateur, suppléant…) */
  serviceRole: ServiceRole | null
  /** Président de séance (1ʳᵉ personne de la colonne Présidence / du chant campus) —
   *  désambiguïse les séances Campus matin/soir d'un même jour */
  leader: string
}

/** Toutes les personnes de service à une date ISO donnée, tous services confondus,
 *  avec catégorie et rôle. Inverse de findMyServices restreint à une date. Cible des
 *  rappels (tous services, via `name`) et de « setlist prête » (filtré par catégorie
 *  + niveau d'accès). Noms en texte libre → appariement aux comptes via normalizeName(). */
export function servantsForDate(data: PlanningData, dateISO: string): Servant[] {
  const out: Servant[] = []
  const scan = (rows: string[][], category: string, cols: [number, ServiceRole | null][]) => {
    const presCol = cols.find(([, role]) => role === "presidence")?.[0]
    for (const r of rows) {
      if (r[0] !== dateISO) continue
      const leader = presCol != null ? (splitNames(r[presCol] ?? "")[0] ?? "") : ""
      for (const [i, role] of cols) {
        for (const name of splitNames(r[i] ?? "")) out.push({ name, category, serviceRole: role, leader })
      }
    }
  }

  scan(data.culte, "Culte Francophone", CULTE_NOTIFY_MAP)
  scan(data.paix, "Groupe Paix", GROUPE_ROLE_MAP)
  scan(data.bonte, "Groupe Bonté", GROUPE_ROLE_MAP)
  scan(data.fidelite, "Groupe Fidélité", FIDELITE_ROLE_MAP)
  scan(data.fideliteMusic, "Groupe Fidélité", FIDELITE_MUSIC_ROLE_MAP)
  for (const pk of EDD_PERIODES) {
    const classes = data.edd[pk]?.classes ?? {}
    for (const cls of EDD_CLASSES) scan(classes[cls] ?? [], cls, EDD_ROLE_MAP)
  }
  // Prépa. Table : présence simple, sans catégorie de setlist ni rôle.
  for (const r of data.dejeuner) {
    if (r[0] !== dateISO) continue
    for (const name of splitNames(r[1] ?? "")) out.push({ name, category: null, serviceRole: null, leader: "" })
  }
  // Campus : date via le label ; matin/soir distingués par le leader.
  for (const s of data.campus) {
    if (campusDate(s.d) !== dateISO) continue
    const leader = s.ch.split(",")[0]?.trim() || ""
    for (const name of splitNames(s.ch)) out.push({ name, category: "Campus", serviceRole: "chanteur", leader })
    for (const name of splitNames(s.mu)) out.push({ name, category: "Campus", serviceRole: "musicien", leader })
    for (const name of splitNames(s.rg)) out.push({ name, category: "Campus", serviceRole: "regie", leader })
  }

  return out
}

export interface Rehearsal {
  /** Graphie du nom telle qu'écrite dans le planning */
  name: string
  /** Heure de la répétition (ex. "17:00"), "" si non renseignée */
  time: string
  /** Lieu de la répétition (ex. "Grande Salle"), "" si non renseigné */
  location: string
}

/** Participants d'une répétition Campus dont la date (`s.ent`, déjà ISO) == dateISO,
 *  avec heure et lieu. Les participants = ceux de la séance (chant + musiciens + régie).
 *  Cible des rappels de répétition. */
export function rehearsalsForDate(data: PlanningData, dateISO: string): Rehearsal[] {
  const out: Rehearsal[] = []
  for (const s of data.campus) {
    if (s.ent !== dateISO) continue
    const time = s.entTime ?? ""
    const location = s.entLieu ?? ""
    for (const name of [...splitNames(s.ch), ...splitNames(s.mu), ...splitNames(s.rg)]) {
      out.push({ name, time, location })
    }
  }
  return out
}
