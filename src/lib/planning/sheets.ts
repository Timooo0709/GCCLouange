import type { EddDataStructure, EddPeriode, CampusSeance } from "./utils"
import { EDD_PERIODES, getMois } from "./utils"

const SHEET_ID = "1khxUvrKSnrqtkkdCsmXiCjW3TjWcSV38otYOGMO5klU"
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`

function csvUrl(sheet: string) {
  return BASE_URL + encodeURIComponent(sheet)
}

function parseCSV(txt: string): string[][] {
  const rows: string[][] = []
  for (const line of txt.split("\n")) {
    if (!line.trim()) continue
    const row: string[] = []
    let cur = ""
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++ } else inQ = !inQ
      } else if (c === ',' && !inQ) {
        row.push(cur.trim()); cur = ""
      } else {
        cur += c
      }
    }
    row.push(cur.trim())
    rows.push(row)
  }
  return rows
}

/** Année pour une date JJ/MM sans année : celle (n-1, n, n+1) qui rend la
 *  date la plus proche d'aujourd'hui — les feuilles couvrent l'année en cours,
 *  ce choix reste juste au passage du nouvel an. */
export function inferYear(day: number, month: number): number {
  const now = Date.now()
  const year = new Date().getFullYear()
  return [year - 1, year, year + 1].reduce((a, b) =>
    Math.abs(new Date(b, month - 1, day).getTime() - now) <
    Math.abs(new Date(a, month - 1, day).getTime() - now) ? b : a
  )
}

export function parseDate(s: string): string | null {
  if (!s) return null
  s = s.replace(/"+/g, "").trim()
  const m1 = s.match(/Date\((\d+),(\d+),(\d+)\)/)
  if (m1) return `${m1[1]}-${String(+m1[2]+1).padStart(2,"0")}-${String(+m1[3]).padStart(2,"0")}`
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m2) return `${m2[3]}-${m2[2].padStart(2,"0")}-${m2[1].padStart(2,"0")}`
  const m3 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (m3) return `20${m3[3]}-${m3[2].padStart(2,"0")}-${m3[1].padStart(2,"0")}`
  // DD/MM sans année — format utilisé par la plupart des feuilles (Culte, Groupes, Déjeuner…)
  const m4 = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (m4) return `${inferYear(+m4[1], +m4[2])}-${m4[2].padStart(2,"0")}-${m4[1].padStart(2,"0")}`
  return null
}

async function fetchSheet(sheet: string): Promise<string[][]> {
  try {
    const res = await fetch(csvUrl(sheet), { cache: "no-store" })
    return parseCSV(await res.text())
  } catch {
    return []
  }
}

export async function fetchCulte(): Promise<string[][]> {
  const rows = await fetchSheet("Franco_Louange")
  return rows.flatMap(r => {
    const dt = parseDate(r[0])
    if (!dt) return []
    return [[dt, r[1]||"", r[2]||"", r[3]||"", r[4]||"", r[5]||"", r[6]||"", r[7]||"", r[8]||"", r[9]||"", r[10]||""]]
  })
}

export async function fetchDejeuner(): Promise<string[][]> {
  const rows = await fetchSheet("Franco_Table_PtD")
  const d: string[][] = []
  for (const r of rows) {
    const dL = parseDate(r[1])
    if (dL) {
      const eq = [r[2],r[3],r[4],r[5]].filter(v => v && v !== "---" && v !== "—" && !v.includes("Équipe") && v.trim())
      if (eq.length) d.push([dL, eq.join(", ")])
    }
    const dR = parseDate(r[7])
    if (dR) {
      const eq = [r[8],r[9],r[10],r[11]].filter(v => v && v !== "---" && v !== "—" && !v.includes("Équipe") && v.trim())
      if (eq.length) d.push([dR, eq.join(", ")])
    }
  }
  const seen = new Set<string>()
  return d.filter(x => { if (seen.has(x[0])) return false; seen.add(x[0]); return true })
    .sort((a, b) => a[0] < b[0] ? -1 : 1)
}

async function fetchMulti(sheets: string[], cols: number): Promise<string[][]> {
  const all: string[][] = []
  await Promise.all(sheets.map(sh => fetchSheet(sh).then(rows => {
    for (const r of rows) {
      const dt = parseDate(r[0])
      if (!dt) continue
      const row = [dt]
      for (let i = 1; i <= cols; i++) row.push(r[i]||"")
      all.push(row)
    }
  })))
  return all.sort((a, b) => a[0] < b[0] ? -1 : 1)
}

export async function fetchPaix(): Promise<string[][]> {
  return fetchMulti(["Paix_T1","Paix _T2","Paix _T3","Paix_T4"], 4)
}

export async function fetchFidelite(): Promise<string[][]> {
  return fetchMulti(["Fidélité_T1","Fidélité_T2","Fidélité_T3","Fidélité_T4"], 4)
}

export async function fetchFideliteMusic(): Promise<string[][]> {
  const rows = await fetchSheet("Fidélité_Musicien")
  return rows.flatMap(r => {
    const dt = parseDate(r[1])
    if (!dt) return []
    return [[dt, r[2]||"", r[3]||"", r[4]||"", r[5]||""]]
  })
}

export async function fetchBonte(): Promise<string[][]> {
  return fetchMulti(["Bonté_T1","Bonté _T2","Bonté _T3","Bonté_T4"], 4)
}

export async function fetchEDD(): Promise<EddDataStructure> {
  const rows = await fetchSheet("EDD")
  const res: EddDataStructure = {}
  for (const k of EDD_PERIODES) {
    res[k] = { label: k, classes: { "中班": [], "大班": [], "高班": [] } }
  }
  let cls: string | null = null
  for (const r of rows) {
    if (r[0] === "DATE") continue
    const dt = parseDate(r[0])
    if (!dt) continue
    if (r[7] && ["中班","大班","高班"].includes(r[7].trim())) cls = r[7].trim()
    if (!cls) continue
    const m = getMois(dt)
    const pk: EddPeriode = EDD_PERIODES[m<=2?0:m<=4?1:m<=6?2:m<=8?3:m<=10?4:5]
    res[pk].classes[cls].push([dt, r[1]||"", r[2]||"", r[3]||"", r[4]||"", r[5]||""])
  }
  return res
}

export async function fetchCampus(): Promise<{ louange: CampusSeance[]; entrainement: CampusSeance[] }> {
  const rows = await fetchSheet("Campus_Louange")
  const louange: CampusSeance[] = []
  const entrainement: CampusSeance[] = []
  for (const r of rows) {
    if (!r[0] || !r[1]) continue
    if (r[1] !== "Matin" && r[1] !== "Soir") continue
    const parts = r[0].replace(/"+/g,"").split("/")
    const label = (parts[0]||"").replace(/^0/,"") + "/" + parts[1]
    const ch = [r[2],r[3],r[4]].filter(v => v?.trim()).join(", ")
    const mu = [r[5]?"Piano: "+r[5]:"", r[6]?"Guitare: "+r[6]:"", r[7]?"Batterie: "+r[7]:""].filter(Boolean).join(", ")
    const rg = [r[8]?"Sono: "+r[8]:"", r[9]?"PPT: "+r[9]:""].filter(Boolean).join(", ")
    // Cellule répétition : "JJ/MM/AAAA[ HH:MM][ Salle…]" → date + heure + lieu
    const rawEnt = (r[14]||"").trim()
    let ent = "", entTime = "", entLieu = ""
    if (rawEnt) {
      const toks = rawEnt.split(/\s+/)
      ent = parseDate(toks[0]) || ""
      const rest = toks.slice(1)
      if (rest[0] && /^\d{1,2}[:hH]\d{2}$/.test(rest[0])) {
        entTime = rest.shift()!.replace(/[hH]/, ":")
      }
      entLieu = rest.join(" ").trim()
    }
    const obj: CampusSeance = { d: `${label} ${r[1]}`, ch, mu, rg, ent, entTime, entLieu, chants: [r[10]||"",r[11]||"",r[12]||"",r[13]||""] }
    louange.push(obj)
    if (ent) entrainement.push(obj)
  }
  louange.sort((a,b) => a.d < b.d ? -1 : 1)
  entrainement.sort((a,b) => a.d < b.d ? -1 : 1)
  return { louange, entrainement }
}
