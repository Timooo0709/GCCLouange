"use client"

import { useEffect, useState } from "react"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { PlanningTable } from "@/components/planning/PlanningTable"
import { filterByTri, getCurrentTri } from "@/lib/planning/utils"
import { PAIX_FALLBACK, FIDELITE_FALLBACK, FIDELITE_MUSIC_FALLBACK, BONTE_FALLBACK } from "@/lib/planning/data"
import { fetchPaix, fetchFidelite, fetchFideliteMusic, fetchBonte } from "@/lib/planning/sheets"
import { useProfile } from "@/lib/firebase/users"
import { isAdminUser } from "@/lib/access"
import {
  PUBLISHABLE_PLANNINGS,
  canPublishPlanning,
  getPublishedQuarters,
  triVisibilities,
  TRI_ORDER,
} from "@/lib/planning/releases"

type Groupe = "paix" | "fidelite" | "bonte"
type FidSub = "groupe" | "musiciens"

const GRP_COLORS: Record<Groupe, string> = {
  paix:     "#6b4a8e",
  fidelite: "#a03030",
  bonte:    "#8b4a2e",
}

const GRP_INACTIVE = "bg-card text-muted-foreground border-border hover:text-foreground"

export default function GroupesPage() {
  const { user, profile } = useProfile()
  const [paix, setPaix] = useState(PAIX_FALLBACK)
  const [fid, setFid] = useState(FIDELITE_FALLBACK)
  const [fidM, setFidM] = useState(FIDELITE_MUSIC_FALLBACK)
  const [bonte, setBonte] = useState(BONTE_FALLBACK)
  const [loading, setLoading] = useState(true)
  const [grp, setGrp] = useState<Groupe>("paix")
  const [fidSub, setFidSub] = useState<FidSub>("groupe")
  const [tri, setTri] = useState(getCurrentTri())
  const [pubByGrp, setPubByGrp] = useState<Record<string, string[]>>({})

  useEffect(() => {
    Promise.all([
      fetchPaix().then(d => { if (d.length) setPaix(d) }),
      fetchFidelite().then(d => { if (d.length) setFid(d) }),
      fetchFideliteMusic().then(d => { if (d.length) setFidM(d) }),
      fetchBonte().then(d => { if (d.length) setBonte(d) }),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const year = new Date().getFullYear()
    Promise.all(
      (["paix", "fidelite", "bonte"] as Groupe[]).map(k =>
        getPublishedQuarters(k, year).then(q => [k, q] as const)
      )
    ).then(entries => setPubByGrp(Object.fromEntries(entries)))
  }, [])

  const color = GRP_COLORS[grp]

  // Trimestres futurs non publiés du groupe actif : masqués aux membres, marqués aux publieurs.
  const planning = PUBLISHABLE_PLANNINGS.find(p => p.key === grp)!
  const canPublish = canPublishPlanning(planning, isAdminUser(user), profile?.notify ?? [])
  const vis = triVisibilities(TRI_ORDER, pubByGrp[grp] ?? [], getCurrentTri(), canPublish)
  const visibleTris = vis.filter(v => v.visible).map(v => v.tri)
  const unpublishedTris = vis.filter(v => v.unpublished).map(v => v.tri)
  const effTri = visibleTris.includes(tri) ? tri : getCurrentTri()

  const data = (() => {
    if (grp === "fidelite" && fidSub === "musiciens") return filterByTri(fidM, effTri)
    if (grp === "paix") return filterByTri(paix, effTri)
    if (grp === "fidelite") return filterByTri(fid, effTri)
    return filterByTri(bonte, effTri)
  })()

  const cols = (() => {
    if (grp === "fidelite" && fidSub === "musiciens") return ["Date","Présidence","Piano","Guitare","Batterie"]
    if (grp === "fidelite") return ["Date","Présidence","Orateur","Thème","Pianiste"]
    return ["Date","Présidence","Musiciens","Orateur","Thème"]
  })()

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

      <FilterButtons options={visibleTris} active={effTri} onChange={setTri} color={color} unpublished={unpublishedTris} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-sm" style={{ background: `${color}26`, border: `1px solid ${color}4d` }} />
        Dimanche de la semaine courante
      </div>

      <PlanningTable cols={cols} rows={data} color={color} minWidth={480} />
    </div>
  )
}
