"use client"

import { Fragment, useEffect, useState } from "react"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { currentSundayStr, fdShort, getMois, MOIS, filterByTri, getCurrentTri, isFirstSundayOfMonth } from "@/lib/planning/utils"
import { CULTE_FALLBACK } from "@/lib/planning/data"
import { fetchCulte } from "@/lib/planning/sheets"

const COLS = ["Date","Présidence","Choriste 1","Choriste 2","Piano","Guitare","Batterie","Sono","PPT","Orateur","Trad."]

export default function CultePage() {
  const [rows, setRows] = useState(CULTE_FALLBACK)
  const [tri, setTri] = useState(getCurrentTri())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCulte().then(d => { if (d.length) setRows(d) }).finally(() => setLoading(false))
  }, [])

  const sun = currentSundayStr()
  const filtered = filterByTri(rows, tri)

  let lastMonth = ""

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Culte Franco</h2>
        {loading && <span className="text-xs text-muted-foreground">Chargement…</span>}
      </div>

      <FilterButtons options={["T1","T2","T3","T4"]} active={tri} onChange={setTri} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-sm bg-primary/15 border border-primary/30" />
        Dimanche de la semaine courante
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse min-w-[680px]">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              {COLS.map(c => (
                <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={COLS.length} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune donnée</td></tr>
            )}
            {filtered.map((row, i) => {
              const month = MOIS[getMois(row[0]) - 1]
              const showSep = month !== lastMonth
              if (showSep) lastMonth = month
              const isThis = row[0] === sun
              const isSC = isFirstSundayOfMonth(row[0], filtered)

              return (
                <Fragment key={row[0]}>
                  {showSep && (
                    <tr className="bg-secondary">
                      <td colSpan={COLS.length} className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {month}
                      </td>
                    </tr>
                  )}
                  <tr className={`border-t border-border transition-colors ${isThis ? "bg-primary/10" : "hover:bg-secondary/50"}`}>
                    <td className="w-[100px] px-3 py-2 font-semibold text-primary whitespace-nowrap">
                      <div>{isThis ? (
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground mt-0.5">Cette semaine</span>
                      ) : fdShort(row[0])}</div>
                      {isSC && <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 mt-0.5">Sainte Cène</span>}
                    </td>
                    {row.slice(1).map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-foreground">{cell || "—"}</td>
                    ))}
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
