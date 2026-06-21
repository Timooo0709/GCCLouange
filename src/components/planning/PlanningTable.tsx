"use client"

import { Fragment, useEffect, useState, type ReactNode } from "react"
import { User, X } from "lucide-react"
import { currentSundayStr, fdShort, getAnnee, getMois, MOIS } from "@/lib/planning/utils"

export interface PlanningTableProps {
  /** cols[0] est la colonne date */
  cols: string[]
  /** row[0] est la date au format YYYY-MM-DD */
  rows: string[][]
  color: string
  /** Badge optionnel à côté de la date (ex. Sainte Cène) */
  dateBadge?: (row: string[], allRows: string[][]) => ReactNode
  minWidth?: number
  /** Regroupement (séparateurs desktop + puces mobile). Défaut : par mois */
  groupBy?: "month" | "year"
}

/**
 * Tableau de planning : table classique sur desktop, cartes par date sur
 * mobile. Champ « mon prénom » (mémorisé sur l'appareil) qui surligne les
 * cellules correspondantes, avec filtre « Mes dates ».
 */
export function PlanningTable({ cols, rows, color, dateBadge, minWidth = 480, groupBy = "month" }: PlanningTableProps) {
  const sun = currentSundayStr()
  const [name, setName] = useState("")
  const [onlyMine, setOnlyMine] = useState(false)
  const [mobileGroup, setMobileGroup] = useState<number | null>(null)

  // Clé de regroupement (mois ou année) + libellé associé
  const groupKey = (dateStr: string) => (groupBy === "year" ? getAnnee(dateStr) : getMois(dateStr))
  const groupLabel = (key: number) => (groupBy === "year" ? String(key) : MOIS[key - 1])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("planningName")
      if (saved) setName(saved)
    } catch { /* stockage indisponible */ }
  }, [])

  function updateName(v: string) {
    setName(v)
    try { localStorage.setItem("planningName", v) } catch { /* ignore */ }
  }

  const needle = name.trim().toLowerCase()
  const hasName = needle.length >= 2
  const matchCell = (cell: string) => hasName && cell.toLowerCase().includes(needle)
  const matchRow = (row: string[]) => row.slice(1).some(matchCell)

  const displayed = onlyMine && hasName ? rows.filter(matchRow) : rows

  // Séparateurs (table desktop) : par mois ou par année
  const withSep: { row: string[]; sep: string | null }[] = []
  let lk: number | null = null
  for (const row of displayed) {
    const key = groupKey(row[0])
    withSep.push({ row, sep: key !== lk ? groupLabel(key) : null })
    lk = key
  }

  // ── Mobile : affichage par groupe (puces, comme les trimestres) ──
  const groupsInRows = [...new Set(rows.map((r) => groupKey(r[0])))]
  const currentKey = groupBy === "year" ? new Date().getFullYear() : new Date().getMonth() + 1
  const defaultGroup = groupsInRows.includes(currentKey) ? currentKey : groupsInRows[0]
  const activeGroup = mobileGroup !== null && groupsInRows.includes(mobileGroup) ? mobileGroup : defaultGroup
  const mobileRows = displayed.filter((r) => groupKey(r[0]) === activeGroup)

  return (
    <div className="space-y-3">
      {/* ── Mon prénom + filtre Mes dates ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-[220px]">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={name}
            onChange={(e) => updateName(e.target.value)}
            placeholder="Mon prénom…"
            className="w-full h-8 pl-8 pr-7 rounded-lg border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {name && (
            <button
              onClick={() => { updateName(""); setOnlyMine(false) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {hasName && (
          <button
            onClick={() => setOnlyMine((v) => !v)}
            className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer ${
              onlyMine ? "text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
            style={onlyMine ? { background: color, borderColor: color } : undefined}
          >
            Mes dates
          </button>
        )}
      </div>

      {/* ── Table (desktop / tablette) ── */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse" style={{ minWidth }}>
          <thead>
            <tr style={{ background: color }} className="text-white">
              {cols.map((c) => (
                <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 && (
              <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune donnée</td></tr>
            )}
            {withSep.map(({ row, sep }) => {
              const isThis = row[0] === sun
              const mine = matchRow(row)
              return (
                <Fragment key={row[0]}>
                  {sep && (
                    <tr style={{ background: `${color}15` }}>
                      <td colSpan={cols.length} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                        {sep}
                      </td>
                    </tr>
                  )}
                  <tr
                    className={`border-t border-border transition-colors ${!isThis ? "hover:bg-secondary/50" : ""}`}
                    style={{
                      background: isThis ? `${color}1a` : mine ? `${color}0d` : undefined,
                      boxShadow: mine ? `inset 3px 0 0 ${color}` : undefined,
                    }}
                  >
                    <td className="w-[100px] px-3 py-2 font-semibold whitespace-nowrap" style={{ color }}>
                      <div>{isThis ? (
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded text-white mt-0.5" style={{ background: color }}>Cette semaine</span>
                      ) : fdShort(row[0])}</div>
                      {dateBadge?.(row, rows)}
                    </td>
                    {row.slice(1).map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-3 py-2 ${matchCell(cell) ? "font-bold" : "text-foreground"}`}
                        style={matchCell(cell) ? { color } : undefined}
                      >
                        {cell || "—"}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Cartes par date (téléphone) — un mois à la fois ── */}
      <div className="sm:hidden space-y-2.5">
        {groupsInRows.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {groupsInRows.map((g) => (
              <button
                key={g}
                onClick={() => setMobileGroup(g)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                  g === activeGroup ? "text-white border-transparent" : "bg-card border-border text-muted-foreground"
                }`}
                style={g === activeGroup ? { background: color, borderColor: color } : undefined}
              >
                {groupLabel(g)}
              </button>
            ))}
          </div>
        )}
        {mobileRows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
            Aucune donnée
          </p>
        )}
        {mobileRows.map((row) => {
          const isThis = row[0] === sun
          const mine = matchRow(row)
          return (
            <Fragment key={row[0]}>
              <div
                className="rounded-xl border border-border bg-card overflow-hidden"
                style={{
                  borderColor: isThis ? color : undefined,
                  boxShadow: mine ? `inset 3px 0 0 ${color}` : undefined,
                }}
              >
                <div
                  className="px-3.5 py-2 flex items-center gap-2 flex-wrap"
                  style={{ background: isThis ? `${color}1a` : `${color}0d` }}
                >
                  <span className="text-sm font-bold" style={{ color }}>{fdShort(row[0])}</span>
                  {isThis && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: color }}>
                      Cette semaine
                    </span>
                  )}
                  {dateBadge?.(row, rows)}
                </div>
                <div className="px-3.5 py-2.5 space-y-1">
                  {row.slice(1).map((cell, ci) =>
                    cell ? (
                      <div key={ci} className="flex items-baseline gap-2 text-[13px]">
                        <span className="w-24 shrink-0 text-[11px] text-muted-foreground">{cols[ci + 1]}</span>
                        <span
                          className={`min-w-0 ${matchCell(cell) ? "font-bold" : "text-foreground"}`}
                          style={matchCell(cell) ? { color } : undefined}
                        >
                          {cell}
                        </span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
