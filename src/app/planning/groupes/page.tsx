"use client"

import { Fragment, useEffect, useState } from "react"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { currentSundayStr, fdShort, getMois, MOIS, filterByTri, getCurrentTri } from "@/lib/planning/utils"
import { PAIX_FALLBACK, FIDELITE_FALLBACK, FIDELITE_MUSIC_FALLBACK, BONTE_FALLBACK } from "@/lib/planning/data"
import { fetchPaix, fetchFidelite, fetchFideliteMusic, fetchBonte } from "@/lib/planning/sheets"

type Groupe = "paix" | "fidelite" | "bonte"
type FidSub = "groupe" | "musiciens"

const GRP_COLORS: Record<Groupe, string> = {
  paix:     "#6b4a8e",
  fidelite: "#a03030",
  bonte:    "#8b4a2e",
}

const GRP_INACTIVE = "bg-card text-muted-foreground border-border hover:text-foreground"

export default function GroupesPage() {
  const [paix, setPaix] = useState(PAIX_FALLBACK)
  const [fid, setFid] = useState(FIDELITE_FALLBACK)
  const [fidM, setFidM] = useState(FIDELITE_MUSIC_FALLBACK)
  const [bonte, setBonte] = useState(BONTE_FALLBACK)
  const [loading, setLoading] = useState(true)
  const [grp, setGrp] = useState<Groupe>("paix")
  const [fidSub, setFidSub] = useState<FidSub>("groupe")
  const [tri, setTri] = useState(getCurrentTri())

  useEffect(() => {
    Promise.all([
      fetchPaix().then(d => { if (d.length) setPaix(d) }),
      fetchFidelite().then(d => { if (d.length) setFid(d) }),
      fetchFideliteMusic().then(d => { if (d.length) setFidM(d) }),
      fetchBonte().then(d => { if (d.length) setBonte(d) }),
    ]).finally(() => setLoading(false))
  }, [])

  const sun = currentSundayStr()
  const color = GRP_COLORS[grp]

  const data = (() => {
    if (grp === "fidelite" && fidSub === "musiciens") return filterByTri(fidM, tri)
    if (grp === "paix") return filterByTri(paix, tri)
    if (grp === "fidelite") return filterByTri(fid, tri)
    return filterByTri(bonte, tri)
  })()

  const cols = (() => {
    if (grp === "fidelite" && fidSub === "musiciens") return ["Date","Présidence","Piano","Guitare","Batterie"]
    if (grp === "fidelite") return ["Date","Présidence","Orateur","Thème","Pianiste"]
    return ["Date","Présidence","Musiciens","Orateur","Thème"]
  })()

  let lastMonth = ""

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Groupes</h2>
        {loading && <span className="text-xs text-muted-foreground">Chargement…</span>}
      </div>

      <div className="flex gap-2">
        {(["paix","fidelite","bonte"] as Groupe[]).map(g => (
          <button
            key={g}
            onClick={() => { setGrp(g); if (g !== "fidelite") setFidSub("groupe") }}
            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all duration-150 cursor-pointer ${grp === g ? "text-white border-transparent" : GRP_INACTIVE}`}
            style={grp === g ? { background: GRP_COLORS[g], borderColor: GRP_COLORS[g] } : undefined}
          >
            {g === "fidelite" ? "Fidélité" : g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {grp === "fidelite" && (
        <div className="flex gap-2">
          {(["groupe","musiciens"] as FidSub[]).map(sub => (
            <button
              key={sub}
              onClick={() => setFidSub(sub)}
              className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer ${
                fidSub === sub
                  ? "border-transparent"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
              style={fidSub === sub ? { background: `${color}15`, borderColor: color, color } : undefined}
            >
              {sub === "groupe" ? "Planning groupe" : "Planning musiciens 🎵"}
            </button>
          ))}
        </div>
      )}

      <FilterButtons options={["T1","T2","T3","T4"]} active={tri} onChange={setTri} color={color} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-sm" style={{ background: `${color}26`, border: `1px solid ${color}4d` }} />
        Dimanche de la semaine courante
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <thead>
            <tr style={{ background: color }} className="text-white">
              {cols.map(c => (
                <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune donnée</td></tr>
            )}
            {data.map((row) => {
              const month = MOIS[getMois(row[0]) - 1]
              const showSep = month !== lastMonth
              if (showSep) lastMonth = month
              const isThis = row[0] === sun

              return (
                <Fragment key={row[0]}>
                  {showSep && (
                    <tr style={{ background: `${color}15` }}>
                      <td colSpan={cols.length} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                        {month}
                      </td>
                    </tr>
                  )}
                  <tr
                    className={`border-t border-border transition-colors ${!isThis ? "hover:bg-secondary/50" : ""}`}
                    style={isThis ? { background: `${color}1a` } : undefined}
                  >
                    <td className="w-[100px] px-3 py-2 font-semibold whitespace-nowrap" style={{ color }}>
                      <div>{isThis ? (
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded text-white mt-0.5" style={{ background: color }}>Cette semaine</span>
                      ) : fdShort(row[0])}</div>
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
