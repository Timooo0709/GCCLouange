"use client"

import { Fragment, useEffect, useState } from "react"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { currentSundayStr, fdShort, getMois, MOIS, filterByTri, getCurrentTri } from "@/lib/planning/utils"
import { DEJEUNER_FALLBACK } from "@/lib/planning/data"
import { fetchDejeuner } from "@/lib/planning/sheets"

const COLOR = "#c87941"

export default function TablePage() {
  const [rows, setRows] = useState(DEJEUNER_FALLBACK)
  const [tri, setTri] = useState(getCurrentTri())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDejeuner().then(d => { if (d.length) setRows(d) }).finally(() => setLoading(false))
  }, [])

  const sun = currentSundayStr()
  const filtered = filterByTri(rows, tri)

  let lastMonth = ""

  return (
    <div className="max-w-lg space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Prépa. Table du Seigneur</h2>
        {loading && <span className="text-xs text-muted-foreground">Chargement…</span>}
      </div>

      <FilterButtons options={["T1","T2","T3","T4"]} active={tri} onChange={setTri} color={COLOR} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-sm" style={{ background: `${COLOR}26`, border: `1px solid ${COLOR}4d` }} />
        Dimanche de la semaine courante
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune donnée</td></tr>
            )}
            {filtered.map((row) => {
              const month = MOIS[getMois(row[0]) - 1]
              const showSep = month !== lastMonth
              if (showSep) lastMonth = month
              const isThis = row[0] === sun

              return (
                <Fragment key={row[0]}>
                  {showSep && (
                    <tr style={{ background: `${COLOR}15` }}>
                      <td colSpan={2} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: COLOR }}>
                        {month}
                      </td>
                    </tr>
                  )}
                  <tr
                    className={`border-t border-border transition-colors ${!isThis ? "hover:bg-secondary/50" : ""}`}
                    style={isThis ? { background: `${COLOR}1a` } : undefined}
                  >
                    <td className="px-3 py-2.5 font-semibold w-16 align-top pt-3" style={{ color: COLOR }}>
                      {isThis ? (
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded text-white mt-0.5" style={{ background: COLOR }}>Cette semaine</span>
                      ) : fdShort(row[0])}
                    </td>
                    <td className="px-3 py-2.5 text-foreground leading-relaxed">{row[1] || "—"}</td>
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
