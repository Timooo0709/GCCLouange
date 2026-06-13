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

/** Rôles « équipe louange » du culte Franco : musiciens + régie + choristes.
 *  Cible des notifications « setlist prête » (exclut orateur/traduction et la
 *  présidence, qui est l'auteur de la setlist). */
export const LOUANGE_TEAM_ROLES = new Set([
  "Choriste", "Piano", "Guitare", "Batterie", "Sono", "PPT",
])
const GROUPE_ROLES: [number, string][] = [[1, "Présidence"], [2, "Musicien"], [3, "Orateur"]]
const FIDELITE_ROLES: [number, string][] = [[1, "Présidence"], [2, "Orateur"], [4, "Pianiste"]]
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

// ─── Mes Services ─────────────────────────────────────────────────────────────

export interface ServiceEntry {
  /** Date ISO (YYYY-MM-DD) */
  date: string
  /** Ex. "Culte Franco", "Groupe Paix", "EDD 中班" */
  service: string
  /** Ex. "Piano", "Présidence" */
  role: string
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
    for (const r of rows) {
      for (const [i, role] of roles) {
        if (cellHasName(r[i], name)) out.push({ date: r[0], service, role })
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
    if (cellHasName(s.ch, name)) out.push({ date: dt, service: moment, role: "Chant" })
    if (cellHasName(s.mu, name)) out.push({ date: dt, service: moment, role: "Musicien" })
    if (cellHasName(s.rg, name)) out.push({ date: dt, service: moment, role: "Régie" })
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.service.localeCompare(b.service))
}

// ─── Service du culte Franco à une date donnée (côté serveur) ──────────────────

export interface CulteServant {
  /** Graphie du nom telle qu'écrite dans le planning */
  name: string
  /** Ex. "Piano", "Présidence", "Sono" */
  role: string
}

/** Toutes les personnes de service au culte Franco (`data.culte`) à une date ISO
 *  donnée, avec leur rôle. Utilisé pour cibler les rappels J-7/J-3 et la notif
 *  « setlist prête ». Les noms sont en texte libre — l'appariement aux comptes
 *  se fait ensuite via normalizeName(). */
export function culteServantsForDate(data: PlanningData, dateISO: string): CulteServant[] {
  const out: CulteServant[] = []
  for (const r of data.culte) {
    if (r[0] !== dateISO) continue
    for (const [i, role] of CULTE_ROLES) {
      for (const name of splitNames(r[i] ?? "")) out.push({ name, role })
    }
  }
  return out
}
