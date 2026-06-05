"use client"

import { Fragment, useEffect, useState } from "react"
import { currentSundayStr, fdShort, getMois, MOIS, getCurrentEddPeriode, EDD_PERIODES, EDD_PERIODES_LABELS, EDD_CLASSES } from "@/lib/planning/utils"
import { EDD_FALLBACK } from "@/lib/planning/data"
import { fetchEDD } from "@/lib/planning/sheets"
import type { EddDataStructure, EddPeriode, EddClasse } from "@/lib/planning/utils"

const EDD_COLOR = "#3b6d11"

export default function EddPage() {
  const [eddData, setEddData] = useState<EddDataStructure>(EDD_FALLBACK)
  const [periode, setPeriode] = useState<EddPeriode>(getCurrentEddPeriode())
  const [classe, setClasse] = useState<EddClasse>("中班")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEDD().then(d => setEddData(d)).finally(() => setLoading(false))
  }, [])

  const sun = currentSundayStr()
  const rows = eddData[periode]?.classes?.[classe] ?? []

  let lastMonth = ""

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">EDD — École du Dimanche</h2>
        {loading && <span className="text-xs text-muted-foreground">Chargement…</span>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {EDD_PERIODES.map((p, i) => (
          <button
            key={p}
            onClick={() => setPeriode(p)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer ${
              p === periode ? "text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
            style={p === periode ? { background: EDD_COLOR, borderColor: EDD_COLOR } : {}}
          >
            {EDD_PERIODES_LABELS[i]}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {EDD_CLASSES.map(c => (
          <button
            key={c}
            onClick={() => setClasse(c)}
            className={`flex-1 py-1.5 px-3 rounded-lg border text-sm font-semibold text-center transition-all duration-150 cursor-pointer ${
              c === classe ? "border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
            style={c === classe ? { background: "#e8f5e8", borderColor: EDD_COLOR, color: EDD_COLOR } : {}}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-sm bg-primary/15 border border-primary/30" />
        Dimanche de la semaine courante
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <thead>
            <tr style={{ background: EDD_COLOR }} className="text-white">
              {["Date","Présidence","Suppléant","Piano","Cajon","Guitare"].map(c => (
                <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune donnée pour cette période</td></tr>
            )}
            {rows.map((row) => {
              const month = MOIS[getMois(row[0]) - 1]
              const showSep = month !== lastMonth
              if (showSep) lastMonth = month
              const isThis = row[0] === sun
              return (
                <Fragment key={row[0]}>
                  {showSep && (
                    <tr style={{ background: "#e8f5e8" }}>
                      <td colSpan={6} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: EDD_COLOR }}>
                        {month}
                      </td>
                    </tr>
                  )}
                  <tr className={`border-t border-border transition-colors ${isThis ? "bg-primary/10" : "hover:bg-secondary/50"}`}>
                    <td className="px-2 py-2 font-semibold whitespace-nowrap" style={{ color: EDD_COLOR }}>
                      <div>
                        {isThis ? (
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground mt-0.5">Cette semaine</span>
                      ) : fdShort(row[0])}
                      </div>
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
