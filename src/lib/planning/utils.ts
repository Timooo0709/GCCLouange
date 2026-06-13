export const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
export const JOURC = ["dim","lun","mar","mer","jeu","ven","sam"]

export const EDD_PERIODES = ["P1_JanFev","P2_MarAvr","P3_MaiJun","P4_JulAou","P5_SepOct","P6_NovDec"] as const
export const EDD_PERIODES_LABELS = ["Janv–Fév","Mars–Avr","Mai–Jun","Juil–Aoû","Sep–Oct","Nov–Déc"]
export const EDD_CLASSES = ["中班","大班","高班"] as const

export type EddPeriode = typeof EDD_PERIODES[number]
export type EddClasse = typeof EDD_CLASSES[number]

function pad(n: number) { return String(n).padStart(2, "0") }

export function getMois(dateStr: string) { return parseInt(dateStr.split("-")[1]) }

export function getTri(dateStr: string) {
  const m = getMois(dateStr)
  return m <= 3 ? "T1" : m <= 6 ? "T2" : m <= 9 ? "T3" : "T4"
}

export function getCurrentTri() {
  const m = new Date().getMonth() + 1
  return m <= 3 ? "T1" : m <= 6 ? "T2" : m <= 9 ? "T3" : "T4"
}

export function filterByTri(rows: string[][], tri: string, idx = 0) {
  return rows.filter(r => getTri(r[idx]) === tri)
}

export function fdShort(dateStr: string) {
  const [, mm, dd] = dateStr.split("-")
  return `${parseInt(dd)}/${parseInt(mm)}`
}

export function fdLong(dateStr: string) {
  const [, mm, dd] = dateStr.split("-")
  return `${parseInt(dd)} ${MOIS[parseInt(mm)-1]}`
}

export function currentSundayStr() {
  const d = new Date()
  const day = d.getDay()
  const sun = new Date(d)
  if (day !== 0) sun.setDate(d.getDate() + (7 - day))
  return `${sun.getFullYear()}-${pad(sun.getMonth()+1)}-${pad(sun.getDate())}`
}

export function isFirstSundayOfMonth(dateStr: string, allRows: string[][]): boolean {
  const m = getMois(dateStr)
  for (const row of allRows) {
    if (getMois(row[0]) === m) return row[0] === dateStr
  }
  return false
}

export function getCurrentEddPeriode(): EddPeriode {
  const m = new Date().getMonth() + 1
  return EDD_PERIODES[m <= 2 ? 0 : m <= 4 ? 1 : m <= 6 ? 2 : m <= 8 ? 3 : m <= 10 ? 4 : 5]
}

export interface CampusSeance {
  d: string
  ch: string
  mu: string
  rg: string
  /** Date de répétition (ISO YYYY-MM-DD), "" si pas de répétition */
  ent: string
  /** Heure de répétition (ex. "17:00"), si renseignée dans le planning */
  entTime?: string
  /** Salle de répétition (ex. "Grande Salle", "Salle Bonté"), si renseignée */
  entLieu?: string
  chants: string[]
}

export interface EddDataStructure {
  [key: string]: { label: string; classes: Record<string, string[][]> }
}
